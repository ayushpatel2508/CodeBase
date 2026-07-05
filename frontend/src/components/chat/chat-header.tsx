"use client";
import React from "react";
import { IconSitemap } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatHeaderProps {
  chatName: string;
  repoUrl: string;
  onToggleTree: () => void;
  isTreeOpen: boolean;
}

export const ChatHeader = ({ chatName, repoUrl, onToggleTree, isTreeOpen }: ChatHeaderProps) => {
  return (
    <div className="h-[88px] border-b border-neutral-200 bg-white flex items-center justify-between px-6 shrink-0 z-10 relative">
      {/* Left: Chat Info */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{chatName}</h1>
        <a 
          href={repoUrl} 
          target="_blank" 
          rel="noreferrer"
          className="text-sm text-neutral-500 hover:text-indigo-500 transition-colors flex items-center gap-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          {repoUrl}
        </a>
      </div>

      {/* Right: Actions */}
      <motion.button 
        onClick={onToggleTree}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium shadow-sm hover:bg-black transition-all"
      >
        <IconSitemap size={16} className="text-neutral-300" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isTreeOpen ? "hide" : "view"}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="inline-block"
          >
            {isTreeOpen ? "Hide Repo Tree" : "View Repo Tree"}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
