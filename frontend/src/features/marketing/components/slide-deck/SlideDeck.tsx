import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { tween } from "@/core/motion/astryx-motion";
import styles from "./slide-deck.module.css";

/* The slide layer is absolutely positioned inside the viewport and cross-fades on change. */
const MotionVStack = motion.create(VStack);

/*
 * The deck's two fixed bands. Both are past the top of Astryx's spacing scale (which stops at
 * 48px), so they ride the stacks' own size props — SizeValue is explicit that "numbers are
 * treated as pixels" — instead of sitting as raw px in the stylesheet.
 */
const THUMBNAIL_RAIL_WIDTH = 180;
const NOTES_HEIGHT = 90;

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
  // Spring has no Astryx token (motion is tween-only) — documented exception.
  x: { type: "spring" as const, stiffness: 400, damping: 32 },
  opacity: tween("fast"),
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
    <VStack height="100%" className={styles.deck}>
      {topBar && (
        <HStack
          gap={2}
          align="center"
          justify="end"
          paddingBlock={2}
          paddingInline={4}
          className={styles.topBar}
        >
          {topBar}
        </HStack>
      )}

      <HStack className={styles.body}>
        {/* Slide thumbnails panel */}
        <VStack
          width={THUMBNAIL_RAIL_WIDTH}
          padding={3}
          gap={2}
          isScrollable
          className={styles.thumbnails}
        >
          {slides.map((slide, idx) => (
            /*
             * The thumbnail is a real <button> — an Astryx stack rendered `as="button"`, which
             * keeps the click target, the keyboard focus and the data-selected hook intact
             * without reaching for a raw element.
             */
            <VStack
              as="button"
              key={slide.id}
              gap={0.5}
              width="100%"
              onClick={() => goTo(idx)}
              className={styles.thumbnail}
              data-selected={idx === current ? "true" : undefined}
            >
              <HStack align="center" justify="center" className={styles.thumbnailFrame}>
                <Text type="supporting" size="2xs">
                  {idx + 1}
                </Text>
              </HStack>
              <HStack paddingInline={0.5} className={styles.thumbnailLabel}>
                <Text type="supporting" size="2xs" display="block" maxLines={1}>
                  {slide.title}
                </Text>
              </HStack>
            </VStack>
          ))}
        </VStack>

        {/* Slide content */}
        <VStack className={styles.stage}>
          <VStack className={styles.slideViewport}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <MotionVStack
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
              </MotionVStack>
            </AnimatePresence>
          </VStack>

          {/* Presenter notes */}
          <VStack
            height={NOTES_HEIGHT}
            paddingBlock={2}
            paddingInline={4}
            isScrollable
            className={styles.notes}
          >
            <Text
              type="supporting"
              size="2xs"
              color="disabled"
              display="block"
              className={styles.notesLabel}
            >
              {notesLabel}
            </Text>
            <Text type="supporting" size="xsm" display="block">
              {slides[current].notes}
            </Text>
          </VStack>

          {/* Bottom navigation */}
          <HStack
            gap={2}
            align="center"
            justify="end"
            paddingBlock={2}
            paddingInline={4}
            className={styles.navigation}
          >
            {/* Astryx's Button sizes its icon slot to 16px ("Matches Icon sizing: sm/md=16px"),
                so the mark goes in as an `Icon size="sm"` — a bare lucide element would render at
                lucide's own 24px default and overflow the slot. */}
            <Button
              variant="secondary"
              size="sm"
              icon={<Icon icon={ChevronLeft} size="sm" />}
              label={prevLabel}
              isDisabled={current === 0}
              onClick={goPrev}
            />
            {/* The counter keeps a 3ch floor so the nav does not jitter as the index grows. */}
            <HStack justify="center" className={styles.counter}>
              <Text color="secondary">
                {current + 1} / {slides.length}
              </Text>
            </HStack>
            <Button
              variant="primary"
              size="sm"
              endContent={<Icon icon={ChevronRight} size="sm" />}
              label={nextLabel}
              isDisabled={current === slides.length - 1}
              onClick={goNext}
            />
          </HStack>
        </VStack>
      </HStack>
    </VStack>
  );
}
