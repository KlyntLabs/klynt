/**
 * Popover API shim for jsdom.
 *
 * jsdom ships the UA stylesheet rule `[popover] { display: none }` but implements none of
 * the Popover JS API. Astryx's Layer (used by DropdownMenu, Popover, Tooltip, and every
 * portalled surface) calls `el.showPopover()` when it exists and otherwise falls back to
 * setting `style.display`. So in plain jsdom the fallback runs and popovers are *always*
 * visible: `getByRole("menu")` matches whether the menu is open or closed, and outside-click
 * light-dismiss never happens at all. Tests don't merely fail — they pass against closed
 * menus, which is worse.
 *
 * This shim gives jsdom the parts of the API that tests can actually observe: show/hide
 * (overriding the UA `display: none` with an inline style), `toggle` events, `:popover-open`
 * matching, and outside-click light-dismiss. Astryx's migration guide anticipates this:
 * "verify settings popovers and dialogs in jsdom and in a real browser because native dialog
 * and Popover APIs may need test shims".
 *
 * Real light-dismiss, focus handling and stacking are the browser's job and are verified
 * there (Storybook browser project / manual passes), not here.
 */

const OPEN_ATTR = "data-popover-open";

function fireToggle(el: HTMLElement, newState: "open" | "closed") {
  el.dispatchEvent(
    Object.assign(new Event("toggle"), {
      oldState: newState === "open" ? "closed" : "open",
      newState,
    })
  );
}

function show(el: HTMLElement) {
  if (el.hasAttribute(OPEN_ATTR)) return;
  el.setAttribute(OPEN_ATTR, "");
  // Beat jsdom's UA `[popover] { display: none }` — in a real browser this is what the
  // `:popover-open` UA rule does for us.
  el.style.display = "block";
  fireToggle(el, "open");
}

function hide(el: HTMLElement) {
  if (!el.hasAttribute(OPEN_ATTR)) return;
  el.removeAttribute(OPEN_ATTR);
  el.style.display = "none";
  fireToggle(el, "closed");
}

// `typeof` rather than `in`: TypeScript's lib.dom declares showPopover, so an `in` guard
// narrows the prototype to `never` in the branch we actually want to write to.
if (typeof HTMLElement.prototype.showPopover !== "function") {
  HTMLElement.prototype.showPopover = function (this: HTMLElement) {
    show(this);
  };
  HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
    hide(this);
  };
  HTMLElement.prototype.togglePopover = function (this: HTMLElement, force?: boolean) {
    const next = force ?? !this.hasAttribute(OPEN_ATTR);
    if (next) show(this);
    else hide(this);
    return next;
  };

  // jsdom's selector engine does not know `:popover-open`. Rewrite it to the attribute we
  // maintain above and delegate, so compound and negated forms (`[popover]:not(:popover-open)`)
  // stay correct — special-casing the substring instead would invert them.
  const rewrite = (selector: string) => selector.replace(/:popover-open/g, `[${OPEN_ATTR}]`);

  const nativeMatches = Element.prototype.matches;
  Element.prototype.matches = function (this: Element, selector: string) {
    return nativeMatches.call(this, rewrite(selector));
  } as typeof Element.prototype.matches;
  const nativeClosest = Element.prototype.closest;
  Element.prototype.closest = function (this: Element, selector: string) {
    return nativeClosest.call(this, rewrite(selector));
  } as typeof Element.prototype.closest;
  for (const proto of [Document.prototype, Element.prototype, DocumentFragment.prototype]) {
    const qs = proto.querySelector;
    const qsa = proto.querySelectorAll;
    proto.querySelector = function (this: ParentNode, selector: string) {
      return qs.call(this, rewrite(selector));
    };
    proto.querySelectorAll = function (this: ParentNode, selector: string) {
      return qsa.call(this, rewrite(selector));
    };
  }

  // Light-dismiss: a pointerdown outside an open popover closes it, which is what fires the
  // `toggle` event Astryx's Layer listens for to sync its React state back.
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target as Element | null;
      for (const el of document.querySelectorAll(`[popover][${OPEN_ATTR}]`)) {
        if (!(el instanceof HTMLElement)) continue;
        if (target && el.contains(target)) continue;
        hide(el);
      }
    },
    true
  );
}

export {};
