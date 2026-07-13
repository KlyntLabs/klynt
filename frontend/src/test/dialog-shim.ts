/**
 * Native <dialog> shim for jsdom.
 *
 * jsdom renders the <dialog> element but implements neither `showModal()` nor `close()`.
 * Astryx's Dialog (and therefore AlertDialog, and every modal built on them) renders a real
 * <dialog> and calls `showModal()` to open it. In plain jsdom that call is a no-op at best,
 * so the dialog never gains its `open` attribute, stays hidden from the accessibility tree,
 * and `getByRole("alertdialog")` can never find it — no Astryx modal is testable at all.
 *
 * This mirrors src/test/popover-shim.ts: give jsdom the parts of the API tests can observe
 * (open/close state, `::backdrop`-less visibility, the `close` and `cancel` events, and
 * Escape-to-dismiss), and leave focus trapping and the top layer to real browsers, where
 * they are verified.
 */

function setOpen(dialog: HTMLDialogElement, isOpen: boolean) {
  if (isOpen) dialog.setAttribute("open", "");
  else dialog.removeAttribute("open");
}

if (typeof HTMLDialogElement !== "undefined") {
  const proto = HTMLDialogElement.prototype;

  if (typeof proto.showModal !== "function") {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      setOpen(this, true);
    };
  }

  if (typeof proto.show !== "function") {
    proto.show = function show(this: HTMLDialogElement) {
      setOpen(this, true);
    };
  }

  if (typeof proto.close !== "function") {
    proto.close = function close(this: HTMLDialogElement, returnValue?: string) {
      if (!this.hasAttribute("open")) return;
      if (returnValue !== undefined) this.returnValue = returnValue;
      setOpen(this, false);
      this.dispatchEvent(new Event("close"));
    };
  }

  // Escape dismissal is a native behaviour of modal dialogs; Astryx relies on it rather than
  // wiring its own key handler, so without this an "escape closes the dialog" test would fail
  // against a component that behaves correctly in a browser.
  //
  // Two details make this faithful rather than merely convenient:
  //
  // 1. `cancel` must be CANCELABLE, and a prevented default must leave the dialog open.
  //    Astryx's Dialog always calls preventDefault() on cancel and then decides for itself
  //    whether to close, via onOpenChange -> React state -> close(). For purpose="required"
  //    (ConflictDialog) it deliberately refuses. A shim that force-closes regardless makes a
  //    deliberately non-dismissible dialog dismissible in jsdom only — the tests would pass
  //    while asserting the opposite of what a browser does.
  // 2. Escape targets the TOPMOST dialog, not the first in document order. Astryx keeps closed
  //    dialogs mounted, so several <dialog> elements coexist; `querySelector` would pick
  //    whichever appears first in the DOM.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const openDialogs = document.querySelectorAll("dialog[open]");
    const topmost = openDialogs[openDialogs.length - 1];
    if (!(topmost instanceof HTMLDialogElement)) return;

    const cancelled = topmost.dispatchEvent(new Event("cancel", { cancelable: true }));
    if (cancelled) topmost.close();
  });
}

export {};
