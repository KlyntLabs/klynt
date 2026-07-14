import { Text } from "@astryxdesign/core/Text";
import { useEffect, useState } from "react";
import styles from "./typewriter-text.module.css";

interface TypewriterTextProps {
  text: string;
  speed?: number;
}

export function TypewriterText({ text, speed = 80 }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayed(text);
      return;
    }

    let delta = speed;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (isDeleting) {
        setDisplayed((prev) => prev.slice(0, -1));
        delta = speed / 2;
      } else {
        setDisplayed((prev) => text.substring(0, prev.length + 1));
        delta = speed;
      }

      if (!isDeleting && displayed === text) {
        delta = 2000;
        setIsDeleting(true);
      } else if (isDeleting && displayed === "") {
        setIsDeleting(false);
        delta = 500;
      }

      timer = setTimeout(tick, delta);
    };

    timer = setTimeout(tick, delta);
    return () => clearTimeout(timer);
  }, [displayed, isDeleting, text, speed]);

  /*
   * A Fragment, not a wrapper element — the typed text is inline content that flows inside
   * whatever Text or Heading renders it.
   *
   * The caret is an Astryx `Text`: `as="span"` renders the inline element and `display="inline"`
   * keeps it in the sentence flow rather than on its own line. `color="inherit"` lets it take the
   * surrounding Text's colour. The stylesheet keeps only the blink keyframe — an animation is
   * behaviour, not a design value, and Astryx has no prop for one.
   */
  return (
    <>
      {displayed}
      <Text as="span" display="inline" color="inherit" className={styles.caret}>
        |
      </Text>
    </>
  );
}
