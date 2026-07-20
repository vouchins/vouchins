"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

export function PostImageGallery({ imageUrls }: { imageUrls: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + imageUrls.length) % imageUrls.length);
  };

  return (
    <PhotoProvider loop onIndexChange={setActiveIndex}>
      <div className="relative mt-4 rounded-xl overflow-hidden border border-neutral-100 bg-neutral-50 group/carousel max-h-[400px]">
        {imageUrls.map((url, index) => (
          <PhotoView key={url} src={url}>
            <div className={index === activeIndex ? "relative w-full h-64 sm:h-80 cursor-zoom-in overflow-hidden flex items-center justify-center" : "hidden"}>
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
            <button type="button" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); move(-1); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/95 text-neutral-800 shadow-md z-10">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next image" onClick={(event) => { event.stopPropagation(); move(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/95 text-neutral-800 shadow-md z-10">
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
              {imageUrls.map((_, index) => (
                <button key={index} type="button" aria-label={`Show image ${index + 1}`} onClick={(event) => { event.stopPropagation(); setActiveIndex(index); }} className={`h-1.5 w-1.5 rounded-full ${index === activeIndex ? "bg-white w-3.5" : "bg-white/50"}`} />
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
