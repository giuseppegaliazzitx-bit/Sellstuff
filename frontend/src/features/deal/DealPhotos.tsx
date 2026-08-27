import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function EmptySlot() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-chip text-xs uppercase tracking-wide text-neutral-500">
      No Available Photos
    </div>
  );
}

export function DealPhotos({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const hero = photos[0] || null;
  const thumbs = [photos[1], photos[2], photos[3], photos[4]];

  useEffect(() => {
    if (index === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setIndex(null);
      }
      if (!photos.length) return;
      if (e.key === "ArrowRight") setIndex((i) => (i == null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setIndex((i) => (i == null ? i : (i - 1 + photos.length) % photos.length));
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, photos.length]);

  useEffect(() => {
    if (index === null) return;
    const el = stripRef.current?.querySelector(`[data-filmstrip-index="${index}"]`);
    el?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  return (
    <div className="relative" data-testid="photo-mosaic">
      <div className="flex h-[220px] flex-row gap-1 md:h-[338px]">
        <div className="relative h-full min-w-0 flex-1 overflow-hidden bg-chip" data-testid="image-grid">
          {hero ? (
            <button type="button" className="absolute inset-0 cursor-pointer" onClick={() => setIndex(0)}>
              <img src={hero} alt="grid image" className="h-full w-full object-cover" />
            </button>
          ) : (
            <EmptySlot />
          )}
        </div>
        <div className="grid h-full w-[220px] shrink-0 grid-cols-2 grid-rows-2 gap-1 md:w-[338px]">
          {thumbs.map((src, i) => (
            <div key={i} className="relative min-h-0 min-w-0 overflow-hidden bg-chip" data-testid="image-grid">
              {src ? (
                <button type="button" className="absolute inset-0 cursor-pointer" onClick={() => setIndex(i + 1)}>
                  <img src={src} alt="grid image" className="h-full w-full object-cover" />
                </button>
              ) : (
                <EmptySlot />
              )}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="absolute bottom-3 right-3 rounded-full bg-header px-3 py-1.5 text-sm font-medium text-white shadow"
        onClick={() => setIndex(photos.length ? 0 : null)}
      >
        View more
      </button>
      {index !== null && photos[index]
        ? createPortal(
            <div
              role="dialog"
              aria-label="All photos"
              data-testid="photo-lightbox"
              className="fixed inset-0 z-[2100] flex flex-col bg-black"
            >
              <div className="flex shrink-0 flex-row items-center justify-between px-4 py-3 text-sm text-white">
                <p>
                  {index + 1} / {photos.length}
                </p>
                <button type="button" className="rounded px-2 py-1 hover:bg-white/10" onClick={() => setIndex(null)}>
                  Close
                </button>
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center px-14">
                {photos.length > 1 ? (
                  <button
                    type="button"
                    className="absolute left-3 z-10 rounded-full bg-white/10 px-3 py-2 text-2xl leading-none text-white hover:bg-white/20"
                    aria-label="Previous photo"
                    onClick={() => setIndex((index - 1 + photos.length) % photos.length)}
                  >
                    ‹
                  </button>
                ) : null}
                <img
                  src={photos[index]}
                  alt=""
                  data-testid="photo-lightbox-main"
                  className="h-full max-h-full w-auto max-w-full object-contain"
                />
                {photos.length > 1 ? (
                  <button
                    type="button"
                    className="absolute right-3 z-10 rounded-full bg-white/10 px-3 py-2 text-2xl leading-none text-white hover:bg-white/20"
                    aria-label="Next photo"
                    onClick={() => setIndex((index + 1) % photos.length)}
                  >
                    ›
                  </button>
                ) : null}
              </div>
              <div
                ref={stripRef}
                data-testid="photo-filmstrip"
                className="flex shrink-0 flex-row items-end justify-center gap-2 overflow-x-auto px-4 py-4"
              >
                {photos.map((src, i) => {
                  const active = i === index;
                  return (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      data-testid="photo-filmstrip-thumb"
                      data-filmstrip-index={i}
                      data-active={active ? "true" : "false"}
                      aria-current={active}
                      aria-label={`Photo ${i + 1}`}
                      className={`shrink-0 overflow-hidden rounded transition-all ${
                        active
                          ? "h-[92px] w-[128px] ring-2 ring-white ring-offset-2 ring-offset-black"
                          : "h-16 w-[88px] opacity-55 hover:opacity-90"
                      }`}
                      onClick={() => setIndex(i)}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
