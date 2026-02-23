"use client";

import { useState } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const CITIES = [
  "Hyderabad",
  "Bengaluru",
  "Pune",
  "Delhi NCR",
  "Mumbai",
  "Chennai",
];

export function LocationSelector({
  currentCity,
  onCityChange,
}: {
  currentCity: string;
  onCityChange: (city: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="flex items-center gap-2.5 px-5 py-2.5 bg-secondary/50 hover:bg-secondary rounded-2xl transition-all active:scale-95 border border-transparent hover:border-border group">
          <MapPin className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-black text-foreground uppercase tracking-[0.1em]">
            {currentCity || "Global Network"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DrawerTrigger>

      <DrawerContent className="rounded-t-[3rem] border-none bg-background max-w-2xl mx-auto px-8 pb-12">
        <div className="mx-auto w-16 h-1.5 flex-shrink-0 rounded-full bg-border my-6" />

        <DrawerHeader className="px-0 pb-8">
          <DrawerTitle className="text-2xl font-black tracking-tighter text-foreground uppercase">
            Select Location
          </DrawerTitle>
          <p className="text-[13px] text-muted-foreground font-bold uppercase tracking-tight mt-1">
            Access localized whispers and referrals
          </p>
        </DrawerHeader>

        <div className="space-y-3">
          {/* Global Option */}
          <button
            onClick={() => {
              onCityChange("");
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between p-6 rounded-[2rem] transition-all border",
              currentCity === ""
                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-secondary/30 border-transparent hover:border-border"
            )}
          >
            <span className="text-xs font-black uppercase tracking-widest">
              Global Network
            </span>
            {currentCity === "" && <Check className="h-4 w-4" />}
          </button>

          {/* Divider */}
          <div className="relative py-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative bg-background px-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
              Cities
            </span>
          </div>

          {/* Cities Grid */}
          <div className="grid grid-cols-1 gap-3">
            {CITIES.map((city) => (
              <button
                key={city}
                onClick={() => {
                  onCityChange(city);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-6 rounded-[2rem] transition-all border",
                  currentCity === city
                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-secondary/30 border-transparent hover:border-border"
                )}
              >
                <span className="text-xs font-black uppercase tracking-widest">
                  {city}
                </span>
                {currentCity === city && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
