"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  IconFileCode,
  IconMessageChatbot,
  IconRocket,
  IconBrandPython,
  IconBrandReact,
  IconBrandNodejs,
  IconBrandTypescript,
  IconBrandGolang,
  IconBrandRust,
  IconBrandJavascript,
  IconBrandCpp,
  IconChevronDown,
  IconUsers,
  IconCode,
  IconRobot,
  IconBrandGithub,
  IconFolderFilled,
  IconFileDescription
} from "@tabler/icons-react";

const supportedStack = [
  {
    name: "React",
    icon: <IconBrandReact size={28} className="text-cyan-300" />,
    className: "left-[2%] top-[17%]",
  },
  {
    name: "JavaScript",
    icon: <IconBrandJavascript size={28} className="text-yellow-200" />,
    className: "left-[18%] top-[34%]",
  },
  {
    name: "Python",
    icon: <IconBrandPython size={28} className="text-yellow-200" />,
    className: "left-[27%] top-[55%]",
  },
  {
    name: "C++",
    icon: <IconBrandCpp size={28} className="text-blue-200" />,
    className: "left-[4%] bottom-[12%]",
  },
  {
    name: "Node.js",
    icon: <IconBrandNodejs size={28} className="text-emerald-300" />,
    className: "left-[45%] top-[27%]",
  },
  {
    name: "Java",
    icon: <IconFileCode size={28} className="text-red-300" />,
    className: "left-[43%] bottom-[18%]",
  },
  {
    name: "TypeScript",
    icon: <IconBrandTypescript size={28} className="text-blue-300" />,
    className: "right-[27%] top-[62%]",
  },
  {
    name: "React",
    icon: <IconBrandReact size={28} className="text-cyan-300" />,
    className: "right-[36%] top-[14%]",
  },
  {
    name: "Go",
    icon: <IconBrandGolang size={28} className="text-sky-300" />,
    className: "right-[4%] top-[22%]",
  },
  {
    name: "Python",
    icon: <IconBrandPython size={28} className="text-yellow-200" />,
    className: "right-[2%] top-[47%]",
  },
  {
    name: "Rust",
    icon: <IconBrandRust size={28} className="text-orange-200" />,
    className: "right-[2%] bottom-[18%]",
  },
  {
    name: "JavaScript",
    icon: <IconBrandJavascript size={28} className="text-yellow-200" />,
    className: "right-[31%] bottom-[7%]",
  },
];

// For Sticky Scroll
const stickyContent = [
  {
    title: "1. Paste a GitHub Repository URL",
    description:
      "Simply grab the link to any public GitHub repository (or private, if authenticated) and paste it into Codebase. No need to clone or download anything locally.",
    content: (
      <div className="h-full w-full flex items-center justify-center text-white bg-gradient-to-br from-cyan-500 to-emerald-500">
        <IconFileCode size={80} />
      </div>
    ),
  },
  {
    title: "2. We Build a Semantic Index",
    description:
      "Our backend immediately clones the codebase, chunks the files, generates vector embeddings, and builds a complete semantic index of the architecture.",
    content: (
      <div className="h-full w-full flex items-center justify-center text-white bg-gradient-to-br from-orange-500 to-yellow-500">
        <IconRocket size={80} />
      </div>
    ),
  },
  {
    title: "3. Start Chatting with Context",
    description:
      "Ask complex questions about dependencies, where specific features are implemented, or how to contribute. The AI answers with precise context from the actual code.",
    content: (
      <div className="h-full w-full flex items-center justify-center text-white bg-gradient-to-br from-pink-500 to-indigo-500">
        <IconMessageChatbot size={80} />
      </div>
    ),
  },
];

function LandingGridBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(20,184,166,0.18),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.14),transparent_30%)]" />
      <AnimatedGridPattern
        width={56}
        height={56}
        numSquares={90}
        maxOpacity={0.16}
        duration={3.6}
        repeatDelay={0.7}
        className={cn(
          "inset-x-[-8%] inset-y-[-18%] h-[136%] w-[116%] skew-y-12",
          "opacity-90"
        )}
      />
      <div className="absolute inset-0">
        {supportedStack.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className={cn(
              "absolute hidden h-28 w-28 -skew-y-12 items-center justify-center border border-white/25 bg-white/[0.14] shadow-2xl shadow-black/50 backdrop-blur-sm sm:flex",
              item.className
            )}
          >
            <div className="flex skew-y-12 flex-col items-center gap-2 text-center">
              {item.icon}
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-white drop-shadow-[0_1px_8px_rgba(255,255,255,0.35)]">
                {item.name}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.72)_70%,rgba(0,0,0,0.94))]" />
    </div>
  );
}

