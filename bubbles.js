/**
 * Thought bubbles — emergence, drift, and destruction.
 *
 * Deliberately kept outside React. These animate every frame at up to 40
 * instances; re-rendering a component tree at 60fps to move them would be
 * wasteful. React owns the field, this module owns everything that floats.
 *
 * The glass here is a cheap CSS approximation (backdrop-filter + border +
 * highlight), NOT liquid-glass-react. That library runs SVG displacement
 * filters per instance and would collapse the frame rate at this volume. At
 * bubble size the difference is invisible.
 */

const SWELL = 350;   // bulge grows at the field's top edge, still attached
const NECK = 180;    // pinches at the base — the tension moment
const DETACH = 120;  // snaps free with an upward recoil
const WOBBLE = 500;  // damped oscillation, settling
const HOLD = 500;    // rejected only: hangs and drifts, long enough to read
const POP = 70;      // rejected only: sudden and total

const MAX_BUBBLES = 40;
const DRIFT_SPEED = 0.42; // px per frame

// Cursor avoidance. Thoughts you can't quite get near.
const REPEL_RADIUS = 230;
const REPEL_STRENGTH = 1.7;
const MAX_SPEED = DRIFT_SPEED * 9;
// Bubbles bounce without energy loss, so repeated pushes would accelerate them
// forever. This eases each bubble's speed back down to the base drift rate once
// the cursor has moved on.
const SPEED_RECOVERY = 0.022;

const pointer = { x: 0, y: 0, active: false };

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let layer = null;
let bubbles = [];
let running = false;

function ensureLayer() {
  if (layer) return layer;
  layer = document.createElement('div');
  layer.className = 'bubble-layer';
  document.body.appendChild(layer);
  return layer;
}

// --- easing -----------------------------------------------------------------

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;
const lerp = (a, b, t) => a + (b - a) * t;

/** Damped oscillation settling to 1. */
function wobbleAt(t) {
  const decay = Math.exp(-4.2 * t);
  return Math.cos(t * Math.PI * 5.2) * decay;
}

// --- construction -----------------------------------------------------------

function createBubble(text, verdict, origin) {
  const anchor = document.createElement('div');
  anchor.className = 'bubble-anchor';

  const body = document.createElement('div');
  body.className = 'bubble-body';

  const label = document.createElement('span');
  label.className = 'bubble-text';
  label.textContent = text;

  body.appendChild(label);
  anchor.appendChild(body);
  ensureLayer().appendChild(anchor);

  const rect = body.getBoundingClientRect();

  return {
    anchor,
    body,
    verdict,
    stage: 'swell',
    elapsed: 0,
    w: rect.width,
    h: rect.height,
    // Centre point. Starts level with the field's top edge and rises out of it.
    x: origin.x,
    y: origin.y,
    originY: origin.y,
    vx: (Math.random() - 0.5) * DRIFT_SPEED * 1.4,
    vy: -DRIFT_SPEED,
    sway: Math.random() * Math.PI * 2,
    born: performance.now(),
    dead: false
  };
}

// --- per-frame --------------------------------------------------------------

function drawBubble(b, sx, sy, opacity) {
  b.anchor.style.transform = `translate3d(${b.x - b.w / 2}px, ${b.y - b.h / 2}px, 0)`;
  b.body.style.transform = `scale(${sx}, ${sy})`;
  if (opacity !== undefined) b.body.style.opacity = String(opacity);
}

