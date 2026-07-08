"use client";

import { useState, memo } from "react";
import { IconRobot, IconUser, IconCopy, IconCheck } from "@tabler/icons-react";
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  { ssr: false, loading: () => <div className="bg-[#1e1e1e] rounded-xl p-4 my-4 text-neutral-500 text-sm font-mono">Loading code...</div> }
);

export const CodeBlock = ({ language, code }: { language: string; code: string }) => {
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

export const BouncingDots = () => (
  <div className="flex gap-1 items-center justify-center">
    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></div>
  </div>
);

export const MemoizedMessage = memo(({ msg }: { msg: { role: string, content: string } }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-4 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant Layout */}
      {msg.role === 'assistant' && (
        <div className="max-w-[70%] flex flex-col gap-1.5 group">
          <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex flex-col gap-2">
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
          <div className="flex justify-start opacity-0 group-hover:opacity-100 transition-opacity pl-1">
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-neutral-200 text-black text-xs font-semibold transition-colors cursor-pointer" title="Copy message">
              {copied ? <IconCheck size={14} className="text-green-600" /> : <IconCopy size={14} />}
              <span className={copied ? "text-green-700" : "text-neutral-700"}>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* User Layout */}
      {msg.role === 'user' && (
        <div className="max-w-[70%] flex flex-col gap-1.5 group items-end">
          <div className="bg-neutral-900 text-white rounded-2xl rounded-tr-sm p-4 shadow-md flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 text-neutral-400 justify-start">
              <IconUser size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">You</span>
            </div>
            <p className="text-sm text-white leading-relaxed font-medium whitespace-pre-wrap cursor-text">
              {msg.content}
            </p>
          </div>
          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity pr-1">
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-neutral-200 text-black text-xs font-semibold transition-colors cursor-pointer" title="Copy message">
              {copied ? <IconCheck size={14} className="text-green-600" /> : <IconCopy size={14} />}
              <span className={copied ? "text-green-700" : "text-neutral-700"}>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
