import React from "react";

export const ThemeGlow: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-black transition-colors duration-1000">
      {/* Dynamic Ambient Aura Glow Blob 1 - Top Center */}
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[70vw] h-[45vw] rounded-full blur-[140px] opacity-15 mix-blend-screen transition-all duration-1000 ease-in-out animate-aura-breath bg-gradient-to-r from-zinc-700 via-zinc-850 to-zinc-950"
      />

      {/* Dynamic Ambient Aura Glow Blob 2 - Bottom Right */}
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[120px] opacity-10 mix-blend-screen transition-all duration-1000 ease-in-out bg-zinc-900/40"
      />

      {/* Dynamic Ambient Aura Glow Blob 3 - Left Center */}
      <div
        className="absolute top-[30%] left-[-15%] w-[40vw] h-[40vw] rounded-full blur-[130px] opacity-8 mix-blend-screen transition-all duration-1000 ease-in-out bg-zinc-950"
      />

      {/* Grid Mesh Overlay with Radial Fade */}
      <div className="absolute inset-0 grid-mesh [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_75%,transparent_100%)] opacity-30 pointer-events-none" />
    </div>
  );
};