function advance(b, dt, now) {
  b.elapsed += dt;

  switch (b.stage) {
    // 1. Swell — a bulge grows at the aperture, still attached.
    case 'swell': {
      const t = clamp01(b.elapsed / SWELL);
      const e = easeOut(t);
      const s = lerp(0.15, 1, e);
      // Rises out from behind the field's top edge as it fills out.
      b.y = b.originY - (b.h / 2) * e;
      drawBubble(b, s, s, lerp(0, 1, clamp01(t * 2)));
      if (t >= 1) { b.stage = 'neck'; b.elapsed = 0; }
      break;
    }

    // 2. Neck — pinches inward behind the bulge and is drawn upward.
    case 'neck': {
      const t = clamp01(b.elapsed / NECK);
      const e = easeIn(t);
      drawBubble(b, lerp(1, 0.78, e), lerp(1, 1.15, e), 1);
      b.y -= 0.35;
      if (t >= 1) { b.stage = 'detach'; b.elapsed = 0; }
      break;
    }

    // 3. Detach — snaps free, releasing the pinch with an upward recoil.
    case 'detach': {
      const t = clamp01(b.elapsed / DETACH);
      const e = easeOut(t);
      drawBubble(b, lerp(0.78, 1.12, e), lerp(1.15, 0.9, e), 1);
      b.y -= lerp(1.4, 0.4, e);
      if (t >= 1) { b.stage = reduceMotion ? 'drift' : 'wobble'; b.elapsed = 0; }
      break;
    }

    // 4. Wobble — over-round, over-flat, settling.
    case 'wobble': {
      const t = clamp01(b.elapsed / WOBBLE);
      const w = wobbleAt(t) * 0.12;
      drawBubble(b, 1 + w, 1 - w, 1);
      integrate(b);
      if (t >= 1) { b.stage = 'drift'; b.elapsed = 0; }
      break;
    }

    // 5. Drift — physics owns it now.
    case 'drift': {
      integrate(b);
      drawBubble(b, 1, 1, 1);
      if (b.verdict === 'rejected' && b.elapsed >= HOLD) {
        pop(b, now);
      }
      break;
    }

    case 'popping':
      // Handed off to the Web Animations API; nothing to do per frame.
      break;
  }
}

/** Push away from the cursor, softly at the edge of range and hard up close. */
function repel(b) {
  if (!pointer.active) return;

  const dx = b.x - pointer.x;
  const dy = b.y - pointer.y;
  const dist = Math.hypot(dx, dy);

  if (dist >= REPEL_RADIUS) return;

  // Quadratic falloff: barely noticeable at the boundary, decisive near the
  // centre. Linear falloff reads as a uniform shove and feels mechanical.
  const falloff = 1 - dist / REPEL_RADIUS;
  const push = falloff * falloff * REPEL_STRENGTH;

  // Guard the degenerate case of the cursor exactly on the centre.
  const nx = dist > 0.001 ? dx / dist : Math.cos(b.sway);
  const ny = dist > 0.001 ? dy / dist : Math.sin(b.sway);

  b.vx += nx * push;
  b.vy += ny * push;
}

/** Ease speed back toward the base drift rate, and never let it run away. */
function governSpeed(b) {
  const speed = Math.hypot(b.vx, b.vy);
  if (speed < 0.0001) return;

  const eased = speed + (DRIFT_SPEED - speed) * SPEED_RECOVERY;
  const capped = Math.min(eased, MAX_SPEED);

  b.vx = (b.vx / speed) * capped;
  b.vy = (b.vy / speed) * capped;
}

function integrate(b) {
  repel(b);
  governSpeed(b);

  b.sway += 0.012;
  b.x += b.vx + Math.sin(b.sway) * 0.16;
  b.y += b.vy;

  // Bounce off all four edges, no energy loss.
  const halfW = b.w / 2;
  const halfH = b.h / 2;

  if (b.x - halfW <= 0) { b.x = halfW; b.vx = Math.abs(b.vx); }
  if (b.x + halfW >= window.innerWidth) { b.x = window.innerWidth - halfW; b.vx = -Math.abs(b.vx); }
  if (b.y - halfH <= 0) { b.y = halfH; b.vy = Math.abs(b.vy); }
  if (b.y + halfH >= window.innerHeight) { b.y = window.innerHeight - halfH; b.vy = -Math.abs(b.vy); }
}

// --- destruction ------------------------------------------------------------

/**
 * A bubble's film retracts outward when it pops — it expands, it does not
 * shrink. Scaling toward 0 reads as "sucked away" rather than "popped", which
 * is the usual way this animation fails.
 */
