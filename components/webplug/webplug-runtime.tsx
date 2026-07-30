"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function activateScripts(root: HTMLElement) {
  root.querySelectorAll("script").forEach((oldScript) => {
    const script = document.createElement("script");
    for (const attr of oldScript.attributes) {
      script.setAttribute(attr.name, attr.value);
    }
    script.textContent = oldScript.textContent;
    oldScript.replaceWith(script);
  });
}

export function WebPlugRuntime() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const htmlRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/webplugs/html", {
          cache: "no-store"
        });
        if (!response.ok || cancelled) return;

        const html = (await response.text()).trim();
        if (!html || cancelled) return;

        htmlRef.current = html;
        const container = containerRef.current;
        if (!container) return;

        container.replaceChildren();
        const template = document.createElement("template");
        template.innerHTML = html;
        container.append(...template.content.childNodes);
        activateScripts(container);
      } catch {
        // 未登录或上游不可用时静默跳过。
      }
    }

    void load();

    const handleReload = () => {
      void load();
    };
    window.addEventListener("hu60-webplug-reload", handleReload);

    return () => {
      cancelled = true;
      window.removeEventListener("hu60-webplug-reload", handleReload);
    };
  }, [pathname]);

  return (
    <div
      ref={containerRef}
      id="hu60-webplug-root"
      data-hu60-webplug=""
    />
  );
}
