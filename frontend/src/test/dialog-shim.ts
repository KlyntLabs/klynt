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
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    _returnValue?: string;
  };

  if (typeof proto.showModal !== "function") {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      setOpen(this, true);
      this.dispatchEvent(new Event("astryx:showmodal"));
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
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = document.querySelector("dialog[open]");
    if (open instanceof HTMLDialogElement) {
      open.dispatchEvent(new Event("cancel"));
      open.close();
    }
  });
}

export {};
