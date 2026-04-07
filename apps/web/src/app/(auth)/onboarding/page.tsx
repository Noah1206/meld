"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Blend, Sparkles, Zap, Palette, Code, MousePointerClick,
  ArrowRight, Check,
} from "lucide-react";

// Onboarding slides data
const slides = [
  {
    id: 1,
    icon: Sparkles,
    title: "AI-Powered Coding",
    subtitle: "Write code with natural language",
    description: "Describe what you want to build, and our AI agent will write, edit, and refactor code for you.",
    color: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/20",
  },
  {
    id: 2,
    icon: MousePointerClick,
    title: "Visual Editor",
    subtitle: "Click to inspect, drag to move",
    description: "Select any element in the preview to edit its styles, move components around, and see changes in real-time.",
    color: "from-blue-500 to-cyan-500",
    bgGlow: "bg-blue-500/20",
  },
  {
    id: 3,
    icon: Palette,
    title: "Design System",
    subtitle: "Extract tokens from Figma",
    description: "Connect your Figma files to automatically extract colors, typography, and spacing into your codebase.",
    color: "from-pink-500 to-rose-500",
    bgGlow: "bg-pink-500/20",
  },
  {
    id: 4,
    icon: Zap,
    title: "Live Preview",
    subtitle: "Instant feedback loop",
    description: "See your changes instantly with hot reload. No more switching between editor and browser.",
    color: "from-amber-500 to-orange-500",
    bgGlow: "bg-amber-500/20",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [showInitialAnimation, setShowInitialAnimation] = useState(true);

  // Check if onboarding was already completed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem("meld-onboarding-completed");
      if (completed === "true") {
        router.replace("/project/workspace");
      }
    }
  }, [router]);

  // Initial slide-up animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialAnimation(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const goToNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    } else {
      // Last slide - navigate to dashboard with exit animation
      handleComplete();
    }
  }, [currentSlide]);

  const goToPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  const handleComplete = () => {
    setIsExiting(true);
    // Mark onboarding as completed
    if (typeof window !== "undefined") {
      localStorage.setItem("meld-onboarding-completed", "true");
    }
    // Navigate after exit animation
    setTimeout(() => {
      router.push("/project/workspace");
    }, 600);
  };

  const handleSkip = () => {
    handleComplete();
  };

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
  }, [goToNext, goToPrev]);

  const slide = slides[currentSlide];
  const Icon = slide.icon;
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

  return (
    <motion.div
      className="fixed inset-0 bg-[#0A0A0A] overflow-hidden"
      initial={{ opacity: 1, scale: 1, y: 0 }}
      animate={isExiting ? {
        opacity: 0,
        scale: 0.9,
        y: -50,
        filter: "blur(10px)",
      } : { opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const,
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
        {/* Logo */}
        <motion.div
          className="absolute top-8 left-8 flex items-center gap-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Blend className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold text-white">Meld</span>
        </motion.div>

        {/* Skip button */}
        <motion.button
          onClick={handleSkip}
          className="absolute top-8 right-8 text-[13px] text-white/40 hover:text-white/70 transition-colors"
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
              {/* Icon */}
              <motion.div
                className={`mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${slide.color} shadow-2xl`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                <Icon className="h-10 w-10 text-white" strokeWidth={1.5} />
              </motion.div>

              {/* Title */}
              <motion.h1
                className="text-[32px] font-bold text-white tracking-[-0.02em] mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {slide.title}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className={`text-[16px] font-medium bg-gradient-to-r ${slide.color} bg-clip-text text-transparent mb-4`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {slide.subtitle}
              </motion.p>

              {/* Description */}
              <motion.p
                className="text-[15px] text-white/60 leading-relaxed max-w-sm"
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
          className="flex items-center gap-4 mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Back button */}
          {currentSlide > 0 && (
            <motion.button
              onClick={goToPrev}
              className="px-6 py-3 rounded-xl text-[14px] font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Back
            </motion.button>
          )}

          {/* Next / Get Started button */}
          <motion.button
            onClick={goToNext}
            className={`group flex items-center gap-2 px-8 py-3.5 rounded-xl text-[14px] font-semibold transition-all ${
              isLastSlide
                ? `bg-gradient-to-r ${slide.color} text-white shadow-lg shadow-${slide.color.split("-")[1]}-500/25 hover:shadow-xl hover:scale-[1.02]`
                : "bg-white text-[#0A0A0A] hover:bg-white/90"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLastSlide ? (
              <>
                Get Started
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Keyboard hint */}
        <motion.p
          className="absolute bottom-8 text-[12px] text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 mx-1">→</kbd> to continue
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
