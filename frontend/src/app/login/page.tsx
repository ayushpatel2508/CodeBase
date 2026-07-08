"use client";

import Image from "next/image";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  IconMessageChatbot,
  IconFileCode,
  IconRocket,
  IconBrandGithub,
  IconArrowRight,
} from "@tabler/icons-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const features = [
  {
    icon: <IconFileCode size={20} className="text-neutral-600" />,
    title: "Repo Tree Parsing",
    desc: "Automatically parse any GitHub repository into a navigable tree structure.",
  },
  {
    icon: <IconMessageChatbot size={20} className="text-neutral-600" />,
    title: "Context-Aware Chat",
    desc: "Ask questions and get precise answers grounded in the actual codebase.",
  },
  {
    icon: <IconRocket size={20} className="text-neutral-600" />,
    title: "Instant Onboarding",
    desc: "Paste a URL and start chatting in seconds. No complex setup needed.",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setPasswordError("");
    
    // Client-side validation
    let hasError = false;
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    }

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      hasError = true;
    } else if (password.length > 24) {
      setPasswordError("Password must be less than 24 characters.");
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      if (isRegister) {

        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });

        if (!res.ok) {
          const data = await res.json();
          // Fix React object child error by stringifying Pydantic 422 errors
          if (Array.isArray(data.detail)) {
            setError(data.detail.map((err: any) => err.msg).join(", "));
          } else {
            setError(data.detail || "Registration failed");
          }
          setLoading(false);
          return;
        }


      }


      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-[#fafafa] overflow-hidden">

      {/* ─── Left Side: Form ─── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 lg:px-20 py-12">

        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10 cursor-pointer hover:opacity-80 transition-opacity w-fit">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-sm border border-neutral-200">
            <Image src="/logo.png" alt="Codebase Logo" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900 drop-shadow-sm">
            Codebase
          </span>
        </Link>

        {/* Heading */}
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2 text-center">
            {isRegister ? "Create an account" : "Welcome back"}
          </h1>
          <p className="text-sm text-neutral-500 mb-8 text-center">
            {isRegister
              ? "Sign up to start chatting with any codebase"
              : "Sign in to continue to your workspace"}
          </p>
        </div>

        {/* Form Card */}
        <div className="max-w-md w-full">

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-4 mb-6" noValidate>
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all duration-200"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                placeholder="Enter your email"
                className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-neutral-200 focus:ring-neutral-900'}`}
              />
              {emailError && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{emailError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Enter your password"
                className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${passwordError ? 'border-red-500 focus:ring-red-500' : 'border-neutral-200 focus:ring-neutral-900'}`}
              />
              {passwordError && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{passwordError}</p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-neutral-900 text-white font-medium text-sm hover:bg-neutral-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {isRegister ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                <>
                  {isRegister ? "Create Account" : "Sign In"}
                  <IconArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="text-center mb-6">
            <p className="text-sm text-neutral-500">
              {isRegister
                ? "Already have an account?"
                : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
                className="font-medium text-neutral-900 hover:underline cursor-pointer"
              >
                {isRegister ? "Sign in" : "Create one"}
              </button>
            </p>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#fafafa] px-3 text-neutral-400 uppercase tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* GitHub OAuth */}
          <button
            onClick={() => signIn("github", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white border border-neutral-200 text-neutral-900 font-medium text-sm hover:bg-neutral-50 transition-colors duration-200 cursor-pointer shadow-sm"
          >
            <IconBrandGithub size={20} />
            GitHub
          </button>

          <p className="text-xs text-neutral-400 mt-6">
            By signing in, you agree to let Codebase read public repositories.
          </p>
        </div>
      </div>

      {/* ─── Right Side: Promotional Panel ─── */}
      <div className="hidden lg:flex w-1/2 bg-neutral-900 flex-col justify-center items-center px-16 relative overflow-hidden">

        {/* Dotted background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <div className="relative z-10 max-w-md text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-4">
            Talk to any codebase,<br />
            <span className="text-neutral-400">instantly.</span>
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Paste a GitHub repository URL and start asking questions about the code, architecture, and dependencies — powered by AI with full context awareness.
          </p>
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="animate-spin h-8 w-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
