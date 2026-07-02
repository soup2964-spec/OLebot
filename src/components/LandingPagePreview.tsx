"use client";

/** Desktop-width Framer snapshot scaled to fit the tile (1280×960 → 4:3). */
const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 960;

export function LandingPagePreview({ src, title }: { src: string; title: string }) {
  return (
    <div className="landing-preview relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
      <iframe
        src={src}
        title={title}
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        className="pointer-events-none absolute left-0 top-0 border-0"
        tabIndex={-1}
        loading="lazy"
      />
    </div>
  );
}
