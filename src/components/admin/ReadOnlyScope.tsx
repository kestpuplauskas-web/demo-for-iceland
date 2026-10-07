import { useEffect, useRef, type ReactNode } from "react";

/**
 * Read-only wrapper for viewers: disables form fields and action buttons,
 * but keeps navigation (tabs, section menus, list rows, dialog close) clickable.
 * Mark extra navigation buttons with data-view-ok.
 */
const ALLOWED_TEXT = /^(close|cancel|back|×|stay|leave)$/i;

function isNavButton(el: HTMLElement): boolean {
  if (el.closest("[data-view-ok]")) return true;
  const role = el.getAttribute("role");
  if (role === "tab" || role === "menuitem" || role === "option" || role === "combobox") return true;
  if (el.hasAttribute("aria-expanded") || el.hasAttribute("aria-haspopup")) return true;
  if (el.getAttribute("aria-controls")) return true;
  const label = (el.getAttribute("aria-label") || el.textContent || "").trim();
  if (ALLOWED_TEXT.test(label)) return true;
  if (el.getAttribute("type") === "submit") return false;
  // Buttons that only switch views: type="button" without an action icon text hint
  return el.dataset.nav === "true";
}

function apply(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("input, textarea, select, button").forEach((el) => {
    if (el.tagName === "BUTTON") {
      const b = el as HTMLButtonElement;
      if (isNavButton(b)) return;
      if (!b.disabled) {
        b.disabled = true;
        b.dataset.roDisabled = "1";
      }
      return;
    }
    const f = el as HTMLInputElement;
    if (f.type === "search" || f.closest("[data-view-ok]")) return;
    if (f.tagName === "INPUT" || f.tagName === "TEXTAREA") f.readOnly = true;
    if (f.tagName === "SELECT" || f.type === "checkbox" || f.type === "radio") f.disabled = true;
  });
}

export function ReadOnlyScope({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    apply(root);
    const obs = new MutationObserver(() => apply(root));
    obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
    // Dialogs render in portals outside the scope.
    const portalObs = new MutationObserver(() => {
      document.querySelectorAll<HTMLElement>("[role=dialog], [role=alertdialog]").forEach(apply);
    });
    portalObs.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      portalObs.disconnect();
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}
