"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconChevronRight,
  IconFolder,
  IconFileText,
  IconCheck,
  IconSearch,
  IconRobot,
} from "@tabler/icons-react";

// 1. Repo Tree Mockup
export const RepoTreeMockup = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full h-full bg-[#1e1e2e] rounded-xl overflow-hidden border border-neutral-800 flex flex-col font-sans shadow-2xl group-hover:border-neutral-600 transition-colors">
      {/* Mac Window Header */}
      <div className="h-8 bg-[#181825] border-b border-neutral-800 flex items-center px-3 gap-1.5 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
      </div>
      {/* Body */}
      <div className="flex-1 p-5 flex flex-col items-start justify-start overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors cursor-pointer text-sm font-mono w-full text-left outline-none"
        >
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} className="shrink-0 text-neutral-500">
            <IconChevronRight size={16} />
          </motion.div>
          <IconFolder size={16} className="text-blue-400 shrink-0" />
          <span>src</span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden ml-6 mt-3 flex flex-col gap-3 font-mono text-sm"
            >
              <div className="flex items-center gap-2 text-neutral-400">
                <IconFolder size={16} className="text-amber-400 shrink-0" />
                <span>components</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400 ml-6">
                <IconFileText size={16} className="text-emerald-400 shrink-0" />
                <span>button.tsx</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400 ml-6">
                <IconFileText size={16} className="text-emerald-400 shrink-0" />
                <span>card.tsx</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <IconFolder size={16} className="text-amber-400 shrink-0" />
                <span>app</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400 ml-6">
                <IconFileText size={16} className="text-indigo-400 shrink-0" />
                <span>page.tsx</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Call to action if closed */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 ml-6 text-xs text-neutral-500 flex items-center gap-2"
            >
              <span className="animate-pulse">👈</span> Click &apos;src&apos; to expand
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// 2. Fast Onboarding Mockup
export const OnboardingMockup = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center p-6">
      <div className="w-full max-w-[260px] bg-white rounded-xl shadow-xl border border-neutral-200/60 overflow-hidden">
        <div className="p-3 flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/50">
          <IconSearch size={16} className="text-neutral-400 shrink-0" />
          <div className="h-5 w-full bg-neutral-100 rounded overflow-hidden relative">
            {step > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-neutral-300"
              />
            )}
          </div>
        </div>
        <div className="p-6 flex flex-col items-center justify-center min-h-[140px] relative">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-neutral-400 text-sm font-medium">Waiting for Repo...</motion.div>
            )}
            {step === 1 && (
              <motion.div key="parse" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-orange-500 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Cloning & Parsing...</span>
              </motion.div>
            )}
            {step >= 2 && (
              <motion.div key="done" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-emerald-500 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <IconCheck size={24} />
                </div>
                <span className="text-sm font-bold text-neutral-800">Index Built!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// 3. Chat Interface Mockup
export const ChatMockup = () => {
  const [showResponse, setShowResponse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowResponse((prev) => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-cyan-100 rounded-xl flex items-center justify-center p-6 md:p-8">
      <div className="w-full h-full bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-neutral-100 flex items-center px-4 gap-2 bg-neutral-50/80 shrink-0">
          <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
            <IconRobot size={16} className="text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-neutral-700">Codebase AI</span>
        </div>
        {/* Chat Area */}
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden relative bg-[#fafafa]">
          {/* User Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="self-end bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md"
          >
            Where is the authentication logic?
          </motion.div>
          
          {/* AI Response */}
          <AnimatePresence>
            {showResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="self-start bg-white text-neutral-700 text-sm px-4 py-3.5 rounded-2xl rounded-tl-sm max-w-[90%] border border-neutral-200 shadow-md"
              >
                <div className="mb-3 font-medium">I found the auth logic here:</div>
                <div className="bg-[#1e1e2e] text-blue-300 font-mono text-xs p-3 rounded-lg leading-relaxed shadow-inner">
                  <span className="text-pink-400">export</span>{" "}
                  <span className="text-blue-400">const</span> GET = Auth(...)
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
