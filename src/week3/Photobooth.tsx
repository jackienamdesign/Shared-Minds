import { useRef, useState, useEffect, useCallback } from 'react';

import { generatePingu, downloadImage } from './replicate';
import './photobooth.css';

// BASE_URL carries the GitHub Pages subpath in production and "/" in dev, so
// these stay correct in both. It always ends in a slash.
const assetPathPrefix = `${import.meta.env.BASE_URL}week3/assets`;

const pinguThumbs = [
  `${assetPathPrefix}/2c42e.png`,
  `${assetPathPrefix}/7d2c8.png`,
  `${assetPathPrefix}/5c3fe.png`,
  `${assetPathPrefix}/e3b35.png`,
  `${assetPathPrefix}/fe27d.png`,
  `${assetPathPrefix}/8d285.png`,
  `${assetPathPrefix}/f15d8.png`,
  `${assetPathPrefix}/2d87d.png`,
  `${assetPathPrefix}/59a05.png`,
  `${assetPathPrefix}/2bdc5.png`,
  `${assetPathPrefix}/f7f88.png`,
];

/**
 * How long a finished polaroid stays in front before it files itself away.
 *
 * Must outlast the .pingu-develop reveal in index.css (3.2s) or the polaroid
 * slides into the strip while Pingu is still surfacing. The surplus is the beat
 * you get to look at the finished picture.
 */
const HOLD_BEFORE_FILING_MS = 4400;

