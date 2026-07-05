"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IconPlus, IconMessage, IconLogout, IconHome, IconBrandGithub, IconDotsVertical, IconEdit, IconTrash, IconKey } from "@tabler/icons-react";
import ApiKeyModal from "@/components/ApiKeyModal";

interface Repo {
  id: string;
  status: string;
  total_files: number;
  chat_name?: string;
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [renameModalRepo, setRenameModalRepo] = useState<{ id: string, name: string } | null>(null);
  const [newChatName, setNewChatName] = useState("");
  const [deleteModalRepoId, setDeleteModalRepoId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated" || (session as any)?.error === "RefreshAccessTokenError") {
      signOut({ callbackUrl: "/login" });
    }
  }, [status, session, router]);

  const fetchRepos = () => {
    if (session?.accessToken) {
      if (repos.length === 0) {
        setIsLoadingRepos(true);
      }
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/repo/list`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.repos) {
            setRepos(data.repos);
          }
        })
        .catch((err) => console.error("Failed to fetch repos", err))
        .finally(() => setIsLoadingRepos(false));
    } else if (status !== "loading") {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [session]);

  const executeRename = async () => {
    if (!renameModalRepo || !newChatName.trim() || newChatName === renameModalRepo.name || !session?.accessToken) {
      setRenameModalRepo(null);
      return;
    }
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/repo/${renameModalRepo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ chat_name: newChatName }),
      });
      fetchRepos();
    } catch (error) {
      console.error("Failed to rename chat", error);
    }
    setRenameModalRepo(null);
  };

  const executeDelete = async () => {
    if (!deleteModalRepoId || !session?.accessToken) {
      setDeleteModalRepoId(null);
      return;
    }
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/repo/${deleteModalRepoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      fetchRepos();
      if (pathname.includes(deleteModalRepoId)) {
        window.location.href = '/chat';
      }
    } catch (error) {
      console.error("Failed to delete chat", error);
    }
    setDeleteModalRepoId(null);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="animate-spin h-8 w-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col h-screen bg-[#fafafa] text-neutral-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 z-10">
        <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0">
            {/* Logo placeholder - assuming generic rounded black box for 'RepoChat' logo from photo */}
            <div className="w-4 h-4 bg-white rounded-sm" />
          </div>
          <div>
            <span className="text-sm font-bold block leading-tight text-neutral-800">
              RepoChat
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

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[260px] bg-white border-r border-black flex flex-col shrink-0">
          <div className="p-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <IconPlus size={16} />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="text-xs font-bold text-neutral-400 mb-2 px-3 mt-2 uppercase tracking-wider">Recents</div>
            {isLoadingRepos ? (
              <div className="flex flex-col gap-2 px-3 mt-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 w-full bg-neutral-200/60 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : repos.length === 0 ? (
              <div className="text-sm text-neutral-400 px-3 italic">No chats yet</div>
            ) : (
              <div className="flex flex-col gap-1">
                {repos.map((repo) => (
                  <div key={repo.id} className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors ${pathname.includes(repo.id) ? 'bg-neutral-900' : 'hover:bg-neutral-100'}`}>
                    <Link
                      href={`/chat/${repo.id}`}
                      className="flex-1 flex items-center gap-2 min-w-0"
                    >
                      <IconMessage size={16} className={`shrink-0 ${pathname.includes(repo.id) ? 'text-neutral-300' : 'text-neutral-400'}`} />
                      <span className={`truncate text-sm font-medium transition-colors ${pathname.includes(repo.id) ? 'text-white' : 'text-neutral-600 group-hover:text-neutral-900'}`}>
                        {repo.chat_name || repo.id}
                      </span>
                    </Link>

                    {/* Dropdown Menu Trigger */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
                      <div className="relative dropdown-container">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const dropdown = e.currentTarget.nextElementSibling;
                            if (dropdown) dropdown.classList.toggle('hidden');
                          }}
                          className="p-1 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                          <IconDotsVertical size={16} />
                        </button>

                        <div className="hidden absolute right-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.currentTarget.parentElement?.classList.add('hidden');
                              setRenameModalRepo({ id: repo.id, name: repo.chat_name || repo.id });
                              setNewChatName(repo.chat_name || repo.id);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2 cursor-pointer"
                          >
                            <IconEdit size={14} /> Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.currentTarget.parentElement?.classList.add('hidden');
                              setDeleteModalRepoId(repo.id);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                          >
                            <IconTrash size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Profile Area */}
          <div className="p-3 border-t border-neutral-200">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 rounded-xl text-sm font-medium text-neutral-600 transition-colors cursor-pointer"
            >
              {session.user?.image ? (
                <img src={session.user.image} alt="Avatar" className="w-7 h-7 rounded-full border border-neutral-200" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                  {session.user?.name?.[0] || "U"}
                </div>
              )}
              <span className="truncate flex-1 text-left">{session.user?.name}</span>
              <IconLogout size={16} className="text-neutral-400" />
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
          {children}
        </main>
      </div>

      <ApiKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} session={session} onSuccess={() => fetchRepos()} />

      {/* Rename Modal */}
      {renameModalRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <IconEdit size={24} />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Rename Chat</h2>
              <input
                type="text"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                autoFocus
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 text-sm font-medium"
                placeholder="Enter new chat name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') executeRename();
                  if (e.key === 'Escape') setRenameModalRepo(null);
                }}
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setRenameModalRepo(null)}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRename}
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalRepoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <IconTrash size={24} />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Delete Chat?</h2>
              <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                Are you sure you want to remove this chat from your list? (This won't delete it for other users).
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteModalRepoId(null)}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                >
                  <IconTrash size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
