import { StackItem } from "@astryxdesign/core/Stack";
import { VStack } from "@astryxdesign/core/VStack";
import { useRef } from "react";
import { Outlet } from "react-router-dom";
import { SkipLink } from "@/core/a11y/skip-link";
import { useFocusOnRouteChange } from "@/core/routing/use-focus-on-route-change";
import styles from "./root-layout.module.css";

const MAIN_ID = "main-content";

/*
 * The outermost frame is a VStack, not a div. Astryx's AppShell owns *page* structure and
 * assumes a TopNav/SideNav frame; the apex of this app is a virtual desktop, so the root is a
 * bare vertical stack and each router decides what fills it.
 *
 * Both stacks carry their values as props, not CSS: `minHeight="100vh"` because Stack's
 * SizeValue takes strings as-is, and the flex column is what a VStack *is*. `as="main"` is
 * Astryx's documented polymorphic escape hatch (`as?: ElementType`) — it keeps the real <main>
 * landmark, and with it the id, tabIndex and ref that SkipLink and useFocusOnRouteChange
 * depend on, while the stack supplies the layout.
 *
 * The grow is a `StackItem size="fill"`, which is Astryx's documented answer for "this item takes
 * the leftover space". StackItem is a flex *item* and <main> must also be a flex *container*, so
 * the two compose rather than merge: StackItem carries the grow, the VStack inside it carries the
 * column. That is what let `flex: 1` leave the stylesheet entirely.
 */
export function RootLayout() {
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnRouteChange(mainRef);

  return (
    <VStack minHeight="100vh">
      <SkipLink targetId={MAIN_ID} />
      <StackItem size="fill">
        <VStack
          as="main"
          height="100%"
          id={MAIN_ID}
          ref={mainRef}
          tabIndex={-1}
          className={styles.main}
        >
          <Outlet />
        </VStack>
      </StackItem>
    </VStack>
  );
}
