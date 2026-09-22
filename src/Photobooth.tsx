import { useRef, useState, useEffect, useCallback } from 'react';

// BASE_URL carries the GitHub Pages subpath in production and "/" in dev, so
// these stay correct in both. It always ends in a slash.
const assetPathPrefix = `${import.meta.env.BASE_URL}assets`;

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

interface Polaroid {
  id: number;
  dataUrl: string;
  rot: number;
  x: number;
  y: number;
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
  const [selectedPolaroid, setSelectedPolaroid] = useState<Polaroid | null>(null);
  const polaroidIdRef = useRef(0);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraReady(true);
          };
        }
      } catch {
        setCameraError(true);
      }
    }
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
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

      const rot = (Math.random() - 0.5) * 12;
      const x = 15 + Math.random() * 55;
      const y = 10 + Math.random() * 50;

      const newPolaroid: Polaroid = {
        id: ++polaroidIdRef.current,
        dataUrl,
        rot,
        x,
        y,
      };
      setPolaroids(prev => [...prev, newPolaroid]);
    }
  }, [countdown]);

  return (
    <div className="relative w-full min-h-screen overflow-hidden" style={{ background: '#afe7ff' }}>
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

      {/* Background decorative blobs */}
      <img
        src={`${assetPathPrefix}/7d335.svg`}
        alt=""
        className="absolute pointer-events-none"
        style={{ left: 93, top: 126, width: 405, height: 405 }}
      />
      <img
        src={`${assetPathPrefix}/a45aa.svg`}
        alt=""
        className="absolute pointer-events-none"
        style={{ left: 250, top: 101, width: 307, height: 307 }}
      />
      <img
        src={`${assetPathPrefix}/605b9.svg`}
        alt=""
        className="absolute pointer-events-none"
        style={{ left: 1025, top: 802, width: 343, height: 343 }}
      />
      <img
        src={`${assetPathPrefix}/9c726.svg`}
        alt=""
        className="absolute pointer-events-none"
        style={{ left: 0, top: 551, width: '100%', height: 511, zIndex: 1 }}
      />
      <img
        src={`${assetPathPrefix}/92ee6.svg`}
        alt=""
        className="absolute pointer-events-none"
        style={{ left: -81, top: 724, width: 499, height: 499 }}
      />
      <img
        src={`${assetPathPrefix}/15dc9.svg`}
        alt=""
        className="absolute pointer-events-none"
        style={{ left: 843, top: 503, width: 424, height: 424, zIndex: 0 }}
      />

      {/* Tip pill */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center px-5 py-3 rounded-full"
        style={{ top: 36, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', whiteSpace: 'nowrap' }}
      >
        <span style={{ fontFamily: '"Inter:Regular", Inter, sans-serif', fontSize: 18, fontWeight: 400, color: '#111' }}>
          Tip: Make a cute gesture with your hands!
        </span>
      </div>

      {/* Polaroids layer — scattered behind the window */}
      {polaroids.map(p => (
        <div
          key={p.id}
          className="absolute polaroid-enter cursor-pointer"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            ['--rot' as string]: `${p.rot}deg`,
            transform: `rotate(${p.rot}deg)`,
            zIndex: 5,
          }}
          onClick={() => setSelectedPolaroid(p)}
        >
          <div style={{
            background: '#fff',
            padding: '10px 10px 40px 10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            width: 160,
          }}>
            <img src={p.dataUrl} alt="captured" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
            <div style={{ textAlign: 'center', paddingTop: 10, fontSize: 12, color: '#888', fontFamily: 'Inter, sans-serif' }}>
              🐧 Pingu pose
            </div>
          </div>
        </div>
      ))}

      {/* macOS Photo Booth window */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: 96,
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
          {cameraReady && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
            />
          )}
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

        {/* Film strip */}
        <div style={{ background: '#2a2a2a', height: 72, display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 2 }}
          className="hide-scrollbar"
        >
          {pinguThumbs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Pingu pose ${i + 1}`}
              style={{ height: 62, width: 'auto', flexShrink: 0, objectFit: 'cover', cursor: 'pointer', opacity: 0.9 }}
            />
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
          onClick={() => setSelectedPolaroid(null)}
        >
          <div
            style={{ background: '#fff', padding: '16px 16px 64px 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', maxWidth: 400, width: '90%' }}
            onClick={e => e.stopPropagation()}
          >
            <img src={selectedPolaroid.dataUrl} alt="captured" style={{ width: '100%', display: 'block' }} />
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#555', fontFamily: 'Inter, sans-serif' }}>
              🐧 Pingu is doing this pose too!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
