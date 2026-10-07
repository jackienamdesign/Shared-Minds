/**
 * The index for the Shared Minds coursework — a picker that fronts every piece
 * in this repo.
 *
 * Previews are built in CSS rather than screenshotted, so they never go stale
 * when a piece is edited.
 */

const ink = '#14303d';
const muted = 'rgba(20, 48, 61, 0.62)';

/** Week 1 runs as a standalone no-build page, so it needs a real navigation. */
const week1Href = `${import.meta.env.BASE_URL}week1/`;
/** Week 4 Prayer Board runs as its own gentle vanilla JS application. */
const week4Href = `${import.meta.env.BASE_URL}week4/`;

function Week1Preview() {
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: 'linear-gradient(170deg, #68b8d7 0%, #9dc9e3 55%, #d6e4f0 100%)' }}
    >
      {/* Drifting cloud masses */}
      <div style={{ position: 'absolute', left: '-10%', top: '18%', width: '60%', height: '46%', borderRadius: '50%', background: 'rgba(255,255,255,0.72)', filter: 'blur(18px)' }} />
      <div style={{ position: 'absolute', right: '-8%', top: '42%', width: '55%', height: '50%', borderRadius: '50%', background: 'rgba(255,255,255,0.6)', filter: 'blur(20px)' }} />
      <div style={{ position: 'absolute', left: '28%', top: '58%', width: '48%', height: '40%', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', filter: 'blur(22px)' }} />

      {/* The thought field's glass pill */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: 'translate(-50%, -50%)',
          padding: '10px 22px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.3)',
          border: '1px solid rgba(255,255,255,0.75)',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 6px 24px rgba(24, 53, 80, 0.16)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.95)',
          whiteSpace: 'nowrap',
        }}
      >
        what are you thinking?
      </div>
    </div>
  );
}

function Week3Preview() {
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#afe7ff' }}>
      <div style={{ position: 'absolute', left: '-12%', bottom: '-30%', width: '58%', paddingTop: '58%', borderRadius: '50%', background: 'rgba(255,255,255,0.45)' }} />
      <div style={{ position: 'absolute', right: '-10%', top: '-24%', width: '46%', paddingTop: '46%', borderRadius: '50%', background: 'rgba(255,255,255,0.38)' }} />

      {/* Miniature of the Photo Booth window */}
      <div
        className="absolute left-1/2"
        style={{
          transform: 'translateX(-50%)',
          top: '20%',
          width: '62%',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#1e1e1e',
          boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ background: '#383838', height: 14, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF5F57' }} />
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FEBC2E' }} />
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div style={{ height: 52, background: 'linear-gradient(160deg, #6f6f6f, #4a4a4a)' }} />
        <div style={{ height: 16, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e53935', border: '1.5px solid #fff' }} />
        </div>
      </div>

      {/* A polaroid that just dropped */}
      <div
        className="absolute"
        style={{ right: '9%', bottom: '8%', background: '#fff', padding: '4px 4px 12px', width: 42, transform: 'rotate(8deg)', boxShadow: '0 6px 18px rgba(0,0,0,0.22)' }}
      >
        <div style={{ height: 30, background: 'linear-gradient(150deg, #cfd8dc, #90a4ae)' }} />
      </div>
    </div>
  );
}

function Week4Preview() {
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #fdf8f5 0%, #f7eee7 48%, #eef5f0 100%)' }}
    >
      {/* Soft pastel ambient glow */}
      <div style={{ position: 'absolute', left: '-10%', top: '10%', width: '60%', height: '50%', borderRadius: '50%', background: 'rgba(254, 226, 226, 0.55)', filter: 'blur(20px)' }} />
      <div style={{ position: 'absolute', right: '-10%', bottom: '5%', width: '55%', height: '55%', borderRadius: '50%', background: 'rgba(209, 250, 229, 0.45)', filter: 'blur(22px)' }} />

      {/* Gentle sticky note 1 (background tilt) */}
      <div
        className="absolute"
        style={{
          left: '18%',
          top: '22%',
          width: 96,
          height: 104,
          borderRadius: 10,
          background: '#fef3c7',
          boxShadow: '0 8px 24px rgba(180, 83, 9, 0.08)',
          transform: 'rotate(-7deg)',
          padding: '10px 8px',
          border: '1px solid rgba(251, 191, 36, 0.3)',
        }}
      >
        <div style={{ width: '70%', height: 4, borderRadius: 2, background: 'rgba(180, 83, 9, 0.25)', marginBottom: 6 }} />
        <div style={{ width: '90%', height: 3, borderRadius: 2, background: 'rgba(180, 83, 9, 0.15)', marginBottom: 4 }} />
        <div style={{ width: '55%', height: 3, borderRadius: 2, background: 'rgba(180, 83, 9, 0.15)' }} />
      </div>

      {/* Gentle sticky note 2 (foreground tilt with candle) */}
      <div
        className="absolute"
        style={{
          right: '20%',
          top: '26%',
          width: 108,
          height: 114,
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 12px 28px rgba(71, 85, 105, 0.12)',
          transform: 'rotate(5deg)',
          padding: '12px 10px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#059669', background: '#d1fae5', padding: '1px 5px', borderRadius: 6 }}>
              gratitude
            </span>
            <span style={{ fontSize: 10 }}>🌷</span>
          </div>
          <div style={{ width: '85%', height: 4, borderRadius: 2, background: '#cbd5e1', marginBottom: 5 }} />
          <div style={{ width: '65%', height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: '#fef3c7', borderRadius: 999, width: 'fit-content' }}>
          <span style={{ fontSize: 10 }}>🕯️</span>
          <span style={{ fontSize: 8, fontWeight: 600, color: '#92400e' }}>I prayed</span>
        </div>
      </div>
    </div>
  );
}

interface PieceProps {
  week: string;
  title: string;
  blurb: string;
  preview: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

function Piece({ week, title, blurb, preview, href, onClick }: PieceProps) {
  const inner = (
    <>
      <div style={{ height: 196, borderRadius: 14, overflow: 'hidden', background: '#e7eef2' }}>{preview}</div>
      <div style={{ paddingTop: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: muted }}>
          {week}
        </span>
        <h2 style={{ margin: '8px 0 0', fontSize: 23, fontWeight: 500, color: ink, lineHeight: 1.25 }}>{title}</h2>
        <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: muted }}>{blurb}</p>
      </div>
      <span style={{ display: 'inline-block', marginTop: 18, fontSize: 14, fontWeight: 500, color: '#1d7fa8' }}>
        Explore →
      </span>
    </>
  );

  const style: React.CSSProperties = {
    display: 'block',
    textAlign: 'left',
    width: '100%',
    background: 'rgba(255,255,255,0.86)',
    border: '1px solid rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 18,
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '0 10px 40px rgba(24, 53, 80, 0.1)',
    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
    font: 'inherit',
  };

  const lift = (e: React.MouseEvent<HTMLElement>, on: boolean) => {
    e.currentTarget.style.transform = on ? 'translateY(-5px)' : 'translateY(0)';
    e.currentTarget.style.boxShadow = on
      ? '0 20px 54px rgba(24, 53, 80, 0.18)'
      : '0 10px 40px rgba(24, 53, 80, 0.1)';
  };

  const shared = {
    style,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => lift(e, true),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => lift(e, false),
  };

  return href ? (
    <a href={href} {...shared}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} {...shared}>
      {inner}
    </button>
  );
}

