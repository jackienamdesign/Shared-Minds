import { useState } from 'react';
import { StoryWorld } from '../types';

interface ResonanceRadarProps {
  worlds: StoryWorld[];
  onSelectWorld: (worldId: string) => void;
  selectedWorldId: string | null;
}

export default function ResonanceRadar({
  worlds,
  onSelectWorld,
  selectedWorldId,
}: ResonanceRadarProps) {
  // Radar puck coordinate (-1 to 1)
  const [puck, setPuck] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleRadarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const clickY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setPuck({
      x: Math.max(-1, Math.min(1, clickX)),
      y: Math.max(-1, Math.min(1, clickY)),
    });
  };

  // Rank worlds by distance from radar puck
  const ranked = worlds
    .map((w) => {
      const dist = Math.hypot(w.moodX - puck.x, w.moodY - puck.y);
      const resonance = Math.max(0, Math.round((1 - dist / 2.82) * 100));
      return { world: w, dist, resonance };
    })
    .sort((a, b) => b.resonance - a.resonance);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Resonance Radar (2D Narrative Matrix)
          </h3>
          <p className="text-xs text-slate-400">
            Drag or click on the radar to scan across the sprawl of worlds by mood & scale
          </p>
        </div>
        <div className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full">
          Sonar: [{puck.x > 0 ? '+' : ''}{puck.x.toFixed(2)}, {puck.y > 0 ? '+' : ''}{puck.y.toFixed(2)}]
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* The 2D Radar Pad */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div
            onClick={handleRadarClick}
            className="relative w-full max-w-[360px] aspect-square rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/30 overflow-hidden cursor-crosshair shadow-inner select-none"
          >
            {/* Grid axis lines */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-500/20"></div>
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/20"></div>

            {/* Concentric radar circles */}
            <div className="absolute inset-8 rounded-full border border-cyan-500/10 pointer-events-none"></div>
            <div className="absolute inset-20 rounded-full border border-cyan-500/15 pointer-events-none"></div>
            <div className="absolute inset-32 rounded-full border border-cyan-500/25 pointer-events-none"></div>

            {/* Quadrant labels */}
            <span className="absolute top-2 left-3 text-[10px] font-mono text-cyan-400/60 uppercase">
              Whimsical · Minimal
            </span>
            <span className="absolute top-2 right-3 text-[10px] font-mono text-purple-400/60 uppercase">
              Ominous · Minimal
            </span>
            <span className="absolute bottom-2 left-3 text-[10px] font-mono text-emerald-400/60 uppercase">
              Whimsical · Epic
            </span>
            <span className="absolute bottom-2 right-3 text-[10px] font-mono text-rose-400/60 uppercase">
              Ominous · Epic
            </span>

            {/* Plotted Story World Dots */}
            {worlds.map((w) => {
              const leftPercent = ((w.moodX + 1) / 2) * 100;
              const topPercent = ((w.moodY + 1) / 2) * 100;
              const isSelected = w.id === selectedWorldId;

              return (
                <button
                  key={w.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectWorld(w.id);
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all p-1.5 rounded-full flex items-center justify-center ${
                    isSelected
                      ? 'scale-125 z-30 ring-2 ring-white shadow-lg shadow-cyan-500/50'
                      : 'hover:scale-110 z-10'
                  }`}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    backgroundColor: w.color,
                  }}
                  title={`${w.title} (${w.creatorName})`}
                >
                  <span className="text-xs">{w.creatorAvatar}</span>
                </button>
              );
            })}

            {/* The Sonar Puck Indicator */}
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
              style={{
                left: `${((puck.x + 1) / 2) * 100}%`,
                top: `${((puck.y + 1) / 2) * 100}%`,
              }}
            >
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400 bg-emerald-400/20 animate-ping absolute -inset-1"></div>
              <div className="w-6 h-6 rounded-full border-2 border-emerald-300 bg-emerald-500/40 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-emerald-500/50">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500 mt-2">
            Click anywhere in quadrant to shift acoustic radar focus
          </span>
        </div>

        {/* Top Resonant Worlds List */}
        <div className="lg:col-span-6 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
            Resonance Signal Matches
          </div>
          {ranked.map(({ world, resonance }) => {
            const isSelected = world.id === selectedWorldId;
            return (
              <div
                key={world.id}
                onClick={() => onSelectWorld(world.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400/80 shadow-md shadow-cyan-950'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-2xl p-1 bg-slate-800 rounded-lg shrink-0">
                    {world.creatorAvatar}
                  </span>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white truncate">{world.title}</h4>
                      {world.creatorId.startsWith('agent_') ? (
                        <span className="text-[9px] px-1 bg-purple-900/50 text-purple-300 rounded">
                          AGENT
                        </span>
                      ) : (
                        <span className="text-[9px] px-1 bg-emerald-900/50 text-emerald-300 rounded">
                          HUMAN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{world.logline}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    {resonance}% MATCH
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {world.framesCount} panels
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
