"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconCheck } from "@tabler/icons-react";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal = ({ isOpen, onClose }: NewChatModalProps) => {
  const [chatName, setChatName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // GitHub URL Validation Logic
  useEffect(() => {
    if (!repoUrl.trim()) {
      setIsValidating(false);
      setIsValidUrl(false);
      return;
    }

    setIsValidating(true);
    setIsValidUrl(false);

    // Simulate network delay for typing debounce
    const timeout = setTimeout(async () => {
      // Regex for standard github repo: https://github.com/user/repo
      const githubRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/)?$/;
      const isValidFormat = githubRegex.test(repoUrl.trim());
      
      if (!isValidFormat) {
        setIsValidUrl(false);
        setIsValidating(false);
        return;
      }

      try {
        const res = await fetch(`http://127.0.0.1:8000/repo/verify?github_url=${encodeURIComponent(repoUrl.trim())}`);
        const data = await res.json();
        setIsValidUrl(data.valid);
      } catch (error) {
        console.error("Failed to verify repo:", error);
        setIsValidUrl(false);
      }
      
      setIsValidating(false);
    }, 800); // 800ms debounce

    return () => clearTimeout(timeout);
  }, [repoUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatName.trim() || !isValidUrl) return;
    
    // TODO: Connect to backend logic here
    console.log("Submitting:", { chatName, repoUrl });
    onClose();
    
    // Reset form after closing
    setTimeout(() => {
      setChatName("");
      setRepoUrl("");
    }, 300);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col font-sans"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h2 className="text-lg font-bold text-neutral-900">Create New Chat</h2>
                <button 
                  onClick={onClose}
                  className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                >
                  <IconX size={20} />
                </button>
              </div>

              {/* Body Form */}
              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                
                {/* Chat Name Field */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="chatName" className="text-sm font-semibold text-neutral-700">
                    Chat Name
                  </label>
                  <input
                    id="chatName"
                    type="text"
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                    placeholder="e.g. Next.js Exploration"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300 transition-all"
                  />
                </div>

                {/* Repo URL Field */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="repoUrl" className="text-sm font-semibold text-neutral-700">
                    GitHub Repository URL
                  </label>
                  <input
                    id="repoUrl"
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    className={`w-full bg-neutral-50 border rounded-xl px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-all ${
                      repoUrl.length > 0 && !isValidating && !isValidUrl 
                        ? "border-red-300 focus:ring-red-100 focus:border-red-400" 
                        : "border-neutral-200 focus:ring-neutral-200 focus:border-neutral-300"
                    }`}
                  />
                  
                  {/* Status Indicator */}
                  <div className="h-5 flex items-center mt-1">
                    {isValidating && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                        <div className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        Parsing URL...
                      </div>
                    )}
                    
                    {!isValidating && repoUrl.length > 0 && isValidUrl && (
                      <motion.div 
                        initial={{ opacity: 0, x: -5 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        className="flex items-center gap-1.5 text-xs font-bold text-neutral-900"
                      >
                        <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                          <IconCheck size={12} className="text-white" stroke={3} />
                        </div>
                        URL valid
                      </motion.div>
                    )}

                    {!isValidating && repoUrl.length > 0 && !isValidUrl && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="text-xs font-medium text-red-500"
                      >
                        Please enter a valid public GitHub repository URL.
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!chatName.trim() || !isValidUrl}
                  className={`mt-4 w-full py-3 rounded-xl text-sm font-bold flex justify-center items-center transition-all ${
                    !chatName.trim() || !isValidUrl
                      ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                      : "bg-neutral-900 text-white hover:bg-black cursor-pointer shadow-md shadow-neutral-900/20"
                  }`}
                >
                  Create Chat Workspace
                </button>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