function pop(b, now) {
  b.stage = 'popping';

  if (typeof b.onPop === 'function') b.onPop();

  if (reduceMotion) {
    b.body.style.opacity = '0';
    window.setTimeout(() => destroy(b), 120);
    return;
  }

  b.body.classList.add('is-flashing');
  window.setTimeout(() => b.body.classList.remove('is-flashing'), 25);

  spray(b);

  const anim = b.body.animate(
    [
      { transform: 'scale(1, 1)', opacity: 1 },
      { transform: 'scale(1.12, 1.12)', opacity: 0 }
    ],
    { duration: POP, easing: 'cubic-bezier(0.2, 0, 0.6, 1)', fill: 'forwards' }
  );

  anim.onfinish = () => destroy(b);
}

/** Fine droplet burst from the rim. */
function spray(b) {
  const count = 10 + Math.floor(Math.random() * 5);
  const radius = Math.max(b.w, b.h) / 2;

  for (let i = 0; i < count; i++) {
    const drop = document.createElement('div');
    drop.className = 'bubble-drop';
    const size = 2 + Math.random() * 2;
    drop.style.width = `${size}px`;
    drop.style.height = `${size}px`;
    drop.style.left = `${b.x}px`;
    drop.style.top = `${b.y}px`;
    ensureLayer().appendChild(drop);

    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = radius * (0.7 + Math.random() * 0.8);

    const anim = drop.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 0.85 },
        {
          transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist + 14}px) scale(0.4)`,
          opacity: 0
        }
      ],
      { duration: 300 + Math.random() * 120, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards' }
    );

    anim.onfinish = () => drop.remove();
  }
}

function destroy(b) {
  b.dead = true;
  b.anchor.remove();
}

/** Oldest bubble fades out when the cap is exceeded. */
function evictOldest() {
  const survivors = bubbles.filter((b) => b.stage !== 'popping' && !b.dead);
  if (survivors.length <= MAX_BUBBLES) return;

  const oldest = survivors[0];
  oldest.stage = 'popping';
  const anim = oldest.body.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: 700, easing: 'ease-out', fill: 'forwards' }
  );
  anim.onfinish = () => destroy(oldest);
}

// --- loop -------------------------------------------------------------------

let last = 0;

function frame(now) {
  const dt = last ? Math.min(now - last, 48) : 16;
  last = now;

  for (const b of bubbles) {
    if (!b.dead) advance(b, dt, now);
  }
  bubbles = bubbles.filter((b) => !b.dead);

  if (bubbles.length === 0) {
    running = false;
    last = 0;
    return;
  }
  requestAnimationFrame(frame);
}

function start() {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}

// --- public -----------------------------------------------------------------

/**
 * @param {string} text     the thought
 * @param {'floating'|'rejected'} verdict
 * @param {{x:number,y:number}} origin  the field's top edge, in viewport coords
 * @param {() => void} [onPop]  fired at the instant of the pop, not at submit
 */
export function spawnThought(text, verdict, origin, onPop) {
  const b = createBubble(text, verdict, origin);
  b.onPop = onPop;
  bubbles.push(b);
  evictOldest();
  start();
}

// Everything layered above the bubbles is pointer-events:none, so these fire
// even when the cursor is over the field. Both event names are bound:
// pointermove covers mouse/pen/touch, and mousemove is the belt-and-braces
// fallback for anywhere pointer events don't land. Whichever arrives first
// wins; they write the same two numbers, so double-binding is harmless.
function trackPointer(e) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.active = true;
}

window.addEventListener('pointermove', trackPointer, { passive: true });
window.addEventListener('mousemove', trackPointer, { passive: true });

// On leave, park the pointer far off-screen rather than clearing `active`.
// A spurious leave event then costs nothing — the next move corrects it — where
// toggling a flag could silently disable repulsion for good.
function parkPointer() {
  pointer.x = -99999;
  pointer.y = -99999;
}

document.addEventListener('mouseleave', parkPointer);

window.addEventListener('resize', () => {
  for (const b of bubbles) {
    b.x = Math.min(Math.max(b.x, b.w / 2), window.innerWidth - b.w / 2);
    b.y = Math.min(Math.max(b.y, b.h / 2), window.innerHeight - b.h / 2);
  }
});
