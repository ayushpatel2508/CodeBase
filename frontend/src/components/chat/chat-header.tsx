import Link from "next/link";
import Image from "next/image";
import { IconHome, IconMessage, IconBrandGithub } from "@tabler/icons-react";

export function ChatHeader() {
  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 z-10">
      <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
        <div className="w-9 h-9 shrink-0 relative rounded-xl overflow-hidden shadow-sm">
          <Image src="/logo.png" alt="RepoChat Logo" fill className="object-cover" />
        </div>
        <div>
          <span className="text-sm font-bold block leading-tight text-neutral-800">
            Codebase
          </span>
          <span className="text-xs font-medium text-neutral-500 block leading-tight">
            GitHub Repo to AI Chat
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
          <IconHome size={18} />
          <span>Home</span>
        </Link>
        <Link href="/chat" className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 bg-neutral-100 px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm">
          <IconMessage size={18} />
          <span>Chat</span>
        </Link>
        <a href="https://github.com" target="_blank" className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
          <IconBrandGithub size={18} />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
}
