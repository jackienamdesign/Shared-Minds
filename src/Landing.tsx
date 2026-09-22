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
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '96px 28px 88px' }}>
        <header style={{ marginBottom: 56 }}>
          <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: muted }}>
            Shared Minds · ITP
          </span>
          <h1 style={{ margin: '18px 0 0', fontSize: 'clamp(34px, 5.5vw, 54px)', fontWeight: 300, letterSpacing: '-0.02em', color: ink, lineHeight: 1.1 }}>
            Jackie Nam
          </h1>
          <p style={{ margin: '20px 0 0', maxWidth: 560, fontSize: 17, lineHeight: 1.6, color: muted }}>
            A set of interactive pieces about attention, thought, and what it feels like
            to be seen by a machine. Pick one to explore.
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
