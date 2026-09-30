"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import { cn } from "@/lib/utils";

interface PostImageGalleryProps {
  imageUrls: string[];
  compact?: boolean;
}

export function PostImageGallery({
  imageUrls,
  compact = false,
}: PostImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!imageUrls || imageUrls.length === 0) return null;

  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + imageUrls.length) % imageUrls.length);
  };

  return (
    <PhotoProvider loop speed={() => 300} onIndexChange={setActiveIndex}>
      <div
        className={cn(
          "group/carousel relative mt-3.5 w-full overflow-hidden rounded-xl border border-neutral-800/40 bg-neutral-950 flex items-center justify-center select-none",
          compact ? "h-[440px] sm:h-[500px]" : "h-[480px] sm:h-[540px]",
        )}
      >
        {imageUrls.map((url, index) => (
          <div
            key={url}
            className={
              index === activeIndex
                ? "relative flex h-full w-full items-center justify-center overflow-hidden"
                : "hidden"
            }
          >
            {/* Ambient blurred backdrop to eliminate awkward empty side space */}
            <img
              src={url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover filter blur-2xl opacity-25 scale-110 pointer-events-none"
            />

            {/* Crisp centered foreground image (never stretched, never cropped) */}
            <PhotoView src={url}>
              <img
                src={url}
                alt={`Attachment ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="relative z-10 h-full w-full object-contain cursor-zoom-in select-none transition-transform duration-200 hover:scale-[1.01]"
              />
            </PhotoView>

            <div className="absolute inset-0 z-10 bg-black/5 opacity-0 group-hover/carousel:opacity-100 transition-opacity flex items-end justify-end p-3 pointer-events-none">
              <span className="bg-black/70 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm">
                Click to enlarge
              </span>
            </div>
          </div>
        ))}

        {imageUrls.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(event) => {
                event.stopPropagation();
                move(-1);
              }}
              className="feed-focus absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 text-neutral-800 shadow-md transition-all hover:bg-white hover:text-[#0A1B5C] hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(event) => {
                event.stopPropagation();
                move(1);
              }}
              className="feed-focus absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 text-neutral-800 shadow-md transition-all hover:bg-white hover:text-[#0A1B5C] hover:scale-105 active:scale-95"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
              {imageUrls.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show image ${index + 1}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveIndex(index);
                  }}
                  className={`feed-focus h-1.5 rounded-full transition-all ${
                    index === activeIndex ? "w-3.5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
            <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm z-10">
              {activeIndex + 1} / {imageUrls.length}
            </div>
          </>
        )}
      </div>
    </PhotoProvider>
  );
}
