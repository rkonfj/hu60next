"use client";

import { useEffect } from "react";

const contentImageSelector = ".rich-content img:not(.hu60_face)";
const inlineImageClass = "hu60-inline-image";
const inlineImageMaxSize = 96;

function updateImageLayout(image: HTMLImageElement) {
  if (!image.naturalWidth || !image.naturalHeight) return;

  image.classList.toggle(
    inlineImageClass,
    image.naturalWidth <= inlineImageMaxSize &&
      image.naturalHeight <= inlineImageMaxSize
  );
}

function imagesWithin(node: ParentNode) {
  const images = Array.from(
    node.querySelectorAll<HTMLImageElement>(contentImageSelector)
  );
  if (node instanceof HTMLImageElement && node.matches(contentImageSelector)) {
    images.unshift(node);
  }
  return images;
}

export function ContentImageEnhancer() {
  useEffect(() => {
    const pendingImages = new WeakSet<HTMLImageElement>();

    const enhanceWithin = (node: ParentNode) => {
      for (const image of imagesWithin(node)) {
        if (image.complete) {
          updateImageLayout(image);
          continue;
        }
        if (pendingImages.has(image)) continue;

        pendingImages.add(image);
        image.addEventListener("load", () => updateImageLayout(image), {
          once: true
        });
      }
    };

    enhanceWithin(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) enhanceWithin(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
