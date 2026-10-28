/**
 * The zoom into a word.
 *
 * Once a word is selected, scrolling no longer moves the page. Instead every
 * scroll adds to a single `progress` value from 0 to 1, and everything on
 * screen is a function of that one number — so the whole transition is
 * continuous, and scrolling back plays it in reverse.
 *
 *   0 ── stage 1 ── 0.34 ─ stage 2 ─ 0.5 ── stage 3 ── 0.75 ── stage 4 ── 1
 *   the word grows    the page dips    white dots rise,   the world's camera
 *   and breaks into   to black         the camera pushes  tour: a short scripted
 *   black dots                         through the word   shot, carried by scroll
 *
 * The camera tour is driven by scrolling too, not by a timer, so the camera
 * only ever moves when you scroll or drag, and scrolling back always brings
 * it back the way it came. Once inside, drag to look around.
 */
import * as THREE from 'three';
import { sampleWord, createWordPoints } from './word-dots.js';
import { hasWorld, createWorld } from './world.js';
import { createLook } from './look.js';

// How much scrolling (in pixels of wheel movement) takes you all the way in.
const SCROLL_LENGTH = 3200;
// The dip to black: the page darkens from DIM_START to SPLIT…
const DIM_START = 0.34;
const SPLIT = 0.5;
// …and the dots come back, white, from SPLIT to LIGHT_END.
const LIGHT_END = 0.6;
// The push through the word ends here, and the world's camera tour begins.
// From here on you can also drag to look around.
const PUSH_END = 0.75;
// How far the camera travels through the word, in focal lengths.
const PUSH = 1.7;
// How quickly the shown progress catches up with your scrolling (per second).
// This is what gives the motion its slow easing.
const FOLLOW_RATE = 5;

