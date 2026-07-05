import os
import re
import shutil
import subprocess
import tempfile

# Validates basic github repo url structure: https://github.com/owner/repo
GITHUB_URL_PATTERN = re.compile(r"^https?://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)(\.git)?/?$")

def clone_repo(github_url: str, job_id: str) -> str:
    """
    Clones a GitHub repository into a temporary directory for processing.
    Validates the URL to prevent command injection or pulling from arbitrary domains.
    Returns the absolute path to the cloned repository.
    """
    if not GITHUB_URL_PATTERN.match(github_url):
        raise ValueError("Invalid GitHub URL format. Must be of the form 'https://github.com/owner/repo'.")

    temp_storage = os.getenv("REPO_STORAGE_PATH", tempfile.gettempdir())
    base_dir = os.path.join(temp_storage, "repos")
    os.makedirs(base_dir, exist_ok=True)
    repo_path = os.path.join(base_dir, job_id)
    
    # Do cleanup before creating new directory to prevent disk fillup
    if os.path.exists(repo_path):
        shutil.rmtree(repo_path, ignore_errors=True)
    
    try:
        subprocess.run(
            ["git", "clone", "--depth", "1", github_url, repo_path],
            check=True,
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"Failed to clone repository: Timeout exceeded (2 minutes).")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Failed to clone repository: {e.stderr}")
        
    return repo_path

def get_commit_hash(repo_path: str) -> str:
    """Returns the HEAD commit hash of the cloned repository."""
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo_path, capture_output=True, text=True, check=True
    )
    return result.stdout.strip()

def get_local_git_diff(repo_path: str, old_hash: str) -> dict[str, list[str]]:
    """
    Fetches the old commit and returns a dictionary with lists of 'added', 'modified', and 'deleted' files.
    """
    try:
        subprocess.run(["git", "fetch", "origin", old_hash, "--depth", "1"], cwd=repo_path, capture_output=True, text=True)
    except subprocess.CalledProcessError:
        pass # Ignore fetch errors, just try diffing (might already have it if not shallow clone)
        
    result = subprocess.run(
        ["git", "diff", "--name-status", old_hash, "HEAD"], cwd=repo_path, capture_output=True, text=True, check=True
    )
    
    diff_data = {"added": [], "modified": [], "deleted": []}
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue
        parts = line.split('\t')
        status = parts[0].upper()
        # For renames (R), format is R100\told_path\tnew_path
        if status.startswith("R"):
            if len(parts) >= 3:
                diff_data["deleted"].append(parts[1])
                diff_data["added"].append(parts[2])
            continue
            
        if len(parts) < 2:
            continue
            
        file_path = parts[1]
        if status.startswith("A"):
            diff_data["added"].append(file_path)
        elif status.startswith("M"):
            diff_data["modified"].append(file_path)
        elif status.startswith("D"):
            diff_data["deleted"].append(file_path)
            
    return diff_data

def get_filtered_files(repo_path: str, specific_files: list[str] = None) -> tuple[list[str], list[str]]:
    """
    Recursively walks the repository directory (or filters a specific list) and returns:
    1. A list of absolute file paths for ingestion.
    2. A list of relative paths representing the directory tree structure, including empty/ignored folders.
    """
    EXCLUDE_DIRS = {".git", "node_modules", "__pycache__", "dist", "build", ".next", "venv", ".venv", "env"}
    INCLUDE_EXTENSIONS = {
        ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".cpp", ".rs", ".sql", ".prisma", # Languages
        ".yml", ".yaml", ".json", ".toml", # Configurations & CI/CD
        ".md", ".sh", ".html", ".css", ".scss" # Docs, scripts, markup
    }
    INCLUDE_FILES = {"dockerfile", "makefile"}
    
    filtered_files = []
    tree_paths = []
    
    def is_valid_file(file_name: str, abs_path: str) -> bool:
        name_lower = file_name.lower()
        if ".min." in name_lower or "-min." in name_lower or "bundle" in name_lower:
            return False
        if name_lower in {"package-lock.json", "yarn.lock", "pnpm-lock.yaml"}:
            return False
        try:
            if os.path.getsize(abs_path) > 500 * 1024:
                return False
        except OSError:
            return False
        return True

    # If specific_files is provided (for incremental sync), we only process those files instead of os.walk
    if specific_files is not None:
        for file_rel_path in specific_files:
            abs_path = os.path.join(repo_path, file_rel_path)
            if not os.path.exists(abs_path):
                continue
                
            file_name = os.path.basename(file_rel_path)
            ext = os.path.splitext(file_name)[1].lower()
            if (ext in INCLUDE_EXTENSIONS or file_name.lower() in INCLUDE_FILES) and is_valid_file(file_name, abs_path):
                filtered_files.append(abs_path)
        # We don't reconstruct the full tree for incremental sync
        return filtered_files, []
    
    for root, dirs, files in os.walk(repo_path):
        rel_root = os.path.relpath(root, repo_path).replace("\\", "/")
        if rel_root == ".":
            rel_root = ""
            
        # Capture excluded directories in the tree structure
        for d in list(dirs):
            if d in EXCLUDE_DIRS:
                dirs.remove(d)  # Prevent os.walk from traversing into them
                tree_path = f"{rel_root}/{d}/" if rel_root else f"{d}/"
                tree_paths.append(tree_path)
                
        # Capture valid files in both arrays
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            abs_path = os.path.join(root, file)
            
            if (ext in INCLUDE_EXTENSIONS or file.lower() in INCLUDE_FILES) and is_valid_file(file, abs_path):
                filtered_files.append(abs_path)
                
                tree_path = f"{rel_root}/{file}" if rel_root else file
                tree_paths.append(tree_path)
                
    return filtered_files, tree_paths

def cleanup_repo(repo_path: str):
    """
    Deletes the repository directory from temporary storage to free up disk space.
    """
    if os.path.exists(repo_path):
        import stat
        def remove_readonly(func, path, excinfo):
            try:
                os.chmod(path, stat.S_IWRITE)
                func(path)
            except Exception:
                pass
                
        try:
            shutil.rmtree(repo_path, onerror=remove_readonly)
        except Exception:
            # Fallback if shutil still fails due to strict Windows locks
            if os.name == 'nt':
                subprocess.run(["cmd", "/c", "rmdir", "/s", "/q", repo_path], capture_output=True)
            else:
                subprocess.run(["rm", "-rf", repo_path], capture_output=True)
