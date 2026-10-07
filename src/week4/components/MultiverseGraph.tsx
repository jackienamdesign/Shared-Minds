import { useRef, useEffect, useState } from 'react';
import { StoryWorld } from '../types';

interface MultiverseGraphProps {
  worlds: StoryWorld[];
  selectedWorldId: string | null;
  onSelectWorld: (worldId: string) => void;
  activeFilter: string;
}

export default function MultiverseGraph({
  worlds,
  selectedWorldId,
  onSelectWorld,
  activeFilter,
}: MultiverseGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredWorld, setHoveredWorld] = useState<StoryWorld | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Filter worlds
  const displayedWorlds = worlds.filter((w) => {
    if (activeFilter === 'humans') return !w.creatorId.startsWith('agent_');
    if (activeFilter === 'agents') return w.creatorId.startsWith('agent_');
    if (activeFilter === 'high_rep') return w.starsCount > 80;
    if (activeFilter === 'clay') return w.genre.includes('Claymation') || w.tags.includes('Claymation');
    return true;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Static starfield background
    const stars: { x: number; y: number; r: number; alpha: number }[] = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    const render = () => {
      timeRef.current += 0.012;
      const t = timeRef.current;

      ctx.clearRect(0, 0, width, height);

      // Deep space galactic gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        40,
        width / 2,
        height / 2,
        Math.max(width, height) / 1.2
      );
      bgGrad.addColorStop(0, '#0a1526');
      bgGrad.addColorStop(0.5, '#040914');
      bgGrad.addColorStop(1, '#020409');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw faint background stars
      ctx.save();
      for (const s of stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(centerX + s.x * 0.5, centerY + s.y * 0.5, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Draw galactic orbit rings
      ctx.save();
      const orbitRings = [140, 220, 310];
      for (const r of orbitRings) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Constellation lines between worlds
      ctx.save();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < displayedWorlds.length; i++) {
        const w1 = displayedWorlds[i];
        const angle1 = (w1.galaxyCoord?.phase || 0) + t * (w1.galaxyCoord?.speed || 0.0003);
        const rad1 = w1.galaxyCoord?.orbitRadius || 200;
        const x1 = centerX + Math.cos(angle1) * rad1;
        const y1 = centerY + Math.sin(angle1) * rad1;

        for (let j = i + 1; j < displayedWorlds.length; j++) {
          const w2 = displayedWorlds[j];
          const angle2 = (w2.galaxyCoord?.phase || 0) + t * (w2.galaxyCoord?.speed || 0.0003);
          const rad2 = w2.galaxyCoord?.orbitRadius || 200;
          const x2 = centerX + Math.cos(angle2) * rad2;
          const y2 = centerY + Math.sin(angle2) * rad2;

          const dist = Math.hypot(x2 - x1, y2 - y1);
          if (dist < 260) {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
        }
      }
      ctx.stroke();
      ctx.restore();

      // Draw Galactic Core (Shared Minds Origin)
      ctx.save();
      const corePulse = Math.sin(t * 1.5) * 4 + 18;
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, corePulse * 2);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.5)');
      coreGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, corePulse * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.textAlign = 'center';
      ctx.fillText('NEXUS CORE', centerX, centerY + 24);
      ctx.restore();

      // Draw each Story World node
      for (const w of displayedWorlds) {
        const angle = (w.galaxyCoord?.phase || 0) + t * (w.galaxyCoord?.speed || 0.0003);
        const radius = w.galaxyCoord?.orbitRadius || 200;
        const wx = centerX + Math.cos(angle) * radius;
        const wy = centerY + Math.sin(angle) * radius;

        const isSelected = w.id === selectedWorldId;
        const isHovered = hoveredWorld?.id === w.id;

        const nodeSize = 10 + Math.min(w.framesCount * 2, 10);

        ctx.save();
        // Glow corona
        const glowRadius = (nodeSize * 2.2) + (isSelected ? 8 : 0);
        const glow = ctx.createRadialGradient(wx, wy, 2, wx, wy, glowRadius);
        glow.addColorStop(0, w.color || '#38bdf8');
        glow.addColorStop(0.7, `${w.color}55`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(wx, wy, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Star body
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(wx, wy, nodeSize, 0, Math.PI * 2);
        ctx.fill();

        // Inner color disc
        ctx.fillStyle = w.color || '#38bdf8';
        ctx.beginPath();
        ctx.arc(wx, wy, nodeSize - 2, 0, Math.PI * 2);
        ctx.fill();

        // Selection ring
        if (isSelected || isHovered) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(wx, wy, nodeSize + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Creator Avatar badge
        ctx.font = '12px Apple Color Emoji, Segoe UI Emoji, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(w.creatorAvatar, wx, wy);

        // World Title Label
        ctx.font = `${isSelected ? 'bold 12px' : '11px'} Inter, sans-serif`;
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText(w.title, wx, wy + nodeSize + 16);

        // Frame count pill
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.fillText(`${w.framesCount} panels · ${w.starsCount}★`, wx, wy + nodeSize + 28);

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [displayedWorlds, selectedWorldId, hoveredWorld]);

  // Click & Hover collision detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const t = timeRef.current;

    let found: StoryWorld | null = null;

    for (const w of displayedWorlds) {
      const angle = (w.galaxyCoord?.phase || 0) + t * (w.galaxyCoord?.speed || 0.0003);
      const radius = w.galaxyCoord?.orbitRadius || 200;
      const wx = centerX + Math.cos(angle) * radius;
      const wy = centerY + Math.sin(angle) * radius;

      const dist = Math.hypot(mouseX - wx, mouseY - wy);
      if (dist < 28) {
        found = w;
        setHoverPos({ x: e.clientX, y: e.clientY });
        break;
      }
    }

    setHoveredWorld(found);
    if (!found) setHoverPos(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredWorld) {
      onSelectWorld(hoveredWorld.id);
    }
  };

  return (
    <div className="relative w-full h-[460px] md:h-[540px] rounded-2xl overflow-hidden border border-sky-900/40 shadow-2xl bg-slate-950">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="w-full h-full cursor-pointer block"
      />

      {/* Floating HUD controls on top of the galaxy */}
      <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
        </span>
        <span className="text-xs uppercase tracking-widest font-mono text-cyan-300/80 bg-slate-900/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-cyan-500/20">
          Multiverse Constellation Canvas · {displayedWorlds.length} Worlds Orbiting
        </span>
      </div>

      <div className="absolute bottom-4 right-4 text-right pointer-events-none text-[11px] text-slate-400 font-mono bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
        Click star to warp into storyline · Hover for creator specs
      </div>

      {/* Interactive Hologram Card on Hover */}
      {hoveredWorld && hoverPos && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-4 w-72 bg-slate-900/95 backdrop-blur-xl border border-cyan-400/30 p-3.5 rounded-xl shadow-2xl text-left"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-2xl p-1 bg-slate-800 rounded-lg">{hoveredWorld.creatorAvatar}</span>
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-white truncate">{hoveredWorld.title}</h4>
              <p className="text-xs text-cyan-300 font-mono flex items-center gap-1">
                by {hoveredWorld.creatorName}{' '}
                {hoveredWorld.creatorId.startsWith('agent_') ? (
                  <span className="text-[10px] px-1 bg-purple-900/60 text-purple-300 rounded border border-purple-700/40">
                    AI AGENT
                  </span>
                ) : (
                  <span className="text-[10px] px-1 bg-emerald-900/60 text-emerald-300 rounded border border-emerald-700/40">
                    HUMAN
                  </span>
                )}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 line-clamp-2 mb-2 leading-relaxed">{hoveredWorld.logline}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
            <span>{hoveredWorld.genre}</span>
            <span className="text-amber-400 font-medium">★ {hoveredWorld.starsCount} Karma</span>
            <span className="text-cyan-400 font-medium">{hoveredWorld.framesCount} Panels</span>
          </div>
        </div>
      )}
    </div>
  );
}
