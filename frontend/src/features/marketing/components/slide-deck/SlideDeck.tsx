import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export interface Slide {
  id: string | number;
  title: string;
  render: () => React.JSX.Element;
  notes: string;
}

interface SlideDeckProps {
  slides: Slide[];
  topBar?: React.ReactNode;
  notesLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 30 : -30 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -30 : 30 }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 400, damping: 32 },
  opacity: { duration: 0.2 },
};

export function SlideDeck({
  slides,
  topBar,
  notesLabel = "Notes",
  prevLabel = "Previous",
  nextLabel = "Next",
}: SlideDeckProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= slides.length) return;
      setDirection(idx > current ? 1 : -1);
      setCurrent(idx);
    },
    [current, slides.length]
  );

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(slides.length - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, goTo, slides.length]);

  const CurrentSlide = slides[current].render;

  return (
    <div className="flex flex-col h-full select-none">
      {topBar && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-[#E5E5E5] bg-white gap-2 shrink-0">
          {topBar}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Slide thumbnails panel */}
        <div className="w-[180px] shrink-0 bg-[#F5F3EF] border-r border-[#E5E5E5] overflow-y-auto p-3">
          {slides.map((slide, idx) => (
            <button
              type="button"
              key={slide.id}
              onClick={() => goTo(idx)}
              className={`w-full mb-2 text-left group ${
                idx === current ? "ring-2 ring-[#F76E18] rounded" : ""
              }`}
            >
              <div
                className={`w-full aspect-[4/3] rounded border bg-white relative overflow-hidden transition-opacity ${
                  idx === current
                    ? "border-[#F76E18] shadow-sm"
                    : "border-[#D1D1D1] opacity-70 group-hover:opacity-100"
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center p-1">
                  <span className="text-[10px] text-[#9CA3AF]">{idx + 1}</span>
                </div>
              </div>
              <p className="text-[10px] text-[#6B6B6B] truncate mt-0.5 px-0.5">{slide.title}</p>
            </button>
          ))}
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0"
              >
                <CurrentSlide />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Presenter notes */}
          <div className="shrink-0 h-[90px] bg-[#FAFAF8] border-t border-[#E5E5E5] px-4 py-2.5 overflow-y-auto">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">{notesLabel}</p>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">{slides[current].notes}</p>
          </div>

          {/* Bottom navigation */}
          <div className="shrink-0 flex items-center justify-end px-4 py-2 border-t border-[#E5E5E5] bg-white gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={current === 0}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-[#D1D1D1] hover:bg-[#F5F3EF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> {prevLabel}
            </button>
            <span className="text-sm text-[#6B6B6B] min-w-[3ch] text-center">
              {current + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={current === slides.length - 1}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {nextLabel} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
