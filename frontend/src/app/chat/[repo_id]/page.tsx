"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { IconSend, IconRobot, IconUser, IconLink, IconFolder, IconFolderOpen, IconChevronRight, IconChevronDown, IconFile, IconSparkles, IconMessageChatbot, IconMessage, IconLayoutSidebarRight, IconLoader2, IconCopy, IconCheck, IconFileCode, IconRefresh, IconSquare, IconArrowDown, IconTrash } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden my-4 border border-neutral-200 shadow-sm">
      <div className="bg-[#1e1e1e] border-b border-white/10 text-neutral-400 text-xs px-4 py-2 flex justify-between items-center font-mono">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? <IconCheck size={14} className="text-green-400" /> : <IconCopy size={14} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus as any}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, padding: '1rem', fontSize: '0.875rem' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

const BouncingDots = () => (
  <div className="flex gap-1 items-center justify-center">
    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></div>
  </div>
);

type TreeNode = {
  name: string;
  isDir: boolean;
  children: { [key: string]: TreeNode };
};

const buildTree = (paths: string[]): TreeNode => {
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

const TreeRenderer = ({ node, level = 0 }: { node: TreeNode, level?: number }) => {
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
};

const MemoizedMessage = memo(({ msg }: { msg: { role: string, content: string } }) => (
  <div className={`flex gap-4 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
    {/* Assistant Layout */}
    {msg.role === 'assistant' && (
      <div className="max-w-[70%] bg-white border border-neutral-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex flex-col gap-2">
        <div className="flex items-center gap-2 text-neutral-400">
          <IconRobot size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">AI Assistant</span>
        </div>
        <div className="prose prose-sm max-w-none prose-neutral w-full overflow-hidden cursor-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code(props: any) {
                const { children, className, node, ...rest } = props;
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
                ) : (
                  <code className="bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border border-neutral-200" {...rest}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    )}

    {/* User Layout */}
    {msg.role === 'user' && (
      <div className="max-w-[70%] bg-neutral-900 text-white rounded-2xl rounded-tr-sm p-4 shadow-md flex flex-col gap-2">
        <div className="flex items-center gap-2 text-neutral-400 justify-start">
          <IconUser size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">You</span>
        </div>
        <p className="text-sm text-white leading-relaxed font-medium whitespace-pre-wrap cursor-text">
          {msg.content}
        </p>
      </div>
    )}
  </div>
));

export default function ChatRepoPage() {
  const params = useParams();
  const repo_id = params.repo_id as string;
  const { data: session, status, update } = useSession();

  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState(`Loading repository...`);
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [toolStatus, setToolStatus] = useState("");
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [treeFiles, setTreeFiles] = useState<string[]>([]);
  const [repoStatus, setRepoStatus] = useState<string>("loading"); // 'cloning', 'processing', 'ready', 'failed'
  const [isSyncing, setIsSyncing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const isResizing = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isNearBottomRef = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 150;
    setShowScrollBtn(distanceFromBottom > 150);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 600) newWidth = 600;
      
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  // Scroll to bottom when new messages are added (user sends or AI finishes)
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // During streaming, only auto-scroll if user is already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [streamingMessage, isLoading]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated" && session?.accessToken) {
      fetchHistory();
      fetchRepoDetails();
      fetchTree();
    } else {
      setIsFetchingHistory(false);
      setMessages([
        {
          role: "assistant",
          content: "You are currently not logged in or your session has expired. Please return to the dashboard to log in."
        }
      ]);
    }
  }, [status, session?.accessToken]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (["queued", "cloning", "processing", "loading", "parsing", "embedding"].includes(repoStatus)) {
      interval = setInterval(() => {
        fetchRepoDetails();
        if (treeFiles.length === 0) fetchTree();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [repoStatus, session]);

  const fetchRepoDetails = async () => {
    try {
      if (!session?.accessToken) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/repo/status/${repo_id}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (res.status === 401) {
        await update();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRepoStatus(data.status);
        if (data.github_url) {
          setRepoUrl(data.github_url);
        }
      }
    } catch (err) {
      console.error("Failed to fetch repo details", err);
    }
  };

  const handleSync = async () => {
    if (repoStatus !== "completed") return;
    try {
      setIsSyncing(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/repo/${repo_id}/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      if (res.ok) {
        setRepoStatus("queued");
        setTreeFiles([]);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Failed to sync repository");
      }
    } catch (err) {
      console.error("Sync error", err);
      alert("Failed to reach server to sync repository");
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchTree = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/tree/${repo_id}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      if (res.status === 401) {
        await update();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTreeFiles(data.tree || []);
      }
    } catch (err) {
      console.error("Failed to fetch tree", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/history/${repo_id}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      if (res.status === 401) {
        await update();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([
            {
              role: "assistant",
              content: "I imported the repository and mapped the tree. You can ask about architecture, components, dependencies, or implementation details."
            }
          ]);
        }
      } else {
        setMessages([
          {
            role: "assistant",
            content: "Welcome! Feel free to ask questions about the codebase."
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch chat history", err);
      setMessages([
        {
          role: "assistant",
          content: "Welcome! (Offline mode: couldn't fetch history)"
        }
      ]);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleClearChat = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/history/${repo_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      if (res.ok) {
        setMessages([
          {
            role: "assistant",
            content: "Welcome! Feel free to ask questions about the codebase."
          }
        ]);
        setIsClearModalOpen(false);
      } else {
        console.error("Failed to clear chat history");
      }
    } catch (err) {
      console.error("Error clearing chat history", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setInput("");
    setIsLoading(true);
    setStreamingMessage("");
    setToolStatus("Analyzing codebase...");

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          repo_id: repo_id,
          query: userQuery
        }),
        signal: abortControllerRef.current.signal,
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let currentStreamingText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                if (data.chunk !== undefined && data.chunk !== null && data.chunk !== "") {
                  currentStreamingText += data.chunk;
                  setStreamingMessage(currentStreamingText);
                  // Once text starts streaming, clear the status so it disappears
                  setToolStatus("");
                } else if (data.status) {
                  setToolStatus(data.status);
                } else if (data.error) {
                  currentStreamingText += `\n**Error**: ${data.error}`;
                  setStreamingMessage(currentStreamingText);
                }
              } catch (e) {
                console.error("Failed to parse SSE data string:", dataStr);
              }
            }
          }
        }
        
        // Final message
        setMessages(prev => [...prev, { role: "assistant", content: currentStreamingText }]);
        setStreamingMessage("");

      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${errorData.detail || "Failed to get a response from the AI."}` }]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Fetch aborted by user");
        if (streamingMessage) {
           setMessages(prev => [...prev, { role: "assistant", content: streamingMessage }]);
        }
      } else {
        console.error("Failed to send query", err);
        setMessages(prev => [...prev, { role: "assistant", content: "Error: Could not reach the backend server." }]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessage("");
      setToolStatus("");
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setMessages(prev => [...prev, { role: "assistant", content: "\n\n*Execution stopped by user*" }]);
      setIsLoading(false);
      setStreamingMessage("");
      setToolStatus("");
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden w-full">
      {/* Center Column: Chat Workspace Card */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden">

        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0">
              <IconLink size={20} className="text-white" />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Repository URL</p>
                <a href={repoUrl.startsWith("http") ? repoUrl : "#"} target={repoUrl.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-lg font-bold text-neutral-900 hover:underline">
                  {repoUrl.replace("https://github.com/", "").replace("http://github.com/", "")}
                </a>
              </div>
              {repoStatus === "completed" && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="ml-2 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Pull latest commits and intelligently re-embed modified files"
                >
                  <IconRefresh size={14} className={isSyncing ? "animate-spin" : ""} />
                  {isSyncing ? "Syncing..." : "Sync Latest"}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">

            <button
              onClick={() => setIsTreeOpen(!isTreeOpen)}
              className={`p-2 rounded-lg border transition-colors ${isTreeOpen ? 'bg-neutral-100 border-neutral-300' : 'bg-white border-neutral-200 hover:bg-neutral-50'} cursor-pointer`}
              title="Toggle Parsed Tree"
            >
              <IconLayoutSidebarRight size={20} className="text-neutral-600" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fafafa] relative" ref={messagesContainerRef} onScroll={handleScroll}>
          {isFetchingHistory ? (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <IconLoader2 className="animate-spin mr-2" size={20} />
              <span className="text-sm font-medium">Loading chat...</span>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MemoizedMessage key={idx} msg={msg} />
              ))}

              {isLoading && (
                <div className="flex gap-4 w-full justify-start">
                  <div className="max-w-[70%] bg-white border border-neutral-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <IconRobot size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">AI Assistant</span>
                    </div>
                    {toolStatus && (
                      <div className="flex items-center gap-2 text-neutral-500 py-1 border-b border-neutral-100 pb-2 mb-2">
                        <IconLoader2 size={16} className="animate-spin shrink-0" />
                        <span className="text-xs font-semibold uppercase tracking-wider">{toolStatus}</span>
                      </div>
                    )}
                    
                    {streamingMessage ? (
                      <div className="prose prose-sm max-w-none prose-neutral w-full overflow-hidden">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code(props: any) {
                              const { children, className, node, ...rest } = props;
                              const match = /language-(\w+)/.exec(className || '');
                              return match ? (
                                <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
                              ) : (
                                <code className="bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border border-neutral-200" {...rest}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
                          {streamingMessage}
                        </ReactMarkdown>
                      </div>
                    ) : !toolStatus && (
                      <div className="flex items-center gap-2 text-neutral-500 py-1">
                        <IconLoader2 size={16} className="animate-spin" />
                        <span className="text-sm font-medium">Analyzing codebase...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="sticky bottom-4 left-1/2 -translate-x-1/2 z-20 w-9 h-9 bg-neutral-900 hover:bg-neutral-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 mx-auto"
              title="Scroll to bottom"
            >
              <IconArrowDown size={18} />
            </button>
          )}
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 bg-white border-t border-neutral-100">
          <div className="border border-neutral-200 rounded-2xl bg-[#fafafa] overflow-hidden focus-within:border-neutral-400 transition-colors shadow-sm">
            <div className="px-4 py-2.5 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-700 font-semibold text-sm">
                <IconMessage size={16} className="text-neutral-500" />
                {isFetchingHistory ? (
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">Loading chat...</span>
                    <BouncingDots />
                  </div>
                ) : repoStatus === "completed" ? "Ask anything about the repo" : repoStatus === "failed" ? "Repository parsing failed" : (
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">
                      {repoStatus === "queued" ? "Repository is queued" : 
                       repoStatus === "cloning" ? "Cloning repository..." :
                       repoStatus === "parsing" ? "Parsing source code..." :
                       repoStatus === "embedding" ? "Generating vector embeddings..." :
                       "Processing repository..."}
                    </span>
                    <BouncingDots />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsClearModalOpen(true)}
                  title="Clear Chat History"
                  className="px-2 py-1.5 hover:bg-neutral-200 text-neutral-500 hover:text-red-600 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer mr-1"
                >
                  <IconTrash size={16} />
                  <span className="hidden sm:inline">Clear Chat</span>
                </button>
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  title="Stop Generating"
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <IconSquare size={16} />
                </button>
              ) : (
                  <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isFetchingHistory || repoStatus !== "completed" || isSyncing}
                  className={`px-3 py-1.5 ${(!input.trim() || isFetchingHistory || repoStatus !== "completed" || isSyncing) ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed' : 'bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer'} rounded-xl text-sm font-semibold transition-colors flex items-center gap-2`}
                >
                  <IconSend size={16} />
                  <span>Send</span>
                </button>
              )}
              </div>
            </div>
            <form onSubmit={handleSend} className="flex relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isFetchingHistory && repoStatus === "completed" && !isSyncing && !isLoading) {
                      handleSend(e as any);
                      if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                      }
                    }
                  }
                }}
                placeholder={isSyncing ? "Repository is syncing..." : repoStatus === "completed" ? "Type a question about the imported repository... (Shift+Enter for new line)" : "Please wait until the repository is fully parsed..."}
                disabled={isLoading || isFetchingHistory || repoStatus !== "completed" || isSyncing}
                rows={1}
                className="w-full bg-transparent border-none text-neutral-900 px-4 py-3 text-sm focus:outline-none placeholder:text-neutral-400 disabled:opacity-50 resize-none overflow-y-auto min-h-[44px]"
                style={{ maxHeight: '100px' }}
              />
            </form>
          </div>
        </div>

      </div>

      {/* Right Column: Parsed Tree Toggleable */}
      {isTreeOpen && (
        <div 
          className="relative shrink-0 flex flex-col bg-white border-l border-neutral-200"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Drag Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 -ml-[1px] cursor-ew-resize hover:bg-blue-400 z-10 transition-colors"
            onMouseDown={handleMouseDown}
          />
          <div className="p-6 overflow-y-auto h-full flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-neutral-800 text-sm font-bold">
                <IconFolder size={16} />
                <span>Parsed Tree</span>
              </div>
            </div>
            {treeFiles.length === 0 ? (
              <div className="space-y-2 text-sm text-neutral-500 font-mono italic">
                Loading parsed tree...
              </div>
            ) : (
              <div className="space-y-1.5 overflow-x-hidden pb-4">
                <TreeRenderer node={buildTree(treeFiles)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <IconTrash size={24} />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Clear Chat History?</h2>
              <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                Are you sure you want to permanently delete your conversation history for this repository? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearChat}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-sm shadow-red-600/20 cursor-pointer flex items-center gap-2"
                >
                  <IconTrash size={16} />
                  Clear History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
