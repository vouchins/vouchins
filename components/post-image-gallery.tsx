"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import { cn } from "@/lib/utils";

export function PostImageGallery({
  imageUrls,
  compact = false,
}: {
  imageUrls: string[];
  compact?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + imageUrls.length) % imageUrls.length);
  };

  return (
    <PhotoProvider loop onIndexChange={setActiveIndex}>
      <div
        className={cn(
          "group/carousel relative mt-4 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50",
          compact ? "max-h-[360px]" : "max-h-[400px]",
        )}
      >
        {imageUrls.map((url, index) => (
          <PhotoView key={url} src={url}>
            <div
              className={
                index === activeIndex
                  ? cn(
                      "relative flex w-full cursor-zoom-in items-center justify-center overflow-hidden",
                      compact ? "h-56 sm:h-72" : "h-64 sm:h-80",
                    )
                  : "hidden"
              }
            >
              <img
                src={url}
                alt={`Attachment ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-550 hover:scale-102"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/carousel:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm">Click to enlarge</span>
              </div>
            </div>
          </PhotoView>
        ))}
        {imageUrls.length > 1 && (
          <>
            <button type="button" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); move(-1); }} className="feed-focus absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 text-neutral-800 shadow-md">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next image" onClick={(event) => { event.stopPropagation(); move(1); }} className="feed-focus absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 text-neutral-800 shadow-md">
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
              {imageUrls.map((_, index) => (
                <button key={index} type="button" aria-label={`Show image ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined} onClick={(event) => { event.stopPropagation(); setActiveIndex(index); }} className={`feed-focus h-1.5 w-1.5 rounded-full ${index === activeIndex ? "w-3.5 bg-white" : "bg-white/50"}`} />
              ))}
            </div>
            <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-sm z-10">
              {activeIndex + 1} / {imageUrls.length}
            </div>
          </>
        )}
      </div>
    </PhotoProvider>
  );
}
