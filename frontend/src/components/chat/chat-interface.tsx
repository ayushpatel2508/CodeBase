"use client";
import React from "react";
import { IconSend, IconUser, IconRobot } from "@tabler/icons-react";

export const ChatInterface = () => {
  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* Scrollable Feed */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        
        {/* Intro Message */}
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
            <IconRobot size={18} className="text-neutral-600" />
          </div>
          <div className="flex flex-col gap-1 w-full max-w-3xl">
            <span className="text-xs font-semibold text-neutral-400 px-1">AI Assistant</span>
            <div className="text-neutral-800 leading-relaxed text-[15px] pt-1">
              I imported the repository and mapped the tree. You can ask about architecture, components, dependencies, or implementation details.
            </div>
          </div>
        </div>

        {/* User Message */}
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 shadow-sm mt-1">
            <IconUser size={18} className="text-white" />
          </div>
          <div className="flex flex-col gap-1 w-full max-w-3xl">
            <span className="text-xs font-semibold text-neutral-400 px-1">You</span>
            <div className="bg-neutral-100/50 border border-neutral-200 text-neutral-900 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed text-[15px]">
              What is the main entry point and how does the chat flow connect to the repository tree?
            </div>
          </div>
        </div>
        
        {/* AI Response */}
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
            <IconRobot size={18} className="text-neutral-600" />
          </div>
          <div className="flex flex-col gap-1 w-full max-w-3xl">
            <span className="text-xs font-semibold text-neutral-400 px-1">AI Assistant</span>
            <div className="text-neutral-800 leading-relaxed text-[15px] pt-1">
              The app likely starts from a top-level page or layout component, then passes the parsed tree into the chat panel so responses can reference files and folders with context.
            </div>
          </div>
        </div>

        {/* User Message */}
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 shadow-sm mt-1">
            <IconUser size={18} className="text-white" />
          </div>
          <div className="flex flex-col gap-1 w-full max-w-3xl">
            <span className="text-xs font-semibold text-neutral-400 px-1">You</span>
            <div className="bg-neutral-100/50 border border-neutral-200 text-neutral-900 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed text-[15px]">
              Show me where the repo tree is rendered and how I can extend it.
            </div>
          </div>
        </div>
        
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white shrink-0">
        <div className="max-w-4xl mx-auto relative flex flex-col border border-neutral-200 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] bg-white p-2">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 px-2 pt-1 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
            <span className="text-xs font-medium text-neutral-600">Ask anything about the repo</span>
          </div>
          <div className="flex items-center relative">
            <input 
              type="text" 
              placeholder="Type a question about the imported repository..."
              className="w-full bg-transparent border-none outline-none pl-2 pr-12 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            />
            <button className="absolute right-1 p-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center">
              <IconSend size={16} />
            </button>
          </div>
        </div>
        <div className="text-center mt-3 text-xs text-neutral-400">
          AI can make mistakes. Check your codebase to verify.
        </div>
      </div>
    </div>
  );
};
