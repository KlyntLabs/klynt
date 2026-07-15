import { useEffect, useState } from "react";

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
   * whatever Text or Heading renders it. The blinking caret is gone: an ambient infinite loop is
   * a flourish Astryx's motion model doesn't express.
   */
  return <>{displayed}</>;
}
