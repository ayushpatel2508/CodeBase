"use client";
import React, { useState } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatHeader } from "./chat-header";
import { RepoTreePanel } from "./repo-tree-panel";
import { IconHome, IconMessageChatbot, IconBrandGithub } from "@tabler/icons-react";
import Link from "next/link";

export const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-full bg-[#fafafa] text-neutral-900 font-sans overflow-hidden">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <div className="text-xs text-neutral-500 font-medium leading-none">Codebase</div>
            <div className="text-sm font-bold text-neutral-900 leading-tight">GitHub Repo to AI Chat</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
            <IconHome size={18} /> Home
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 bg-neutral-100 px-3 py-1.5 rounded-full border border-neutral-200">
            <IconMessageChatbot size={18} /> Chat
          </div>
          <a href="#" className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
             GitHub
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden w-full bg-white">
        
        {/* Edge-to-Edge Sidebar */}
        <div 
          className={`h-full shrink-0 flex flex-col bg-[#fafafa] border-r-2 border-neutral-900 overflow-hidden z-10 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-[300px] md:w-[320px]" : "w-[60px]"
          }`}
        >
          <ChatSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>

        {/* Edge-to-Edge Chat Workspace */}
        <div className="flex-1 h-full bg-white flex flex-col relative overflow-hidden">
          <ChatHeader 
            chatName="Ask questions about the codebase"
            repoUrl="https://github.com/vercel/next.js"
            isTreeOpen={isTreeOpen}
            onToggleTree={() => setIsTreeOpen(!isTreeOpen)}
          />
          <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-1 flex flex-col relative h-full">
              {children}
            </div>
            {/* Right Drawer */}
            <RepoTreePanel isOpen={isTreeOpen} onClose={() => setIsTreeOpen(false)} />
          </div>
        </div>
        
      </div>
    </div>
  );
};