const faqs = [
  {
    question: "Do I need to provide my own OpenAI API key?",
    answer: "No! We handle all the AI infrastructure and API costs on our end. You don't need to create any developer accounts, bring your own keys, or worry about token limits. Just sign in and start chatting."
  },
  {
    question: "What happens when I push new code to GitHub, do I get answers on stale data?",
    answer: "Codebase features intelligent incremental syncing. When you update your repo, just click \"Sync Latest.\" Instead of starting from scratch, we only parse and re-embed the specific files that changed, making the sync lightning fast."
  },
  {
    question: "Are there any repository size limits?",
    answer: "We currently support repositories up to 50MB in size, which easily accommodates the vast majority of standard web and software projects!"
  },
  {
    question: "Do you support private repositories?",
    answer: "Currently, no. We only support public GitHub repositories. Our backend automatically verifies that the repository is public before securely cloning and analyzing it."
  }
];

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full py-6 flex items-center justify-between text-left focus:outline-none cursor-pointer">
        <span className="text-lg font-medium text-white">{question}</span>
        <IconChevronDown className={cn("text-white/50 transition-transform duration-200 shrink-0 ml-4", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-white/70 text-base leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);



  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 80); // higher threshold for inner text flips
  });

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden text-white">
      <LandingGridBackground />

      {/* Navbar */}
      <motion.nav
        layout
        initial={false}
        animate={{
          width: isScrolled ? "min(90vw, 1024px)" : "100vw",
          y: isScrolled ? 16 : 0,
          borderRadius: isScrolled ? 999 : 0,
          paddingTop: isScrolled ? 10 : 16,
          paddingBottom: isScrolled ? 10 : 16,
          paddingLeft: isScrolled ? 24 : 32,
          paddingRight: isScrolled ? 24 : 32,
        }}
        transition={{
          type: "spring",
          stiffness: 130,
          damping: 24,
          mass: 0.9,
        }}
        className={cn(
          "fixed left-1/2 top-0 z-50 flex -translate-x-1/2 items-center justify-between overflow-hidden",
          isScrolled
            ? "bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40"
            : "bg-black/20 backdrop-blur-sm border-b border-white/10"
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className={cn("w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 shadow-sm border", isScrolled ? "border-white/20 bg-white" : "border-white/20")}>
            <img src="/logo.png" alt="Codebase Logo" className="w-full h-full object-cover" />
          </div>
          <div className={`transition-all duration-300 ${isScrolled ? "hidden sm:block" : "block"}`}>
            <span className="text-sm leading-none block text-white/50">
              Codebase
            </span>
            <span className="text-sm font-semibold leading-none text-white">
              GitHub Repo to AI Chat
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/chat" className="text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
            Chat
          </Link>
          <a href="https://github.com" target="_blank" className="text-sm font-medium transition-colors cursor-pointer hidden sm:block text-white/70 hover:text-white">
            GitHub
          </a>
          {status !== "authenticated" && (
            <Link href="/login">
              <button className="text-sm font-medium px-5 py-2.5 rounded-full hover:scale-105 transition-transform duration-200 cursor-pointer shadow-md bg-white text-black hover:bg-white/90">
                Login / Sign Up
              </button>
            </Link>
          )}
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Column */}
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 shadow-sm mb-6 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
              <span className="text-sm font-medium text-white/85">
                Turn any GitHub repository into a conversational knowledge base
              </span>
            </div>

            {/* Aceternity Text Generate Effect */}
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              <TextGenerateEffect
                words="Ask questions about code, structure, and architecture instantly."
                duration={1}
                textClassName="text-white"
              />
            </h1>

            <p className="text-lg text-white/80 leading-relaxed mb-10 max-w-lg">
              Start a new chat by pasting a GitHub repo URL, let the app parse
              the repository into a tree format, and continue asking questions
              with context-aware answers.
            </p>

            <div className="flex items-center gap-4">
              <Link href="/chat">
                {/* Aceternity Hover Border Gradient */}
                <HoverBorderGradient
                  containerClassName="rounded-full cursor-pointer"
                  as="button"
                  className="bg-white text-black flex items-center space-x-2 cursor-pointer px-4 py-2"
                >
                  <span className="text-sm font-medium cursor-pointer">Start New Chat</span>
                </HoverBorderGradient>
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <CardContainer className="inter-var w-full">
            <CardBody className="bg-neutral-900 relative group/card border-neutral-800 border w-full h-auto rounded-2xl p-6 shadow-2xl shadow-black/40">
              <CardItem translateZ="20" className="flex items-center justify-between mb-5 w-full">
                <div>
                  <p className="text-xs text-neutral-400">New Chat</p>
                  <h2 className="text-lg font-semibold text-white">
                    Import a GitHub repository
                  </h2>
                </div>
              </CardItem>
              <CardItem translateZ="30" className="w-full mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-neutral-400">Repository URL</span>
                </div>
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-3">
                  <p className="text-sm text-neutral-500">
                    https://github.com/username/project
                  </p>
                </div>
              </CardItem>
              <CardItem translateZ="40" className="w-full mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-neutral-400">Parsed Tree Preview</span>
                </div>
                <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-4 text-sm text-neutral-400 font-mono shadow-inner h-[180px] overflow-y-auto">
                  <div className="flex items-center gap-2">
                    <IconFolderFilled size={16} className="text-amber-500" />
                    <span className="font-semibold text-amber-500">src</span>
                  </div>
                  <div className="ml-6 mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <IconFolderFilled size={16} className="text-amber-500" />
                      <span className="font-semibold text-amber-500">components</span>
                    </div>
                    <div className="ml-6 mt-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <IconBrandReact size={16} className="text-cyan-400" />
                        <span className="text-neutral-300">button.tsx</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconBrandReact size={16} className="text-cyan-400" />
                        <span className="text-neutral-300">card.tsx</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <IconFolderFilled size={16} className="text-amber-500" />
                      <span className="font-semibold text-amber-500">app</span>
                    </div>
                    <div className="ml-6 mt-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <IconBrandReact size={16} className="text-cyan-400" />
                        <span className="text-neutral-300">page.tsx</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconBrandReact size={16} className="text-cyan-400" />
                        <span className="text-neutral-300">layout.tsx</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <IconFileCode size={16} className="text-emerald-400" />
                    <span className="text-neutral-300">package.json</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <IconFileDescription size={16} className="text-sky-400" />
                    <span className="text-neutral-300">README.md</span>
                  </div>
                </div>
              </CardItem>
              <CardItem translateZ="50" className="w-full">
                <div className="bg-white/10 border border-white/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <IconMessageChatbot size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        Ask anything about the repo
                      </p>
                      <p className="text-xs text-neutral-400">
                        Live context enabled
                      </p>
                    </div>
                  </div>
                </div>
              </CardItem>
            </CardBody>
          </CardContainer>
        </div>
      </main>

      {/* Bento Grid Features */}
      <div className="max-w-6xl mx-auto px-6 py-32 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Core Features</h2>
          <p className="text-lg text-white/75">Everything you need to understand complex codebases fast.</p>
        </div>
        <BentoGrid className="max-w-4xl mx-auto">
          <BentoGridItem
            title="Repo Tree Parsing"
            description="Convert folders and files into a structured tree that you can navigate easily."
            header={
              <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-black/40 border border-white/10 p-5 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none" />
                <div className="font-mono text-xs sm:text-sm text-neutral-400 flex flex-col gap-1.5 relative z-10 group-hover:scale-[1.02] transition-transform duration-500 origin-top-left">
                  <div className="text-cyan-400 font-bold">codebase/</div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-600">├──</span>
                    <span className="text-emerald-400">backend/</span>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <span className="text-neutral-600">├──</span>
                    <span className="text-white">app/</span>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <span className="text-neutral-600">└──</span>
                    <span className="text-neutral-500">main.py</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-600">├──</span>
                    <span className="text-emerald-400">frontend/</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-600">└──</span>
                    <span className="text-neutral-500">README.md</span>
                  </div>
                </div>
              </div>
            }
            icon={<IconFileCode className="h-4 w-4 text-white/75" />}
            className="md:col-span-2 bg-black/55 border-white/10 backdrop-blur-md [&_div.font-bold]:text-white [&_div.font-normal]:text-white/75"
          />
          <BentoGridItem
            title="Fast Onboarding"
            description="Paste a URL and begin in seconds. No complex setup."
            header={
              <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-[#fafafa] border border-neutral-200 p-4 overflow-hidden relative group flex-col justify-center shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                
                <div className="w-full bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm relative z-10 group-hover:-translate-y-1 transition-transform duration-300">
                  <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                    <div className="flex items-center gap-1.5 text-neutral-600 font-semibold text-[10px] sm:text-xs">
                      <IconBrandGithub size={14} className="text-neutral-400" />
                      Import Repository
                    </div>
                    <div className="px-2.5 py-1 bg-neutral-900 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                      <IconRocket size={12} /> Submit
                    </div>
                  </div>
                  <div className="px-3 py-3 bg-white flex items-center">
                    <span className="text-neutral-400 font-mono text-[10px] sm:text-xs">https://github.com/facebook/react</span>
                  </div>
                </div>
              </div>
            }
            icon={<IconRocket className="h-4 w-4 text-white/75" />}
            className="md:col-span-1 bg-black/55 border-white/10 backdrop-blur-md [&_div.font-bold]:text-white [&_div.font-normal]:text-white/75"
          />
          <BentoGridItem
            title="AI Chat Interface"
            description="Ask follow-up questions with repository context preserved across the entire chat."
            header={
              <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-[#fafafa] border border-neutral-200 p-4 overflow-hidden relative group flex-col gap-2.5 justify-end shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                
                <div className="self-end bg-neutral-900 shadow-sm rounded-2xl rounded-tr-sm px-3 py-2 text-[10px] sm:text-xs text-white font-medium max-w-[85%] relative z-10 group-hover:-translate-x-1 transition-transform duration-300 opacity-60">
                  How does the app handle auth?
                </div>
                
                <div className="self-start bg-white border border-neutral-200 shadow-sm rounded-2xl rounded-tl-sm px-3 py-2 text-[10px] sm:text-xs text-neutral-700 font-medium max-w-[95%] flex items-start gap-2 relative z-10 group-hover:translate-x-1 transition-transform duration-300 opacity-80">
                  <IconRobot size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">It uses JWT access tokens defined in <code className="bg-neutral-100 text-neutral-900 px-1 rounded font-mono border border-neutral-200 text-[10px]">auth.py</code>.</span>
                </div>

                <div className="self-end bg-neutral-900 shadow-md rounded-2xl rounded-tr-sm px-3 py-2 text-[10px] sm:text-xs text-white font-medium max-w-[85%] relative z-10 group-hover:-translate-x-1 transition-transform duration-300">
                  Where is the database config located?
                </div>
                <div className="self-start bg-white border border-neutral-200 shadow-sm rounded-2xl rounded-tl-sm px-3 py-2 text-[10px] sm:text-xs text-neutral-700 font-medium max-w-[95%] flex items-start gap-2 relative z-10 group-hover:translate-x-1 transition-transform duration-300">
                  <IconRobot size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">I found it in <code className="bg-neutral-100 text-neutral-900 px-1 rounded font-mono border border-neutral-200 text-[10px]">database.py</code>. It uses PostgreSQL...</span>
                </div>
              </div>
            }
            icon={<IconMessageChatbot className="h-4 w-4 text-white/75" />}
            className="md:col-span-3 bg-black/55 border-white/10 backdrop-blur-md [&_div.font-bold]:text-white [&_div.font-normal]:text-white/75"
          />
        </BentoGrid>
      </div>

      {/* How it Works Section */}
      <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How it Works</h2>
        </div>
        <TracingBeam className="px-6">
          <div className="max-w-2xl mx-auto antialiased pt-4 relative space-y-16">
            {stickyContent.map((item, index) => (
              <div key={`content-${index}`}>
                <div className="flex items-start gap-6">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-lg font-bold text-white shadow-sm mt-0.5 backdrop-blur-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {item.title.replace(/^\d+\.\s*/, '')}
                    </h3>
                    <p className="text-white/80 text-base leading-relaxed max-w-xl">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TracingBeam>
      </div>

      {/* Use Cases Section */}
      <div className="max-w-6xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Who is this for?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-xl hover:bg-white/10 transition-colors">
            <div className="w-14 h-14 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/30">
              <IconUsers className="text-indigo-400" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">For New Hires</h3>
            <p className="text-white/70 text-lg leading-relaxed">
              Onboard 10x faster without asking senior devs basic questions.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-xl hover:bg-white/10 transition-colors">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/30">
              <IconCode className="text-emerald-400" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">For Open Source</h3>
            <p className="text-white/70 text-lg leading-relaxed">
              Explore and contribute to massive libraries without cloning them locally.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-10 backdrop-blur-sm shadow-xl">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-5xl mx-auto px-6 py-24 relative z-10">
        <div className="bg-gradient-to-br from-indigo-600 to-cyan-600 rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-white/5 mix-blend-overlay"></div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 relative z-10">Ready to talk to your code?</h2>
          <p className="text-white/90 text-xl mb-10 max-w-2xl mx-auto relative z-10">
            Paste a repository link and start getting context-aware answers instantly. No complex setup required.
          </p>
          <Link href="/chat" className="relative z-10 inline-flex">
            <button className="px-8 py-4 bg-white text-black font-bold rounded-full text-lg hover:scale-105 transition-transform duration-200 shadow-xl cursor-pointer">
              Start Chatting
            </button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 mt-20 py-10 relative z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-white/50">© 2026 Codebase. Built for developers.</p>
        </div>
      </footer>
    </div>
  );
}

