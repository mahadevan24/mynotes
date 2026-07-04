"use client";

import React from "react";
import { useNotes } from "@/context/NotesContext";
import { cn } from "@/lib/utils";

export const ThemeGlow: React.FC = () => {
  const { theme } = useNotes();

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-black transition-colors duration-1000">
      {/* Dynamic Ambient Aura Glow Blob 1 - Top Center */}
      <div
        className={cn(
          "absolute top-[-20%] left-1/2 -translate-x-1/2 w-[70vw] h-[45vw] rounded-full blur-[140px] opacity-35 mix-blend-screen transition-all duration-1000 ease-in-out animate-aura-breath",
          theme === "reflect" && "bg-gradient-to-r from-purple-600 via-indigo-700 to-violet-800",
          theme === "granola" && "bg-gradient-to-r from-emerald-500 via-teal-700 to-cyan-800",
          theme === "solar" && "bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-700"
        )}
      />

      {/* Dynamic Ambient Aura Glow Blob 2 - Bottom Right */}
      <div
        className={cn(
          "absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[120px] opacity-20 mix-blend-screen transition-all duration-1000 ease-in-out",
          theme === "reflect" && "bg-fuchsia-900/60",
          theme === "granola" && "bg-cyan-900/60",
          theme === "solar" && "bg-rose-900/50"
        )}
      />

      {/* Dynamic Ambient Aura Glow Blob 3 - Left Center */}
      <div
        className={cn(
          "absolute top-[30%] left-[-15%] w-[40vw] h-[40vw] rounded-full blur-[130px] opacity-15 mix-blend-screen transition-all duration-1000 ease-in-out",
          theme === "reflect" && "bg-violet-950",
          theme === "granola" && "bg-emerald-950",
          theme === "solar" && "bg-amber-950"
        )}
      />

      {/* Grid Mesh Overlay with Radial Fade */}
      <div className="absolute inset-0 grid-mesh [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_75%,transparent_100%)] opacity-30 pointer-events-none" />
    </div>
  );
};
