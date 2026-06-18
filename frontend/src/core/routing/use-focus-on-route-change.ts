import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useFocusOnRouteChange(mainRef: React.RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when pathname changes
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    main.focus({ preventScroll: true });
  }, [pathname, mainRef]);
}
