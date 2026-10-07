import { useState, useEffect, useRef } from 'react';
import { StoryFrame, StoryWorld } from '../types';
import { Play, Pause, SkipForward, SkipBack, Film, Volume2, Sparkles, Heart } from 'lucide-react';

interface MoviePlayerProps {
  world: StoryWorld;
  frames: StoryFrame[];
  onClose: () => void;
  onLikeFrame: (frameId: string, authorId: string) => void;
}

export default function MoviePlayer({
  world,
  frames,
  onClose,
  onLikeFrame,
}: MoviePlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [frameDuration, setFrameDuration] = useState(3000); // ms per frame
  const timerRef = useRef<number | null>(null);

  const activeFrame = frames[currentIndex] || frames[0];

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    timerRef.current = window.setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % frames.length);
    }, frameDuration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, frames.length, frameDuration]);

  if (!activeFrame) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 md:p-8 animate-fadeIn">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Film className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">{world.title}</h2>
            <p className="text-xs text-slate-400 font-mono">
              Cine-Sequence Movie · Frame {currentIndex + 1} of {frames.length}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-xs uppercase font-mono tracking-widest text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
        >
          Exit Cinema ✕
        </button>
      </div>

      {/* Main Movie Frame Projection Stage */}
      <div className="relative w-full max-w-4xl aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_80px_rgba(6,182,212,0.15)] flex items-center justify-center">
        {/* Frame Artwork */}
        <img
          key={activeFrame.id}
          src={activeFrame.imageUrl}
          alt={activeFrame.title}
          className="w-full h-full object-cover transition-opacity duration-700 animate-fadeIn"
        />

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

        {/* SFX Graphic Splash */}
        {activeFrame.sfx && (
          <div className="absolute top-8 right-8 z-20 transform rotate-12 scale-110 pointer-events-none animate-bounce">
            <span className="font-black text-2xl md:text-3xl tracking-tighter text-amber-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] uppercase font-mono border-2 border-amber-300 px-3 py-1 bg-black/60 rounded-lg">
              {activeFrame.sfx}
            </span>
          </div>
        )}

        {/* Dialogue Bubbles Overlay */}
        {activeFrame.dialogue?.map((bubble) => (
          <div
            key={bubble.id}
            className="absolute z-20 max-w-[280px] p-3 rounded-2xl shadow-2xl transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 animate-fadeIn"
            style={{
              left: `${bubble.x}%`,
              top: `${bubble.y}%`,
              backgroundColor: bubble.type === 'shout' ? '#fef08a' : '#ffffff',
              color: '#0f172a',
              border: bubble.type === 'shout' ? '3px solid #eab308' : '2px solid #334155',
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              {bubble.speaker}
            </div>
            <div className={`text-xs md:text-sm leading-snug ${bubble.type === 'shout' ? 'font-black uppercase' : 'font-medium'}`}>
              {bubble.text}
            </div>
          </div>
        ))}

        {/* Bottom Subtitle / Narrative Crawl */}
        <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold mb-1 block">
              Panel {currentIndex + 1}: {activeFrame.title}
            </span>
            <p className="text-sm md:text-base text-slate-100 font-serif italic drop-shadow-md leading-relaxed">
              "{activeFrame.caption}"
            </p>
          </div>

          {/* Author Badge for Accountability */}
          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 shrink-0">
            <span className="text-2xl">{activeFrame.authorAvatar}</span>
            <div className="text-left text-xs font-mono">
              <div className="text-white font-medium flex items-center gap-1.5">
                {activeFrame.authorName}
                {activeFrame.isAgent ? (
                  <span className="text-[9px] px-1 bg-purple-900/80 text-purple-200 rounded">
                    AGENT
                  </span>
                ) : (
                  <span className="text-[9px] px-1 bg-emerald-900/80 text-emerald-200 rounded">
                    AUTHOR
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-[10px]">★ {activeFrame.authorReputation} Rep</div>
            </div>

            <button
              onClick={() => onLikeFrame(activeFrame.id, activeFrame.authorId)}
              className="ml-2 p-1.5 text-rose-400 hover:text-rose-300 hover:scale-110 transition-transform flex items-center gap-1 text-xs font-mono"
              title="Give Karma Star"
            >
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>{activeFrame.likes}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrub Filmstrip and Playback Controls */}
      <div className="w-full max-w-4xl mt-4 flex flex-col gap-3">
        {/* Playback Button Controls */}
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + frames.length) % frames.length)}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Previous Frame"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 bg-cyan-500 text-slate-950 font-bold rounded-lg hover:bg-cyan-400 transition-colors shadow-md shadow-cyan-500/20"
              title={isPlaying ? 'Pause Movie' : 'Play Sequence'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % frames.length)}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Next Frame"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Pacing:</span>
            {[1500, 3000, 5000].map((ms) => (
              <button
                key={ms}
                onClick={() => setFrameDuration(ms)}
                className={`px-2 py-1 rounded transition-colors ${
                  frameDuration === ms
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'hover:text-white'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>
        </div>

        {/* Thumbnail Sequence Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {frames.map((frame, idx) => (
            <button
              key={frame.id}
              onClick={() => {
                setCurrentIndex(idx);
                setIsPlaying(false);
              }}
              className={`relative shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIndex
                  ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-500/40'
                  : 'border-slate-800 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={frame.imageUrl} alt={frame.title} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold bg-black/80 text-white px-1 rounded">
                #{idx + 1}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
