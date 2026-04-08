"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

// Onboarding slides data
const slides = [
  {
    id: 1,
    title: "AI-Powered Coding",
    subtitle: "Write code with natural language",
    description: "Describe what you want to build, and our AI agent will write, edit, and refactor code for you.",
    color: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/20",
  },
  {
    id: 2,
    title: "Visual Editor",
    subtitle: "Click to inspect, drag to move",
    description: "Select any element in the preview to edit its styles, move components around, and see changes in real-time.",
    color: "from-blue-500 to-cyan-500",
    bgGlow: "bg-blue-500/20",
  },
  {
    id: 3,
    title: "Design System",
    subtitle: "Extract tokens from Figma",
    description: "Connect your Figma files to automatically extract colors, typography, and spacing into your codebase.",
    color: "from-pink-500 to-rose-500",
    bgGlow: "bg-pink-500/20",
  },
  {
    id: 4,
    title: "Live Preview",
    subtitle: "Instant feedback loop",
    description: "See your changes instantly with hot reload. No more switching between editor and browser.",
    color: "from-amber-500 to-orange-500",
    bgGlow: "bg-amber-500/20",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [showInitialAnimation, setShowInitialAnimation] = useState(true);
  const isUnmountedRef = useRef(false);

  // Track mount/unmount for hydration and cleanup
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  // Check if already logged in - if so, go directly to workspace
  useEffect(() => {
    const checkAuth = async () => {
      let isLoggedIn = false;

      // 1. Check Electron session first (IPC-based, not cookie-based)
      const ea = (window as unknown as { electronAgent?: {
        getSavedSession?: () => Promise<unknown>;
        navigateTo?: (path: string) => Promise<boolean>;
      } }).electronAgent;
      if (ea?.getSavedSession) {
        try {
          const saved = await ea.getSavedSession();
          if (saved) {
            console.log("[Onboarding] Electron session found on mount, redirecting to workspace");
            isLoggedIn = true;
          }
        } catch {
          // No Electron session
        }
      }

      // 2. Check web session (cookie-based) if not in Electron or no Electron session
      if (!isLoggedIn) {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok && !isUnmountedRef.current) {
            const data = await res.json();
            if (data.user) {
              console.log("[Onboarding] Web session found on mount, redirecting to workspace");
              isLoggedIn = true;
            }
          }
        } catch {
          // Not logged in via web
        }
      }

      // 3. Redirect if logged in
      if (isLoggedIn && !isUnmountedRef.current) {
        // Use Electron IPC navigation to bypass client-side routing
        if (ea?.navigateTo) {
          const navigateTo = (ea as unknown as { navigateTo: (path: string) => Promise<boolean> }).navigateTo;
          await navigateTo("/project/workspace");
        } else {
          router.replace("/project/workspace");
        }
      }
    };
    checkAuth();
  }, [router]);

  // Initial slide-up animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialAnimation(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = useCallback(async () => {
    setIsExiting(true);

    // Check if user is already logged in (Electron or Web)
    let isLoggedIn = false;

    // Check Electron session
    const ea = (window as unknown as { electronAgent?: {
      getSavedSession?: () => Promise<unknown>;
      navigateTo?: (path: string) => Promise<boolean>;
    } }).electronAgent;
    if (ea?.getSavedSession) {
      try {
        const saved = await ea.getSavedSession();
        if (saved) {
          console.log("[Onboarding] Electron session found, will redirect to workspace");
          isLoggedIn = true;
        }
      } catch {
        // No session
      }
    }

    // Check web session if not Electron
    if (!isLoggedIn) {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            console.log("[Onboarding] Web session found, will redirect to workspace");
            isLoggedIn = true;
          }
        }
      } catch {
        // No session
      }
    }

    // Navigate after exit animation
    setTimeout(async () => {
      console.log("[Onboarding] setTimeout fired, isUnmounted:", isUnmountedRef.current, "pathname:", window.location.pathname, "isLoggedIn:", isLoggedIn);
      if (!isUnmountedRef.current && window.location.pathname === "/onboarding") {
        const target = isLoggedIn ? "/project/workspace" : "/login";
        console.log("[Onboarding] Navigating to", target);

        // Use Electron IPC navigation if available (bypasses client-side routing)
        if (ea?.navigateTo) {
          const navigateTo = (ea as unknown as { navigateTo: (path: string) => Promise<boolean> }).navigateTo;
          await navigateTo(target);
        } else {
          window.location.href = target;
        }
      } else {
        console.log("[Onboarding] Skipping navigation - already moved away or unmounted");
      }
    }, 600);
  }, [router]);

  const goToNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    } else {
      // Last slide - navigate to dashboard with exit animation
      handleComplete();
    }
  }, [currentSlide, handleComplete]);

  const goToPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Escape") {
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, handleSkip]);

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  // Slide animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A]" />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 bg-[#0A0A0A] overflow-hidden"
      initial={{ x: 0, opacity: 1 }}
      animate={isExiting ? {
        x: -300,
        opacity: 0,
      } : { x: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.5,
      }}
    >
      {/* Background gradient glow */}
      <motion.div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full ${slide.bgGlow} blur-[120px] opacity-40`}
        key={slide.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* Main content with initial slide-up animation */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: showInitialAnimation ? 0 : 1, y: showInitialAnimation ? 60 : 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >

        {/* Skip button */}
        <motion.button
          onClick={handleSkip}
          className="absolute top-8 right-8 text-[14px] text-white/40 hover:text-white/70 transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Skip intro
        </motion.button>

        {/* Slide content */}
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
              }}
              className="flex flex-col items-center text-center"
            >
              {/* Logo */}
              <motion.div
                className="mb-10"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                <Image
                  src="/meld-logo.svg"
                  alt="Meld"
                  width={100}
                  height={100}
                  className="rounded-2xl shadow-2xl"
                />
              </motion.div>

              {/* Title */}
              <motion.h1
                className="text-[44px] font-bold text-white tracking-[-0.02em] mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {slide.title}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className={`text-[20px] font-medium bg-gradient-to-r ${slide.color} bg-clip-text text-transparent mb-5`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {slide.subtitle}
              </motion.p>

              {/* Description */}
              <motion.p
                className="text-[18px] text-white/60 leading-relaxed max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {slide.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress indicators */}
        <motion.div
          className="flex items-center gap-2 mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentSlide ? 1 : -1);
                setCurrentSlide(index);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? `w-8 bg-gradient-to-r ${slide.color}`
                  : "w-2 bg-white/20 hover:bg-white/30"
              }`}
            />
          ))}
        </motion.div>

        {/* Navigation buttons */}
        <motion.div
          className="flex items-center justify-center gap-4 mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Back button - hidden on last slide */}
          {currentSlide > 0 && !isLastSlide && (
            <motion.button
              onClick={goToPrev}
              className="px-6 py-3 rounded-xl text-[15px] font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Back
            </motion.button>
          )}

          {/* Next / Get Started button */}
          <motion.button
            onClick={goToNext}
            className="group flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[15px] font-semibold transition-all bg-white text-[#0A0A0A] hover:bg-white/90 hover:scale-[1.02]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLastSlide ? (
              <>
                Get Started
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Keyboard hint */}
        <motion.p
          className="absolute bottom-8 text-[13px] text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Press <kbd className="px-2 py-0.5 rounded bg-white/10 text-white/50 mx-1">→</kbd> to continue
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
