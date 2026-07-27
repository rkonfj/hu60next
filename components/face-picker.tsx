"use client";

import { Smile } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ForumFace } from "@/lib/types";

export function FacePicker({
  faces,
  onSelect
}: {
  faces: ForumFace[];
  onSelect: (face: ForumFace) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const picker = detailsRef.current;
      if (
        picker?.open &&
        event.target instanceof Node &&
        !picker.contains(event.target)
      ) {
        picker.open = false;
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      const picker = detailsRef.current;
      if (event.key !== "Escape" || !picker?.open) return;

      picker.open = false;
      picker.querySelector("summary")?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (!faces.length) return null;

  return (
    <details className="face-picker" ref={detailsRef}>
      <summary aria-label="插入表情" title="插入表情">
        <Smile size={16} />
        <span>表情</span>
      </summary>
      <div className="face-picker-popover">
        <div className="face-picker-grid">
          {faces.map((face) => (
            <button
              type="button"
              title={face.name}
              aria-label={`插入表情：${face.name}`}
              onClick={() => {
                onSelect(face);
                detailsRef.current?.removeAttribute("open");
              }}
              key={face.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={face.url} alt={face.name} loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
