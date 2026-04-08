"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";

// Tutorial slides with screenshots
const tutorialSlides = [
  {
    id: 1,
    title: "Connect Your Project",
    subtitle: "Start by opening a local folder",
    description: "Click 'Open Local Folder' to select your project directory. Meld will automatically detect the framework and start the dev server.",
    image: "/tutorial/connect-project.png",
    color: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/20",
  },
  {
    id: 2,
    title: "Chat with AI",
    subtitle: "Describe what you want to build",
    description: "Use natural language to tell the AI what you want. It will write, edit, and refactor code for you automatically.",
    image: "/tutorial/chat-ai.png",
    color: "from-blue-500 to-cyan-500",
    bgGlow: "bg-blue-500/20",
  },
  {
    id: 3,
    title: "Visual Editing",
    subtitle: "Click elements to inspect and edit",
    description: "Click any element in the preview to select it. Edit styles, move components, and see changes in real-time.",
    image: "/tutorial/visual-editing.png",
    color: "from-pink-500 to-rose-500",
    bgGlow: "bg-pink-500/20",
  },
  {
    id: 4,
    title: "Review & Apply Changes",
    subtitle: "Approve AI suggestions",
    description: "Review the code changes suggested by AI. Accept to apply them to your codebase, or reject to try a different approach.",
    image: "/tutorial/review-changes.png",
    color: "from-amber-500 to-orange-500",
    bgGlow: "bg-amber-500/20",
  },
];

export default function TutorialPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Fix hydration mismatch
  useEffect(() => {
    console.log("[Tutorial] Page mounted");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => {
      console.log("[Tutorial] Page unmounting");
    };
  }, []);

  // Check if tutorial already completed - skip to workspace
  // TEMPORARILY DISABLED to debug redirect issue
  // useEffect(() => {
  //   if (!mounted) return;
  //   const tutorialCompleted = localStorage.getItem("meld-tutorial-completed");
  //   if (tutorialCompleted === "true") {
  //     window.location.href = "/project/workspace";
  //   }
  // }, [mounted]);

  const handleComplete = useCallback(async () => {
    console.log("[Tutorial] handleComplete called");
    setIsExiting(true);
    // Mark tutorial as completed
    if (typeof window !== "undefined") {
      localStorage.setItem("meld-tutorial-completed", "true");
    }

    // Navigate to workspace after animation
    // Tutorial is only accessible after login, so no auth check needed here
    setTimeout(async () => {
      console.log("[Tutorial] Navigating to workspace");
      const target = "/project/workspace";

      // Use Electron IPC to navigate (bypasses client-side routing completely)
      const ea = (window as unknown as { electronAgent?: { navigateTo?: (path: string) => Promise<boolean> } }).electronAgent;
      if (ea?.navigateTo) {
        console.log("[Tutorial] Using Electron IPC navigateTo");
        await ea.navigateTo(target);
      } else {
        // Fallback for web: use window.location
        console.log("[Tutorial] Using window.location.href");
        window.location.href = target;
      }
    }, 600);
  }, []);

  const goToNext = useCallback(() => {
    if (currentSlide < tutorialSlides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    } else {
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

  const slide = tutorialSlides[currentSlide];
  const isLastSlide = currentSlide === tutorialSlides.length - 1;

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

  if (!mounted) {
    return <div className="fixed inset-0 bg-[#0A0A0A]" />;
  }

  return (
    <motion.div
      className="fixed inset-0 bg-[#0A0A0A] overflow-hidden"
      initial={{ x: 0, opacity: 1 }}
      animate={isExiting ? { x: -300, opacity: 0 } : { x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.5 }}
    >
      {/* Background gradient glow */}
      <motion.div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full ${slide.bgGlow} blur-[150px] opacity-30`}
        key={slide.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Skip button */}
        <motion.button
          onClick={handleSkip}
          className="absolute top-8 right-8 text-[14px] text-white/40 hover:text-white/70 transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Skip tutorial
        </motion.button>

        {/* Slide content */}
        <div className="w-full max-w-4xl">
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
              className="flex flex-col items-center"
            >
              {/* Screenshot - on top, pops up from bottom */}
              <motion.div
                className="relative w-full max-w-3xl aspect-video mb-8 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl shadow-black/30"
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  delay: 0.1
                }}
              >
                {/* Placeholder for screenshot - replace with actual images */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${slide.color} flex items-center justify-center`}>
                      <span className="text-3xl font-bold text-white">{slide.id}</span>
                    </div>
                    <p className="text-white/40 text-sm">Screenshot: {slide.image}</p>
                  </div>
                </div>
                {/* Uncomment when you have actual images:
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover"
                />
                */}
              </motion.div>

              {/* Text content - below screenshot */}
              <div className="text-center max-w-xl">
                <motion.h1
                  className="text-[36px] font-bold text-white tracking-[-0.02em] mb-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {slide.title}
                </motion.h1>

                <motion.p
                  className={`text-[18px] font-medium bg-gradient-to-r ${slide.color} bg-clip-text text-transparent mb-4`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {slide.subtitle}
                </motion.p>

                <motion.p
                  className="text-[16px] text-white/60 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {slide.description}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress indicators */}
        <motion.div
          className="flex items-center gap-2 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {tutorialSlides.map((_, index) => (
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
          className="flex items-center justify-center gap-4 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Back button - hidden on last slide */}
          {currentSlide > 0 && !isLastSlide && (
            <motion.button
              onClick={goToPrev}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </motion.button>
          )}

          {/* Next / Start Building button */}
          <motion.button
            onClick={goToNext}
            className="group flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[15px] font-semibold transition-all bg-white text-[#0A0A0A] hover:bg-white/90 hover:scale-[1.02]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLastSlide ? "Start Building" : "Next"}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
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
      </div>
    </motion.div>
  );
}
