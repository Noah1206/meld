import { useState } from "react";
import { Github, Blend, ArrowRight, Check } from "lucide-react";

interface LoginPageProps {
  onLogin: (rememberMe: boolean) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [pressing, setPressing] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="animate-scale-in w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Blend className="h-4 w-4 text-white" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A1A]">Meld</span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            Welcome back
          </h1>
          <p className="mt-2 text-[14px] text-[#787774]">
            Get started with your GitHub account
          </p>
        </div>

        {/* GitHub login button */}
        <button
          onClick={() => onLogin(rememberMe)}
          onMouseDown={() => setPressing(true)}
          onMouseUp={() => setPressing(false)}
          onMouseLeave={() => setPressing(false)}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1A1A1A] px-4 py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#333]"
          style={{ transform: pressing ? "scale(0.98)" : "scale(1)" }}
        >
          <Github className="h-5 w-5" />
          Continue with GitHub
          <ArrowRight className="h-4 w-4 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
        </button>

        {/* Remember me checkbox */}
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
              rememberMe
                ? "border-[#1A1A1A] bg-[#1A1A1A]"
                : "border-[#D4D4D0] bg-white hover:border-[#B4B4B0]"
            }`}
          >
            {rememberMe && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </button>
          <span className="text-[13px] text-[#787774]">Remember me</span>
        </label>

        {/* Terms notice */}
        <p className="mt-6 text-center text-[12px] leading-relaxed text-[#B4B4B0]">
          By continuing, you agree to the{" "}
          <span className="underline underline-offset-2 transition-colors hover:text-[#787774] cursor-pointer">
            Terms of Service
          </span>
          .
          <br />
          Only your public GitHub info will be used.
        </p>
      </div>
    </div>
  );
}
