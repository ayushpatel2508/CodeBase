import logging
import os

import tree_sitter
import tree_sitter_cpp
import tree_sitter_go
import tree_sitter_java
import tree_sitter_javascript
import tree_sitter_python
import tree_sitter_rust
import tree_sitter_typescript

logger = logging.getLogger(__name__)

LANGUAGES = {
    ".py": tree_sitter.Language(tree_sitter_python.language()),
    ".js": tree_sitter.Language(tree_sitter_javascript.language()),
    ".jsx": tree_sitter.Language(tree_sitter_javascript.language()),
    ".ts": tree_sitter.Language(tree_sitter_typescript.language_typescript()),
    ".tsx": tree_sitter.Language(tree_sitter_typescript.language_tsx()),
    ".java": tree_sitter.Language(tree_sitter_java.language()),
    ".go": tree_sitter.Language(tree_sitter_go.language()),
    ".cpp": tree_sitter.Language(tree_sitter_cpp.language()),
    ".rs": tree_sitter.Language(tree_sitter_rust.language()),
}

# Define queries to find functions and classes in different languages
QUERIES = {
    ".py": "(function_definition) @function (class_definition) @class",
    ".js": "(function_declaration) @function (method_definition) @function (class_declaration) @class",
    ".jsx": "(function_declaration) @function (method_definition) @function (class_declaration) @class",
    ".ts": "(function_declaration) @function (method_definition) @function (class_declaration) @class",
    ".tsx": "(function_declaration) @function (method_definition) @function (class_declaration) @class",
    ".java": "(method_declaration) @function (class_declaration) @class",
    ".go": "(function_declaration) @function (method_declaration) @function",
    ".cpp": "(function_definition) @function (class_specifier) @class",
    ".rs": "(function_item) @function (struct_item) @class (impl_item) @class",
}

COMPILED_QUERIES = {
    ext: LANGUAGES[ext].query(query_str) 
    for ext, query_str in QUERIES.items()
}

def chunk_sliding_window(content: str, filepath: str, line_limit=60, overlap=10) -> list[dict]:
    """Fallback chunker that splits text into sliding windows."""
    lines = content.split('\n')
    chunks = []
    start = 0
    filename = os.path.basename(filepath)
    while start < len(lines):
        end = min(start + line_limit, len(lines))
        chunk_lines = lines[start:end]
        # Ignore empty chunks
        chunk_text = "\n".join(chunk_lines).strip()
        if chunk_text:
            full_text = f"File: {filepath}\n\n{chunk_text}"
            chunks.append({
                "name": f"{filename}-lines-{start+1}-{end}",
                "content": full_text,
                "line_start": start + 1,
                "line_end": end,
                "chunk_type": "lines",
                "filepath": filepath
            })
        if end == len(lines):
            break
        start += (line_limit - overlap)
    return chunks

def chunk_file(filepath: str, repo_path: str = "") -> list[dict]:
    """
    Parses a file semantically using Tree-sitter.
    Returns a list of dictionaries representing chunks.
    """
    ext = os.path.splitext(filepath)[1].lower()
    
    try:
        with open(filepath, "rb") as f:
            content_bytes = f.read()
        content_str = content_bytes.decode('utf-8')
    except Exception as e:
        logger.warning(f"Failed to read/decode {filepath}: {e}")
        return []

    if ext not in LANGUAGES or ext not in COMPILED_QUERIES:
        return chunk_sliding_window(content_str, filepath)

    try:
        parser = tree_sitter.Parser(LANGUAGES[ext])
        tree = parser.parse(content_bytes)
        query = COMPILED_QUERIES[ext]
        
        captures = query.captures(tree.root_node)
    except Exception as e:
        logger.error(f"Tree-sitter parsing failed for {filepath}: {e}")
        return chunk_sliding_window(content_str, filepath)

    chunks = []
    # captures is a dict: {'function': [Node, Node], 'class': [Node]}
    if isinstance(captures, dict):
        # 1. Find the minimum start byte to extract the "File Header" (imports, globals)
        min_start_byte = len(content_bytes)
        has_nodes = False
        for nodes in captures.values():
            for node in nodes:
                has_nodes = True
                if node.start_byte < min_start_byte:
                    min_start_byte = node.start_byte
                    
        file_header = ""
        if has_nodes and min_start_byte > 0:
            file_header = content_bytes[0:min_start_byte].decode('utf-8', errors='replace').strip()
            if file_header:
                file_header += "\n\n"

        # 2. Extract chunks and prepend the file header
        for chunk_type, nodes in captures.items():
            for node in nodes:
                start_line = node.start_point[0] + 1
                end_line = node.end_point[0] + 1
                node_text = content_bytes[node.start_byte:node.end_byte].decode('utf-8', errors='replace').strip()
                
                chunk_text = f"File: {filepath}\n\n{file_header}{node_text}"
                
                name = f"{chunk_type}-{start_line}-{end_line}"
                
                if node_text:
                    chunks.append({
                        "name": name,
                        "content": chunk_text,
                        "line_start": start_line,
                        "line_end": end_line,
                        "chunk_type": chunk_type,
                        "filepath": filepath
                    })
    
    if not chunks:
        return chunk_sliding_window(content_str, filepath)
        
    return chunks
