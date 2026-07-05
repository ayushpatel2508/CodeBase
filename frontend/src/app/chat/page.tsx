"use client";

import { IconMessageChatbot, IconPlus } from "@tabler/icons-react";

export default function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 h-full w-full">
      <div className="bg-white border border-neutral-200 rounded-3xl p-12 max-w-md w-full text-center shadow-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-6 border border-neutral-200">
          <IconMessageChatbot size={32} className="text-neutral-600" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-3">Welcome to RepoChat</h2>
        <p className="text-sm text-neutral-500 mb-8 max-w-xs leading-relaxed">
          Create a new chat or select an existing repository from the sidebar to get started.
        </p>
        <button 
          // The click handler for opening the modal is in layout.tsx, but we can instruct the user
          className="flex items-center gap-2 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm pointer-events-none"
        >
          <IconPlus size={18} />
          <span>Click "New Chat" on the left</span>
        </button>
      </div>
    </div>
  );
}
