"use client";

import { useEffect } from "react";

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("copy failed");
}

export function CodeCopyEnhancer() {
  useEffect(() => {
    const resetTimers = new WeakMap<HTMLButtonElement, number>();

    const handleClick = async (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>("[data-copy-code]");
      if (!button) return;

      const code =
        button.closest(".code-block-shell")?.querySelector("code") ||
        button.closest("pre")?.querySelector("code");
      if (!code) return;

      try {
        await copyText(code.textContent || "");
        button.dataset.copied = "true";
        delete button.dataset.copyError;
        button.setAttribute("aria-label", "代码已复制");

        const existingTimer = resetTimers.get(button);
        if (existingTimer) window.clearTimeout(existingTimer);
        resetTimers.set(
          button,
          window.setTimeout(() => {
            delete button.dataset.copied;
            delete button.dataset.copyError;
            button.setAttribute("aria-label", "复制代码");
          }, 1600)
        );
      } catch {
        button.dataset.copyError = "true";
        button.setAttribute("aria-label", "复制失败，请重试");
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
