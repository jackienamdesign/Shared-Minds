/**
 * Turns a word on the page into a cloud of dots.
 *
 * 1. sampleWord() draws the word on an offscreen canvas, in the same font,
 *    size and position as on the page, and picks random points inside the
 *    letter shapes.
 * 2. createWordPoints() puts those points on the GPU as a THREE.Points object.
 *    All the motion (growing, breaking apart, depth, shimmer) happens in the
 *    vertex shader, driven by a handful of uniforms set from zoom.js.
 */
import * as THREE from 'three';

// The word is drawn this many times larger than on screen, so the letter
// shapes are smooth enough to sample from.
const SUPERSAMPLE = 8;
// Small margin around the text on the offscreen canvas, in CSS pixels.
const PAD = 2;

/**
 * Samples dots from a word <span>.
 *
 * Returns the dots in "local" coordinates: CSS pixels relative to the word's
 * centre, with y pointing up (three.js convention). Also returns where that
 * centre is on screen and how big the word is.
 */
export function sampleWord(span) {
  const word = span.textContent;
  const style = getComputedStyle(span);
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  // A hyphenated word can wrap onto two lines; its first box is where it starts.
  const rect = span.getClientRects()[0];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.font = font;
  const metrics = ctx.measureText(word);
  const ascent = metrics.fontBoundingBoxAscent;
  const width = Math.ceil(metrics.width) + PAD * 2;
  const height = Math.ceil(ascent + metrics.fontBoundingBoxDescent) + PAD * 2;

  canvas.width = width * SUPERSAMPLE;
  canvas.height = height * SUPERSAMPLE;
  // Draw at the real font size and scale the canvas instead of using a bigger
  // font: Literata changes its letter shapes with size (optical sizing), and
  // the dots should match the 18px letters you actually see.
  ctx.scale(SUPERSAMPLE, SUPERSAMPLE);
  ctx.font = font;
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(word, PAD, PAD + ascent);
  // The selected word is drawn bolder with a text stroke (see style.css);
  // draw the same stroke here so the dots are just as bold.
  const stroke = parseFloat(style.webkitTextStrokeWidth) || 0;
  if (stroke > 0) {
    ctx.lineWidth = stroke;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.strokeText(word, PAD, PAD + ascent);
  }

  // Collect every pixel that is inside a letter.
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const inked = [];
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 127) inked.push((i - 3) / 4);
  }

  // Dot count scales with how much ink the word has, so "a" and
  // "unfortunately" end up about equally dense.
  const inkArea = inked.length / SUPERSAMPLE ** 2; // in CSS px²
  const count = Math.round(Math.min(9000, Math.max(1200, inkArea * 28)));

  // On screen, the top of the canvas text box is the top of the span's box.
  const centreX = rect.left + rect.width / 2;
  const centreY = rect.top + rect.height / 2;

  const local = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const pixel = inked[Math.floor(Math.random() * inked.length)] ?? 0;
    // Random position within the chosen pixel, so dots never sit on a grid.
    const cx = (pixel % canvas.width) + Math.random();
    const cy = Math.floor(pixel / canvas.width) + Math.random();
    const screenX = rect.left + cx / SUPERSAMPLE - PAD;
    const screenY = rect.top + cy / SUPERSAMPLE - PAD;
    local[i * 3] = screenX - centreX;
    local[i * 3 + 1] = centreY - screenY; // flip: screen y goes down, 3D y goes up
    local[i * 3 + 2] = 0;
  }

  return {
    local,
    count,
    centre: { x: centreX, y: centreY },
    size: { width: rect.width, height: rect.height },
  };
}

const vertexShader = /* glsl */ `
  attribute vec3 aRand;   // per-dot random numbers in [-1, 1]
  attribute float aShade; // per-dot brightness variation in [0, 1]

  uniform vec2 uCentre;     // where the word's centre is, in world units
  uniform float uScale;     // how much the word has grown
  uniform float uJitter;    // how far dots have broken away (local px)
  uniform float uDepth;     // how far dots have spread in z (world units)
  uniform float uShimmer;   // breathing-static wobble (world units)
  uniform float uTime;
  uniform float uSize;      // dot size in CSS px, on the z = 0 plane
  uniform float uFocal;     // camera distance where 1 world unit = 1 px
  uniform float uPixelRatio;
  uniform float uFogNear;
  uniform float uFogFar;

  varying float vShade;
  varying float vFog;

  void main() {
    // Break apart: push each dot a little in its own random direction.
    vec2 local = position.xy + aRand.xy * uJitter;

    // Grow the word around its centre and move it to where it should be.
    vec3 world = vec3(uCentre + local * uScale, aRand.z * uDepth);

    // Breathing static: each dot wobbles slowly on its own phase.
    world += uShimmer * vec3(
      sin(uTime * 0.9 + aRand.x * 31.0),
      cos(uTime * 0.7 + aRand.y * 27.0),
      sin(uTime * 0.6 + aRand.z * 23.0)
    );

    vec4 view = modelViewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * view;

    float distance = -view.z;
    // Perspective: dots get bigger as the camera comes close.
    gl_PointSize = min(uSize * uFocal / distance, 12.0) * uPixelRatio;

    // Fog: dots fade out with distance from the camera.
    vFog = 1.0 - smoothstep(uFogNear, uFogFar, distance);
    // Static flicker: brightness drifts a little per dot over time.
    vShade = aShade * (0.85 + 0.15 * sin(uTime * 2.3 + aRand.y * 53.0));
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uShadeAmount; // 0 = every dot the same colour, 1 = varied greys
  uniform float uOpacity;

  varying float vShade;
  varying float vFog;

  void main() {
    // Round, hard-edged dots, like e-ink particles.
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    vec3 color = uColor * mix(1.0, 0.45 + 0.55 * vShade, uShadeAmount);
    gl_FragColor = vec4(color, vFog * uOpacity);
  }
`;

/** Builds the THREE.Points object for a sampled word. */
export function createWordPoints(sample) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(sample.local, 3));

  const rand = new Float32Array(sample.count * 3);
  const shade = new Float32Array(sample.count);
  for (let i = 0; i < sample.count; i++) {
    rand[i * 3] = Math.random() * 2 - 1;
    rand[i * 3 + 1] = Math.random() * 2 - 1;
    rand[i * 3 + 2] = Math.random() * 2 - 1;
    shade[i] = Math.random();
  }
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
  geometry.setAttribute('aShade', new THREE.BufferAttribute(shade, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uCentre: { value: new THREE.Vector2() },
      uScale: { value: 1 },
      uJitter: { value: 0 },
      uDepth: { value: 0 },
      uShimmer: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 1.5 },
      uFocal: { value: 1 },
      uPixelRatio: { value: 1 },
      uFogNear: { value: 1e9 },
      uFogFar: { value: 2e9 },
      uColor: { value: new THREE.Color('#111') },
      uShadeAmount: { value: 0 },
      uOpacity: { value: 1 },
    },
  });

  const points = new THREE.Points(geometry, material);
  // The shader moves every dot, so three.js can't know the real bounds.
  points.frustumCulled = false;
  return points;
}
