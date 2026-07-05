"use client";

import { useState, useEffect } from "react";
import { IconX, IconEye, IconEyeOff, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function ApiKeyModal({ isOpen, onClose, session, onSuccess }: { isOpen: boolean; onClose: () => void; session: any; onSuccess?: () => void }) {
  const [chatName, setChatName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlStatus, setUrlStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [urlError, setUrlError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!githubUrl) {
      setUrlStatus("idle");
      setUrlError("");
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidatingUrl(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/repo/verify?github_url=${encodeURIComponent(githubUrl)}`);
        const data = await res.json();
        if (data.valid) {
          setUrlStatus("valid");
          setUrlError("");
        } else {
          setUrlStatus("invalid");
          setUrlError(data.error || "Invalid repository URL");
        }
      } catch (err) {
        setUrlStatus("invalid");
        setUrlError("Failed to check URL");
      } finally {
        setIsValidatingUrl(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [githubUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (githubUrl) {
        const repoRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/repo/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ github_url: githubUrl, chat_name: chatName || undefined }),
        });

        if (!repoRes.ok) throw new Error("Failed to submit repository");

        const data = await repoRes.json();

        // Clear form data on success
        setChatName("");
        setGithubUrl("");
        setUrlStatus("idle");
        setUrlError("");

        onClose();
        if (onSuccess) onSuccess();
        router.push(`/chat/${data.repo_id}`);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">Start New Chat</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors bg-neutral-100 rounded-full cursor-pointer">
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-neutral-700">Chat Name</label>
            <input
              type="text"
              required
              placeholder="e.g. NextJS Codebase"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              className="w-full bg-[#fafafa] border border-neutral-200 text-neutral-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all placeholder:text-neutral-400 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-neutral-700">GitHub Repository URL</label>
            <input
              type="text"
              required
              placeholder="https://github.com/user/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full bg-[#fafafa] border border-neutral-200 text-neutral-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all placeholder:text-neutral-400 font-medium"
            />
            {githubUrl && (
              <div className="text-xs font-medium px-1 flex items-center gap-1.5 mt-1">
                {isValidatingUrl ? (
                  <>
                    <div className="w-3 h-3 border border-neutral-400 border-t-neutral-800 rounded-full animate-spin" />
                    <span className="text-neutral-500">Checking URL...</span>
                  </>
                ) : urlStatus === "valid" ? (
                  <span className="text-emerald-600 flex items-center gap-1"><IconCheck size={14} /> Repository verified</span>
                ) : urlStatus === "invalid" ? (
                  <span className="text-red-600 flex items-center gap-1"><IconX size={14} /> {urlError}</span>
                ) : null}
              </div>
            )}
          </div>



          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !githubUrl || urlStatus === "invalid" || isValidatingUrl}
              className={`px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm ${(isLoading || !githubUrl || urlStatus === "invalid" || isValidatingUrl) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                "Import & Chat"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
