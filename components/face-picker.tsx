"use client";

import { Smile } from "lucide-react";
import { useRef } from "react";
import type { ForumFace } from "@/lib/types";

export function FacePicker({
  faces,
  onSelect
}: {
  faces: ForumFace[];
  onSelect: (face: ForumFace) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

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
