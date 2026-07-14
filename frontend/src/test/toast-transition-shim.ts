/**
 * CSS-transition shim for Astryx's toast viewport under jsdom.
 *
 * jsdom implements no CSS transitions, so `transitionend` never fires. Astryx's
 * `ToastViewport` drives its exit in two steps: a dismiss marks the toast as exiting (which
 * collapses its `grid-template-rows`), and the toast is only removed from the list when the
 * resulting `transitionend` for `grid-template-rows` arrives. In jsdom that event never
 * arrives, so a dismissed toast animates out visually-never and stays in the DOM forever —
 * `queryByText` keeps matching a toast the user has already closed. That is the same class of
 * problem as `popover-shim.ts`: tests would pass against a state the browser never shows.
 *
 * This shim completes the transition instead of simulating it. It watches the toast wrappers
 * (`[data-toast-id]`, the only elements Astryx transitions this way) for the class change that
 * marks the exit, then dispatches the `transitionend` the browser would have sent a moment
 * later. Nothing else in the tree is touched, and no transition is *started* here — a wrapper
 * that is not exiting has no `onTransitionEnd` handler attached, so a stray event is a no-op.
 *
 * The real animation — its curve, its duration, whether it honours reduced motion — is the
 * browser's job and is verified there, not here.
 */

const TOAST_WRAPPER = "[data-toast-id]";
const TRANSITIONED_PROPERTY = "grid-template-rows";

function completeTransition(element: HTMLElement) {
  // jsdom does not implement the TransitionEvent constructor, and React reads `propertyName`
  // off the event to decide whether this is the transition it is waiting for.
  const event = Object.assign(new Event("transitionend", { bubbles: true }), {
    propertyName: TRANSITIONED_PROPERTY,
  });
  element.dispatchEvent(event);
}

const observer = new MutationObserver((records) => {
  for (const record of records) {
    const element = record.target;
    if (!(element instanceof HTMLElement)) continue;
    if (!element.matches(TOAST_WRAPPER)) continue;
    // Let React commit the exiting class before telling it the transition finished.
    queueMicrotask(() => {
      completeTransition(element);
    });
  }
});

observer.observe(document, {
  subtree: true,
  attributes: true,
  attributeFilter: ["class"],
});

export {};