export default function Landing() {
  return (
    <div
      className="w-full min-h-screen"
      style={{ background: 'linear-gradient(185deg, #eaf6fc 0%, #d4ebf7 48%, #c3e2f2 100%)' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 28px 88px' }}>
        <header style={{ marginBottom: 56 }}>
          <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: muted }}>
            Shared Minds · ITP
          </span>
          <h1 style={{ margin: '18px 0 0', fontSize: 'clamp(34px, 5.5vw, 54px)', fontWeight: 300, letterSpacing: '-0.02em', color: ink, lineHeight: 1.1 }}>
            Jackie Nam
          </h1>
          <p style={{ margin: '20px 0 0', maxWidth: 620, fontSize: 17, lineHeight: 1.6, color: muted }}>
            A set of interactive pieces exploring human-machine cognition, creative agency,
            and collaborative storytelling across parallel realities.
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 28,
            alignItems: 'start',
          }}
        >
          <Piece
            week="Weeks 01 — 02"
            title="Stream of Consciousness"
            blurb="Type your worries into an open sky. Is it productive? Does it push your productivity forward? If not, it'll disappear into the sky."
            preview={<Week1Preview />}
            href={week1Href}
          />
          <Piece
            week="Week 03"
            title="Pingu Photobooth"
            blurb="Pingu was my favorite show growing up and his expressions were so expressive. Take a photo of yourself and embody the Pingu spirit."
            preview={<Week3Preview />}
            onClick={() => {
              window.location.hash = '#/photobooth';
            }}
          />
          <Piece
            week="Week 04"
            title="Prayer Board"
            blurb="A cozy, gentle social board where people post things they need prayer for and hold space for others. Calm, kind, and strictly non-competitive."
            preview={<Week4Preview />}
            href={week4Href}
          />
        </div>

        <footer style={{ marginTop: 72, fontSize: 13.5, color: muted }}>
          <a
            href="https://github.com/jackienamdesign/Shared-Minds"
            style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Source on GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}
