"use client";

import { useState } from "react";
import { X, Github, Mail, Loader2, Blend, Lock } from "lucide-react";
import Link from "next/link";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export function LoginModal({ isOpen, onClose, redirectTo = "/projects" }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState<"github" | "email" | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  if (!isOpen) return null;

  const handleGitHub = () => {
    setIsLoading("github");
    const params = new URLSearchParams();
    params.set("redirect_to", redirectTo);
    params.set("remember_me", rememberMe ? "true" : "false");
    window.location.href = `/api/auth/github?${params.toString()}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="animate-pop-in relative w-full max-w-[420px] mx-4 rounded-2xl bg-[#1A1A1A] p-8 ring-1 ring-white/[0.08] shadow-2xl">
        {/* Header — logo + close */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08]">
            <Blend className="h-5 w-5 text-white" />
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        <div className="mb-8">
          <p className="text-[20px] text-[#888]">Start building.</p>
          <h2 className="text-[26px] font-bold text-white">Log in to your account</h2>
        </div>

        {/* GitHub login */}
        <button
          onClick={handleGitHub}
          disabled={isLoading !== null}
          className="no-hover-fill flex w-full items-center rounded-xl border border-white/[0.12] px-5 py-4 text-[15px] font-medium text-white transition-all hover:bg-white/[0.06] hover:border-white/[0.18] active:scale-[0.98] disabled:opacity-50"
        >
          <Github className="h-5 w-5 mr-4" />
          {isLoading === "github" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Continue with GitHub"}
        </button>

        {/* Remember me */}
        <label className="mt-5 flex items-center gap-3 cursor-pointer group">
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className={`no-hover-fill flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-200 ${
              rememberMe
                ? "border-purple-500 bg-purple-600"
                : "border-white/[0.2] bg-white/[0.04] group-hover:border-white/[0.3]"
            }`}
          >
            {rememberMe && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 6L5 8.5L9.5 3.5" />
              </svg>
            )}
          </button>
          <span className="text-[14px] text-[#ccc] group-hover:text-white transition-colors">Keep me signed in</span>
        </label>

        {/* Divider */}
        <div className="my-7 flex items-center gap-4">
          <div className="flex-1 border-t border-white/[0.1]" />
          <span className="text-[12px] font-medium text-[#777]">OR</span>
          <div className="flex-1 border-t border-white/[0.1]" />
        </div>

        {/* Email */}
        <button
          disabled={isLoading !== null}
          className="no-hover-fill flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-5 py-4 text-[15px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#F0F0F0] active:scale-[0.98] disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          Continue with email
        </button>

        {/* Footer */}
        <div className="mt-7 flex items-center gap-2.5 text-[13px] text-[#777]">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            By continuing, you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-white transition-colors">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-white transition-colors">Privacy Policy</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
