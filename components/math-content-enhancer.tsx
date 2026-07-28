"use client";

import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";
import { useEffect } from "react";

const mathRootSelector = "[data-math-content]";
const blockMathContainers = "p, li, td, th, blockquote, figcaption";
const blockMathPattern =
  /\$\$(?:\s*<br\s*\/?>\s*)?([\s\S]*?)(?:\s*<br\s*\/?>\s*)?\$\$/gi;
const matrixEnvironmentPattern =
  /\\begin\{(?:[pbBvV]?matrix|smallmatrix|array|aligned|cases|gathered)\}/;

const katexOptions = {
  throwOnError: false,
  trust: false,
  strict: "warn" as const
};

function decodeFormulaHtml(value: string) {
  const container = document.createElement("div");
  container.innerHTML = value.replace(/<br\s*\/?>/gi, "\n");
  return container.textContent?.trim() ?? "";
}

function normalizeMarkdownFormula(value: string) {
  if (!matrixEnvironmentPattern.test(value)) return value;

  return value
    .split("\n")
    .map((line) => {
      const trailingSlash = line.match(/(\\+)(\s*)$/);
      if (!trailingSlash || trailingSlash[1].length !== 1) return line;

      return `${line.slice(0, trailingSlash.index)}\\\\${trailingSlash[2]}`;
    })
    .join("\n");
}

function renderExplicitMathBlocks(root: HTMLElement) {
  root
    .querySelectorAll<HTMLElement>("[data-latex-display]")
    .forEach((element) => {
      const formula = normalizeMarkdownFormula(
        element.textContent?.trim() ?? ""
      );
      if (!formula) return;

      element.removeAttribute("data-latex-display");
      katex.render(formula, element, {
        ...katexOptions,
        displayMode: true
      });
    });
}

function renderHtmlMathBlocks(root: HTMLElement) {
  root
    .querySelectorAll<HTMLElement>(blockMathContainers)
    .forEach((element) => {
      if (element.closest("pre, code") || !element.innerHTML.includes("$$")) {
        return;
      }

      blockMathPattern.lastIndex = 0;
      element.innerHTML = element.innerHTML.replace(
        blockMathPattern,
        (source, formulaHtml: string) => {
          const formula = normalizeMarkdownFormula(
            decodeFormulaHtml(formulaHtml)
          );
          if (!formula) return source;

          return katex.renderToString(formula, {
            ...katexOptions,
            displayMode: true
          });
        }
      );
    });
}

function renderMathRoot(root: HTMLElement) {
  renderExplicitMathBlocks(root);
  renderHtmlMathBlocks(root);
  renderMathInElement(root, {
    ...katexOptions,
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
      { left: "$", right: "$", display: false }
    ],
    ignoredTags: [
      "script",
      "noscript",
      "style",
      "textarea",
      "pre",
      "code"
    ],
    ignoredClasses: ["katex"]
  });
}

function mathRootsWithin(node: ParentNode) {
  const roots = Array.from(
    node.querySelectorAll<HTMLElement>(mathRootSelector)
  );
  if (node instanceof HTMLElement && node.matches(mathRootSelector)) {
    roots.unshift(node);
  }
  return roots;
}

export function MathContentEnhancer() {
  useEffect(() => {
    const renderedRoots = new WeakSet<HTMLElement>();
    const enhanceWithin = (node: ParentNode) => {
      for (const root of mathRootsWithin(node)) {
        if (renderedRoots.has(root)) continue;
        renderedRoots.add(root);
        renderMathRoot(root);
      }
    };

    enhanceWithin(document);

    const observe = () => {
      observer.observe(document.body, { childList: true, subtree: true });
    };
    const observer = new MutationObserver((mutations) => {
      const rootsToRefresh = new Set<HTMLElement>();

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          const element =
            node instanceof HTMLElement ? node : node.parentElement;
          if (!element) continue;

          if (!element.closest(".katex, .katex-display")) {
            const existingRoot = element.matches(mathRootSelector)
              ? element
              : element.closest<HTMLElement>(mathRootSelector);
            if (existingRoot && renderedRoots.has(existingRoot)) {
              rootsToRefresh.add(existingRoot);
            }
          }
          if (node instanceof HTMLElement) enhanceWithin(node);
        }
      }

      // KaTeX 会改写公式节点。刷新已有根节点时暂时停止观察，
      // 避免这些内部 DOM 变更再次触发同一个根节点的渲染。
      observer.disconnect();
      rootsToRefresh.forEach(renderMathRoot);
      observer.takeRecords();
      observe();
    });
    observe();

    return () => observer.disconnect();
  }, []);

  return null;
}