interface Polaroid {
  id: number;
  /** The real webcam capture, shown while Pingu is being generated. */
  photoUrl: string;
  /** The generated Pingu. Undefined until the model answers. */
  pinguUrl?: string;
  status: 'developing' | 'done' | 'failed';
  /**
   * False while the polaroid sits in front of the booth developing; true once it
   * has been filed into the strip along the bottom. Exactly one polaroid is
   * unfiled at a time, and that is the one rendered over the window.
   */
  filed: boolean;
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [polaroids, setPolaroids] = useState<Polaroid[]>([]);
  const [flashing, setFlashing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  // Stored as an id rather than the polaroid object: if you open one while it is
  // still developing, holding a copy would freeze it mid-develop — looking it up
  // by id each render means the open polaroid turns into Pingu while you watch.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const polaroidIdRef = useRef(0);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // StrictMode runs this effect twice in dev: mount, clean up, mount again.
    // getUserMedia is slow enough that the first call usually resolves *after*
    // that cleanup, so without this flag we'd hand the element a stream nobody
    // is going to stop — the camera light stays on and a second stream opens on
    // top of it. If we were torn down while waiting, stop what we got instead.
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            setCameraReady(true);
          };
        }
      } catch {
        if (!cancelled) setCameraError(true);
      }
    }
    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || countdown !== null) return;

    let count = 3;
    setCountdown(count);

    const tick = () => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        setTimeout(tick, 800);
      } else {
        setCountdown(null);
        snap();
      }
    };
    setTimeout(tick, 800);

    function snap() {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d')!;
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      const dataUrl = canvas.toDataURL('image/png');

      setFlashing(true);
      setTimeout(() => setFlashing(false), 400);

      // The polaroid appears in front of the booth holding your real photo, the
      // way one would slide out of a real machine, and develops there. Nothing
      // here waits — the request runs in the background and updates this one
      // polaroid by id when it lands.
      const id = ++polaroidIdRef.current;
      setPolaroids(prev => [...prev, { id, photoUrl: dataUrl, status: 'developing', filed: false }]);

      const updateById = (changes: Partial<Polaroid>) =>
        setPolaroids(prev => prev.map(p => (p.id === id ? { ...p, ...changes } : p)));

      // Whether Pingu arrives or the request fails, the polaroid is held in
      // front long enough to look at, then files itself into the strip.
      const fileAwayShortly = () =>
        setTimeout(() => updateById({ filed: true }), HOLD_BEFORE_FILING_MS);

      generatePingu(dataUrl)
        .then(pinguUrl => {
          updateById({ pinguUrl, status: 'done' });
          fileAwayShortly();
        })
        .catch((err: unknown) => {
          // Left visible in the console on purpose — when a prompt or a model
          // name is wrong, this message is where it says so.
          console.error('Pingu generation failed:', err);
          updateById({ status: 'failed' });
          fileAwayShortly();
        });
    }
  }, [countdown]);

  const selectedPolaroid = polaroids.find(p => p.id === selectedId) ?? null;

  // The one currently developing in front of the booth, and the session's
  // record of everything already filed into the strip.
  const activePolaroid = polaroids.find(p => !p.filed) ?? null;
  const filedPolaroids = polaroids.filter(p => p.filed);

  // New shots file in at the right-hand end, past the stock frames — which
  // already fill the strip's width, so without this the photo you just took
  // would land off-screen. Scroll the strip to its end whenever one arrives.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || filedPolaroids.length === 0) return;
    strip.scrollTo({ left: strip.scrollWidth, behavior: 'smooth' });
  }, [filedPolaroids.length]);

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden"
      style={{
        // The claymation arctic scene. Anchored to the bottom so the igloo and
        // snowman stay on screen on short windows — the sky is the part that
        // can afford to be cropped. #1d4ea8 matches the sky so a taller window
        // extends it rather than showing a seam.
        backgroundColor: '#1d4ea8',
        backgroundImage: `url(${assetPathPrefix}/arctic-bg.jpeg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Back to the index. Sits above the Photo Booth window's z-index. */}
      <a
        href="#/"
        className="absolute flex items-center gap-2 px-4 py-2 rounded-full"
        style={{
          left: 28,
          top: 36,
          zIndex: 50,
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          fontWeight: 500,
          color: '#14303d',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        ← All pieces
      </a>

      {/* Tip pill */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center px-5 py-3 rounded-full"
        style={{ top: 46, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', whiteSpace: 'nowrap' }}
      >
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 400, color: '#111' }}>
          Tip: Make a cute gesture with your hands!
        </span>
      </div>

      {/*
        The developing polaroid, in front of the booth.

        zIndex 60 puts it above the Photo Booth window (10) so it is never hidden
        behind the screen it came out of. Only the unfiled polaroid lives here —
        once it files itself it reappears in the strip along the bottom.
      */}
      {activePolaroid && (
        <div
          key={activePolaroid.id}
          className="absolute polaroid-present"
          style={{
            left: '50%',
            // Tracks the window's top (148) so it stays centred on the screen
            // it slid out of — move one and this needs moving with it.
            top: 252,
            zIndex: 60,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            background: '#fff',
            padding: '14px 14px 54px 14px',
            boxShadow: '0 28px 70px rgba(0,0,0,0.45)',
            width: 300,
          }}>
            <div style={{ position: 'relative', width: '100%', height: 260, overflow: 'hidden', background: '#2b2b2b' }}>
              {/*
                Both images are stacked. The real photo sits underneath, dimmed
                and desaturated like an undeveloped print; Pingu fades in on top
                of it when he arrives, so the change reads as one picture
                developing rather than two pictures swapping.
              */}
              <img
                src={activePolaroid.photoUrl}
                alt="Your photo"
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  filter: activePolaroid.status === 'developing'
                    ? 'grayscale(0.85) brightness(0.55) contrast(0.9)'
                    : 'none',
                  transition: 'filter 1.2s ease',
                }}
              />

              {activePolaroid.pinguUrl && (
                <img
                  src={activePolaroid.pinguUrl}
                  alt="You as Pingu"
                  className="pingu-develop"
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  }}
                />
              )}
            </div>

            <div style={{ textAlign: 'center', paddingTop: 16, fontSize: 14, color: '#666', fontFamily: 'Inter, sans-serif' }}>
              {activePolaroid.status === 'done' && '🐧 Pingu pose'}
              {activePolaroid.status === 'developing' && 'Becoming Pingu…'}
              {activePolaroid.status === 'failed' && 'just you this time'}
            </div>
          </div>
        </div>
      )}

      {/* macOS Photo Booth window */}
      <div
        className="absolute"
        style={{
          left: '50%',
          // Sits well clear of the tip pill above it (which ends around y=86).
          top: 148,
          transform: 'translateX(-50%)',
          width: 871,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.38)',
          background: '#1e1e1e',
          zIndex: 10,
        }}
      >
        {/* Title bar */}
        <div style={{ background: '#383838', height: 36, display: 'flex', alignItems: 'center', paddingLeft: 16, gap: 8, userSelect: 'none' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57', flexShrink: 0 }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E', flexShrink: 0 }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840', flexShrink: 0 }} />
          <span style={{ marginLeft: 12, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: '#d0d0d0' }}>
            Photo Booth
          </span>
        </div>

        {/* Video area */}
        <div style={{ position: 'relative', background: '#565656', height: 490, overflow: 'hidden' }}>
          {/*
            Always mounted, never conditional. The effect that starts the camera
            needs videoRef.current to exist so it can attach the stream — but
            cameraReady only turns true once that stream fires onloadedmetadata.
            Gating the element on cameraReady deadlocks the two: no element, so
            no stream, so the flag never flips. Hide it with opacity instead.
          */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: 'scaleX(-1)',
              opacity: cameraReady ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />

          {!cameraReady && !cameraError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#888', fontFamily: 'Inter, sans-serif', fontSize: 15 }}>Requesting camera access…</div>
            </div>
          )}
          {cameraError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#aaa', fontFamily: 'Inter, sans-serif', fontSize: 14, textAlign: 'center', padding: 32 }}>
                Camera unavailable.<br />Please allow camera access and reload.
              </div>
            </div>
          )}

          {/* Countdown overlay */}
          {countdown !== null && (
            <div
              key={countdown}
              className="countdown-pop"
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 120, fontWeight: 700, color: '#fff',
                fontFamily: 'Inter, sans-serif',
                textShadow: '0 4px 40px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
              }}
            >
              {countdown}
            </div>
          )}

          {/* Shutter flash */}
          {flashing && (
            <div
              className="shutter-flash"
              style={{ position: 'absolute', inset: 0, background: '#fff', pointerEvents: 'none' }}
            />
          )}
        </div>

        {/*
          Film strip — the session's record. The stock Pingu poses sit first so
          the strip never looks empty at the start, and your own shots append to
          the right of them in the order you took them, newest at the far end.
        */}
        <div
          ref={stripRef}
          style={{ background: '#2a2a2a', height: 72, display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 2 }}
          className="hide-scrollbar"
        >
          {pinguThumbs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Pingu pose ${i + 1}`}
              style={{ height: 62, width: 'auto', flexShrink: 0, objectFit: 'cover', opacity: 0.55 }}
            />
          ))}

          {filedPolaroids.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="strip-file-in"
              title="Open this photo"
              style={{
                flexShrink: 0, height: 62, padding: 0, border: 'none', background: 'transparent',
                cursor: 'pointer', lineHeight: 0,
              }}
            >
              <img
                src={p.pinguUrl ?? p.photoUrl}
                alt={p.pinguUrl ? 'You as Pingu' : 'Your photo'}
                style={{
                  height: 62, width: 62, objectFit: 'cover', display: 'block',
                  // A thin white edge marks yours apart from the stock frames.
                  border: '2px solid #fff',
                }}
              />
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ background: '#2a2a2a', borderTop: '1px solid #1a1a1a', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          {/* Left icons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {['⊞', '☺', '▭'].map((icon, i) => (
              <button key={i} style={{ width: 28, height: 28, background: i === 1 ? '#3a7bff' : 'transparent', border: 'none', borderRadius: 4, color: i === 1 ? '#fff' : '#aaa', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </button>
            ))}
          </div>

          {/* Camera shutter button */}
          <button
            onClick={takePhoto}
            disabled={!cameraReady || countdown !== null}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: countdown !== null ? '#888' : '#e53935',
              border: '3px solid #fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
              cursor: countdown !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.1s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            aria-label="Take photo"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          {/* Effects button */}
          <button style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#ddd', fontSize: 13, padding: '4px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Effects
          </button>
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Polaroid lightbox */}
      {selectedPolaroid && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedId(null)}
        >
          <div
            style={{ background: '#fff', padding: '16px 16px 28px 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', maxWidth: 400, width: '90%' }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedPolaroid.pinguUrl ?? selectedPolaroid.photoUrl}
              alt={selectedPolaroid.pinguUrl ? 'You as Pingu' : 'Your photo'}
              style={{ width: '100%', display: 'block' }}
            />
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#555', fontFamily: 'Inter, sans-serif' }}>
              {selectedPolaroid.status === 'done' && '🐧 Pingu is doing this pose too!'}
              {selectedPolaroid.status === 'developing' && 'Pingu is copying your pose…'}
              {selectedPolaroid.status === 'failed' && "Pingu couldn't make it — here's your photo."}
            </p>

            {/* Download only appears once there is a finished image to save. */}
            {selectedPolaroid.status !== 'developing' && (
              <button
                onClick={() =>
                  downloadImage(
                    selectedPolaroid.pinguUrl ?? selectedPolaroid.photoUrl,
                    `pingu-photobooth-${selectedPolaroid.id}.png`,
                  ).catch((err: unknown) => console.error('Download failed:', err))
                }
                style={{
                  display: 'block', margin: '18px auto 0', padding: '10px 26px',
                  background: '#14303d', color: '#fff', border: 'none', borderRadius: 999,
                  fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Download
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