const INK = '#111';
const PAPER = [236, 235, 228]; // #ecebe4, the page colour, as RGB
const LIGHT = '#ffffff';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (lo, hi, x) => {
  const t = clamp01((x - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

export function createZoom({ stage, page, veil, onEnter, onRelease }) {
  const root = document.documentElement;
  const look = createLook(stage.renderer.domElement);

  let span = null; // the selected word
  let points = null; // its dots, once sampled
  let sample = null;
  let world = null; // the word's world, if it has one
  let target = 0; // where your scrolling says progress should be
  let progress = 0; // what is shown; eases toward target
  let releasing = false; // zooming back out on its own (Escape)
  let entered = false; // has this word started zooming yet?
  let frameId = 0; // the pending requestAnimationFrame, 0 when stopped
  let lastTime = 0;

  // Reused every frame, to avoid making garbage.
  const cameraPos = new THREE.Vector3();
  const cameraLook = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);

  // ── Attaching to a word ────────────────────────────────────────

  function attach(newSpan) {
    detach();
    span = newSpan;
    sample = sampleWord(span);
    points = createWordPoints(sample);
    stage.scene.add(points);

    // Only the marked world words (see worlds.json) open into a world.
    const key = span.dataset.world;
    if (key && hasWorld(key)) {
      world = createWorld(key);
      placeWorld();
      stage.scene.add(world.group);
    }

    target = progress = 0;
    releasing = false;
    entered = false;
    // Lock reading scroll: from now on, scroll means zoom.
    root.classList.add('is-zoom-locked');
    startLoop();
  }

  /** Puts the start of the world's tour where the zoom leaves the camera. */
  function placeWorld() {
    world.place(new THREE.Vector3(0, 0, stage.focal * (1 - PUSH)), stage.focal);
  }

  function detach() {
    if (!span) return;
    stage.scene.remove(points);
    points.geometry.dispose();
    points.material.dispose();
    if (world) {
      stage.scene.remove(world.group);
      world.dispose();
    }
    span.classList.remove('is-lifted');
    span = points = sample = world = null;
    target = progress = 0;
    releasing = false;
    look.setEnabled(false);
    setMode('paper');
    veil.style.opacity = '0';
    root.style.backgroundColor = '';
    page.style.opacity = '';
    stage.renderer.domElement.classList.remove('is-visible');
    root.classList.remove('is-zoom-locked');
    stopLoop();
  }

  /** Zoom all the way back out, then let go of the word. */
  function release() {
    if (!span) return;
    target = 0;
    releasing = true;
  }

  // ── Input: wheel, touch and keys all nudge `target` ───────────

  function nudge(pixels) {
    if (!span) return;
    if (pixels > 0) releasing = false; // scrolling in cancels an Escape
    target = clamp01(target + pixels / SCROLL_LENGTH);
    // Scrolling back past the start means "I'm done with this word".
    if (pixels < 0 && target === 0) release();
  }

  window.addEventListener(
    'wheel',
    (event) => {
      if (!span) return; // no word selected: normal reading scroll
      event.preventDefault();
      // Wheels can report in lines or pages instead of pixels.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      nudge(event.deltaY * unit);
    },
    { passive: false }
  );

  let touchY = null;
  window.addEventListener('touchstart', (event) => {
    touchY = event.touches[0].clientY;
  });
  window.addEventListener(
    'touchmove',
    (event) => {
      if (!span || touchY === null) return;
      event.preventDefault();
      const y = event.touches[0].clientY;
      nudge((touchY - y) * 2.5); // swipe up = zoom in, like scrolling down
      touchY = y;
    },
    { passive: false }
  );

  window.addEventListener('keydown', (event) => {
    if (!span) return;
    const step = SCROLL_LENGTH * 0.08;
    if (['ArrowDown', 'PageDown', ' '].includes(event.key)) nudge(step);
    else if (['ArrowUp', 'PageUp'].includes(event.key)) nudge(-step);
    else return;
    event.preventDefault();
  });

  // The page reflows on resize, so the word may have moved: re-sample it
  // (and rebuild its world) once the resizing has settled.
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    stage.resize();
    if (world) placeWorld();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!span) return;
      const keep = { target, progress, releasing };
      attach(span);
      ({ target, progress, releasing } = keep);
    }, 200);
  });

  function setMode(mode) {
    if (root.dataset.mode !== mode) root.dataset.mode = mode;
  }

  // ── Every frame: progress → what you see ──────────────────────

  function startLoop() {
    if (frameId) return;
    lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stopLoop() {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // Ease the shown progress toward the scroll target. Frame-rate
    // independent: the same feel at 60Hz and 120Hz.
    progress += (target - progress) * (1 - Math.exp(-FOLLOW_RATE * dt));
    if (Math.abs(target - progress) < 0.0005) progress = target;

    // Fully zoomed back out after Escape / scrolling up: let go of the word.
    if (releasing && progress === 0) {
      detach();
      onRelease();
      return;
    }

    // The first bit of zoom on this word (used to retire the hint).
    if (!entered && progress > 0.01) {
      entered = true;
      onEnter?.();
    }

    // You can look around once you're through the word.
    look.setEnabled(progress > PUSH_END);
    look.update(dt);

    update(progress, now / 1000);
    stage.render();
    frameId = requestAnimationFrame(frame);
  }

  function update(p, time) {
    const { camera, focal, width, height } = stage;
    const u = points.material.uniforms;
    const pixelRatio = stage.renderer.getPixelRatio();

    const a = clamp01(p / SPLIT); // stage 1, 0 → 1
    const b = clamp01((p - SPLIT) / (PUSH_END - SPLIT)); // stage 3, 0 → 1
    const tour = clamp01((p - PUSH_END) / (1 - PUSH_END)); // stage 4, 0 → 1

    // The DOM word hands over to its dots the moment you start zooming.
    // A flat swap (no fade), which is how an e-ink panel would do it.
    const showDots = p > 0.003;
    span.classList.toggle('is-lifted', showDots);
    stage.renderer.domElement.classList.toggle('is-visible', showDots);

    // ── Stage 1: grow, move to the centre, break apart ──
    // How big the word ends up: about 60% of the screen width, capped so a
    // one-letter word doesn't become enormous.
    const fullScale = Math.min(
      (0.6 * width) / sample.size.width,
      (0.4 * height) / sample.size.height,
      60
    );
    const grow = easeInOut(a);
    // Exponential growth reads as a steady zoom, rather than slow-then-fast.
    u.uScale.value = Math.pow(fullScale, grow);
    // Screen position → world position (origin at the screen centre, y up).
    const startX = sample.centre.x - width / 2;
    const startY = height / 2 - sample.centre.y;
    u.uCentre.value.set(lerp(startX, 0, grow), lerp(startY, 0, grow));

    // The rest of the page steps down in a few flat levels, e-ink style.
    page.style.opacity = String(1 - 0.75 * (Math.floor(a * 4) / 4));

    // ── Stage 2: a smooth dip to black ──
    // A black veil rises over the paper. The black dots sink into it, then
    // come back up out of the dark as white dots.
    const night = smoothstep(DIM_START, SPLIT, p);
    veil.style.opacity = String(night);
    // The strip kept for the scrollbar shows the page's own background, so
    // darken that in step with the veil.
    root.style.backgroundColor = night > 0 ? `rgb(${PAPER.map((c) => Math.round(c * (1 - night)))})` : '';
    setMode(night >= 0.999 ? 'dark' : 'paper');
    const isLight = p >= SPLIT;
    const whiteIn = smoothstep(SPLIT, LIGHT_END, p);

    // ── Stage 3: depth, and the camera pushing through ──
    // Just after the dip the letters still hold together, so you see the
    // word again in white. They come apart as the camera reaches them
    // (it passes through the word's plane at about b = 0.55).
    const apart = smoothstep(0.3, 0.9, b);
    u.uJitter.value = 0.45 * a * a + 2.2 * apart;
    // A hint of depth straight away (for parallax), then a deep spread.
    u.uDepth.value = focal * (0.06 * b + 1.15 * apart);

    // The camera: pushed through the word, then carried along the world's
    // tour. The push is an offset on top of the tour, so the two join up.
    const pushZ = focal * (1 - PUSH * easeInOut(b));
    if (world) {
      const t = easeInOut(tour);
      world.cameraAt(t, cameraPos);
      world.lookAt(t, cameraLook);
      const offset = pushZ - focal * (1 - PUSH);
      cameraPos.z += offset;
      cameraLook.z += offset;
    } else {
      cameraPos.set(0, 0, pushZ);
      cameraLook.set(0, 0, pushZ - 1);
    }

    // At the very end, a faint breathing drift. The camera and the point it
    // looks at move together, so the view never turns on its own.
    const breathe = smoothstep(0.97, 1, p) * focal * 0.006;
    const bx = breathe * Math.sin(time * 0.4);
    const by = breathe * 0.6 * Math.sin(time * 0.31 + 1);
    cameraPos.x += bx;
    cameraPos.y += by;
    cameraLook.x += bx;
    cameraLook.y += by;

    camera.position.copy(cameraPos);
    camera.lookAt(cameraLook);
    // Your drag turns the head on top of all that. Left/right turns around
    // the world's vertical axis (not the camera's own, which is tilted when
    // looking down) so the horizon stays level. Scrolling back out of the
    // world fades the drag away, so the word is always where you left it.
    const lookWeight = smoothstep(PUSH_END, PUSH_END + 0.06, p);
    turn.setFromAxisAngle(UP, look.yaw * lookWeight);
    camera.quaternion.premultiply(turn);
    camera.rotateX(look.pitch * lookWeight);

    // ── Colour: ink on paper before the dip, white static after ──
    u.uColor.value.set(isLight ? LIGHT : INK);
    u.uShadeAmount.value = isLight ? 1 : 0;
    // The word's leftover dots fade back as the world takes over.
    u.uOpacity.value = isLight ? whiteIn * (world ? 1 - 0.6 * tour : 1) : 1;
    u.uSize.value = isLight ? 2.2 : 1.4 + 0.8 * a;
    u.uShimmer.value = isLight ? 2.5 * b : 0;
    u.uFogNear.value = isLight ? focal * 1.05 : 1e9;
    u.uFogFar.value = isLight ? focal * 2.4 : 2e9;
    u.uTime.value = time;
    u.uFocal.value = focal;
    u.uPixelRatio.value = pixelRatio;

    // The world fades up out of the fog as you pass through the letters.
    world?.update({ time, opacity: smoothstep(0.55, 0.95, b), pixelRatio });
  }

  return {
    attach,
    detach,
    release,
    get progress() {
      return progress;
    },
  };
}
