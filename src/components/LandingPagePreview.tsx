"use client";

import { useEffect, useRef, useState } from "react";

/** Desktop-width Framer snapshot scaled to fit the tile (1280×960 → 4:3). */
const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 960;

export function LandingPagePreview({
  src,
  title,
  className = "",
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / PREVIEW_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[4/3] w-full overflow-hidden bg-slate-50 ${className}`}
    >
      {scale > 0 && (
        <iframe
          src={src}
          title={title}
          className="pointer-events-none absolute left-0 top-0 border-0"
          style={{
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          tabIndex={-1}
          loading="lazy"
        />
      )}
    </div>
  );
}
