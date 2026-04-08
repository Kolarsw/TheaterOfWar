import GlobeMap from "@/features/map/GlobeMap";

export default function Home() {
  return (
    <main className="relative h-full w-full">
      <GlobeMap />

      {/* Title overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-sm font-mono tracking-widest uppercase text-cyan opacity-60">
          Theater of War
        </h1>
        <p className="text-xs font-mono text-foreground/40 mt-1">
          WWII Logistics &amp; Battle Simulator
        </p>
      </div>
    </main>
  );
}
