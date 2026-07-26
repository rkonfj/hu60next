"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setActive(false);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pathname, search]);

  useEffect(() => {
    function startProgress(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.dataset.navigationProgress === "off"
      ) {
        return;
      }

      const target = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);
      if (
        target.origin !== current.origin ||
        (target.pathname === current.pathname &&
          target.search === current.search)
      ) {
        return;
      }

      setActive(true);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setActive(false);
        timeoutRef.current = null;
      }, 15000);
    }

    document.addEventListener("click", startProgress);
    return () => document.removeEventListener("click", startProgress);
  }, []);

  return (
    <div
      className={`navigation-progress${active ? " active" : ""}`}
      role="progressbar"
      aria-label="页面加载中"
      aria-hidden={!active}
    />
  );
}
