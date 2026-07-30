"use client";

import type { MouseEvent, ReactNode } from "react";

const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "form",
  "label",
  "summary",
  "details",
  "[role='button']",
  "[role='link']",
  "[contenteditable='true']"
].join(",");

export function ScrollToTopHeader({ children }: { children: ReactNode }) {
  function handleClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;
    if (
      !(target instanceof Element) ||
      target.closest(INTERACTIVE_SELECTOR)
    ) {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header className="site-header" onClick={handleClick}>
      {children}
    </header>
  );
}
