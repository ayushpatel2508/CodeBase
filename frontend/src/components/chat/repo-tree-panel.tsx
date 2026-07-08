"use client";

import React, { useState } from "react";
import { 
  IconFolder, 
  IconFolderOpen, 
  IconChevronRight, 
  IconChevronDown, 
  IconFile, 
  IconFileCode 
} from "@tabler/icons-react";

export type TreeNode = {
  name: string;
  isDir: boolean;
  children: { [key: string]: TreeNode };
};

export const buildTree = (paths: string[]): TreeNode => {
  const root: TreeNode = { name: "root", isDir: true, children: {} };
  for (const path of paths) {
    const parts = path.split("/").filter(Boolean);
    const isDir = path.endsWith("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          isDir: i === parts.length - 1 ? isDir : true,
          children: {}
        };
      }
      current = current.children[part];
    }
  }
  return root;
};

export const TreeRenderer = React.memo(({ node, level = 0 }: { node: TreeNode, level?: number }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (node.name === "root") {
    const keys = Object.keys(node.children).sort((a, b) => {
      const aIsDir = node.children[a].isDir;
      const bIsDir = node.children[b].isDir;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
    return (
      <div className="w-full pb-4 text-sm font-sans select-none">
        <div className="flex items-center gap-2 mb-2 px-2 py-1">
          <IconFolderOpen size={20} className="text-cyan-600 drop-shadow-sm" />
          <span className="text-cyan-700 font-bold tracking-wide">Repository Root</span>
        </div>
        <div className="flex flex-col ml-4 pl-3 border-l border-neutral-200">
          {keys.map((key) => (
            <TreeRenderer key={key} node={node.children[key]} level={level + 1} />
          ))}
        </div>
      </div>
    );
  }

  const keys = Object.keys(node.children).sort((a, b) => {
    const aIsDir = node.children[a].isDir;
    const bIsDir = node.children[b].isDir;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex flex-col">
      <div 
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 ${node.isDir ? 'text-neutral-700 font-semibold hover:bg-emerald-50/50 cursor-pointer' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'}`}
        onClick={() => node.isDir && setIsOpen(!isOpen)}
      >
        {node.isDir ? (
          <>
            {isOpen ? <IconChevronDown size={14} className="text-neutral-400 shrink-0 transition-transform" /> : <IconChevronRight size={14} className="text-neutral-400 shrink-0 transition-transform" />}
            {isOpen ? <IconFolderOpen size={18} className="text-emerald-500 shrink-0" /> : <IconFolder size={18} className="text-emerald-500 shrink-0" />}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" /> {/* Spacer to align files with folders */}
            {node.name.endsWith('.md') ? (
              <IconFile size={16} className="text-blue-400 shrink-0" />
            ) : node.name.match(/\.(ts|tsx|js|jsx)$/) ? (
              <IconFileCode size={16} className="text-yellow-500 shrink-0" />
            ) : (
              <IconFile size={16} className="text-neutral-400 shrink-0" />
            )}
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      
      {node.isDir && isOpen && keys.length > 0 && (
        <div className="flex flex-col ml-6 pl-3 border-l border-neutral-200 mt-1 mb-1">
          {keys.map((key) => (
            <TreeRenderer key={key} node={node.children[key]} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
});
