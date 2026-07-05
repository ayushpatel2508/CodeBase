"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconFolder, IconFileCode, IconBrandReact, IconBrandTypescript } from "@tabler/icons-react";

export const RepoTreePanel = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="h-full border-l border-neutral-200 bg-neutral-50/50 flex flex-col shrink-0 overflow-hidden"
        >
          <div className="py-4 border-b border-neutral-200 flex items-center px-4 w-[300px] shrink-0">
            <h3 className="text-sm font-semibold text-neutral-800">Parsed Tree</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto w-[300px] font-mono text-sm text-neutral-600 bg-white">
             <div className="flex items-center gap-2 mb-2"><IconFolder size={16} className="text-blue-500" /> <span>src</span></div>
             <div className="ml-4 space-y-2">
                <div className="flex items-center gap-2"><IconBrandReact size={16} className="text-sky-500" /> <span>app.tsx</span></div>
                <div className="flex items-center gap-2"><IconBrandTypescript size={16} className="text-blue-600" /> <span>layout.tsx</span></div>
                <div className="flex items-center gap-2 mt-2"><IconFolder size={16} className="text-blue-500" /> <span>components</span></div>
                <div className="ml-4 space-y-2">
                    <div className="flex items-center gap-2"><IconBrandReact size={16} className="text-sky-500" /> <span>button.tsx</span></div>
                    <div className="flex items-center gap-2"><IconBrandReact size={16} className="text-sky-500" /> <span>chat-panel.tsx</span></div>
                </div>
             </div>
             <div className="flex items-center gap-2 mt-4"><IconFileCode size={16} className="text-neutral-400" /> <span>README.md</span></div>
             <div className="flex items-center gap-2 mt-2"><IconFileCode size={16} className="text-neutral-400" /> <span>package.json</span></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
