import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import styles from "./slide-deck.module.css";

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
    <div className={styles.deck}>
      {topBar && <div className={styles.topBar}>{topBar}</div>}

      <div className={styles.body}>
        {/* Slide thumbnails panel */}
        <div className={styles.thumbnails}>
          {slides.map((slide, idx) => (
            <button
              type="button"
              key={slide.id}
              onClick={() => goTo(idx)}
              className={styles.thumbnail}
              data-selected={idx === current ? "true" : undefined}
            >
              <div className={styles.thumbnailFrame}>
                <Text type="supporting" size="2xs">
                  {idx + 1}
                </Text>
              </div>
              <div className={styles.thumbnailLabel}>
                <Text type="supporting" size="2xs" display="block" maxLines={1}>
                  {slide.title}
                </Text>
              </div>
            </button>
          ))}
        </div>

        {/* Slide content */}
        <div className={styles.stage}>
          <div className={styles.slideViewport}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className={styles.slideLayer}
              >
                <CurrentSlide />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Presenter notes */}
          <div className={styles.notes}>
            <div className={styles.notesLabel}>
              <Text type="supporting" size="2xs" color="disabled" display="block">
                {notesLabel}
              </Text>
            </div>
            <Text type="supporting" size="xsm" display="block">
              {slides[current].notes}
            </Text>
          </div>

          {/* Bottom navigation */}
          <div className={styles.navigation}>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft />}
              label={prevLabel}
              isDisabled={current === 0}
              onClick={goPrev}
            />
            <div className={styles.counter}>
              <Text color="secondary">
                {current + 1} / {slides.length}
              </Text>
            </div>
            <Button
              variant="primary"
              size="sm"
              endContent={<ChevronRight />}
              label={nextLabel}
              isDisabled={current === slides.length - 1}
              onClick={goNext}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
