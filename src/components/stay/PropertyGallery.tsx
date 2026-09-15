import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ImagePlaceholder } from "@/components/site/ImagePlaceholder";

/**
 * Looping image carousel used inside property cards.
 * Lives inside a link, so every control stops navigation.
 * Falls back to the house placeholder when a property has no photos yet.
 */
export function PropertyGallery({
  images,
  alt,
  eager = false,
}: {
  images: string[];
  alt: string;
  eager?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const count = images.length;

  if (count === 0) {
    return <ImagePlaceholder label={alt} className="aspect-[4/3]" />;
  }

  const go = (event: React.MouseEvent, delta: number) => {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current + delta + count) % count);
  };

  return (
    <div className="group/gallery relative aspect-[4/3] overflow-hidden bg-surface-2">
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
      >
        {images.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={i === 0 ? alt : `${alt} (${i + 1})`}
            loading={eager && i === 0 ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full flex-none object-cover"
          />
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={(event) => go(event, -1)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink/70 p-2 text-paper opacity-0 shadow-soft transition-opacity duration-300 hover:bg-ink/90 focus-visible:opacity-100 group-hover/gallery:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(event) => go(event, 1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink/70 p-2 text-paper opacity-0 shadow-soft transition-opacity duration-300 hover:bg-ink/90 focus-visible:opacity-100 group-hover/gallery:opacity-100"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {images.map((src, i) => (
              <button
                key={`dot-${src}-${i}`}
                type="button"
                aria-label={`Photo ${i + 1}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-5 bg-paper" : "w-1.5 bg-paper/50 hover:bg-paper/80"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
