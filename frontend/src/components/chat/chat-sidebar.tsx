"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  IconMessageChatbot, 
  IconEdit, 
  IconTrash, 
  IconLayoutSidebarLeftCollapse, 
  IconLayoutSidebarLeftExpand,
  IconPencilPlus,
  IconDots
} from "@tabler/icons-react";
import { NewChatModal } from "./new-chat-modal";

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatSidebar = ({ isOpen, onToggle }: ChatSidebarProps) => {
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const dummyChats = [
    { id: 1, name: "Exploring Next.js framework architecture" },
    { id: 2, name: "Auth Logic in Python" },
    { id: 3, name: "Debugging Redis Cache" },
    { id: 4, name: "Database Schema Design" },
  ];

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full h-full flex flex-col z-20 relative">
      
      {/* Top Bar with Toggle and New Chat */}
      <div className={`p-3 flex ${isOpen ? "flex-col items-start" : "flex-col items-center"} gap-2 shrink-0`}>
        <button 
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer shrink-0"
          title={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isOpen ? <IconLayoutSidebarLeftCollapse size={20} /> : <IconLayoutSidebarLeftExpand size={20} />}
        </button>

        {isOpen && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-200 text-neutral-800 transition-colors cursor-pointer font-medium text-sm"
          >
            <IconPencilPlus size={18} className="text-neutral-600 shrink-0" />
            <span className="truncate">New chat</span>
          </button>
        )}
      </div>

      {/* Main List */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col mt-2">
          <div className="text-xs font-semibold text-neutral-400 mb-2 px-3">Recents</div>
          
          <div className="flex flex-col space-y-0.5" ref={menuRef}>
            {dummyChats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                  chat.id === 1 ? "bg-neutral-200/70" : "hover:bg-neutral-200/50"
                }`}
              >
                <div className="flex-1 overflow-hidden">
                  <div className={`text-sm truncate pr-6 ${chat.id === 1 ? "font-semibold text-neutral-900" : "font-medium text-neutral-700 group-hover:text-neutral-900"}`}>
                    {chat.name}
                  </div>
                </div>

                {/* 3 Dots Menu Trigger */}
                <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center transition-opacity bg-gradient-to-l from-[#e5e5e5] via-[#e5e5e5] to-transparent pl-4 pr-1 ${activeMenuId === chat.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                    }}
                    className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-300/50 rounded-md transition-colors cursor-pointer"
                  >
                    <IconDots size={18} />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {activeMenuId === chat.id && (
                  <div className="absolute right-8 top-8 w-36 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-50 flex flex-col overflow-hidden">
                    <button className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors w-full text-left cursor-pointer">
                      <IconEdit size={16} className="text-neutral-500" />
                      Rename
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left cursor-pointer">
                      <IconTrash size={16} className="text-red-500" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show tooltip-like New Chat button when collapsed */}
      {!isOpen && (
        <div className="px-3 mt-2 flex flex-col items-center">
           <button 
             onClick={() => setIsModalOpen(true)}
             className="p-2 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer" 
             title="New chat"
           >
             <IconPencilPlus size={20} />
           </button>
        </div>
      )}
      
      {/* New Chat Modal */}
      <NewChatModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
