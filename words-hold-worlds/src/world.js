/**
 * A word's world: point-cloud figures placed around the camera, plus the
 * scripted camera path you're carried along when you arrive.
 *
 * Everything is read from worlds.json, in metres. The world is then scaled
 * into the stage's units (CSS pixels on the z = 0 plane) and positioned so
 * that the start of its camera path is exactly where the zoom into the word
 * leaves the camera. That makes the hand-off from word to world seamless.
 */
import * as THREE from 'three';
import worlds from './worlds.json';
import { PointCloud, PLACEHOLDERS, ground, dust, seedFrom } from './placeholders.js';

// One metre in the world, as a fraction of the stage's focal distance.
export const METRE = 0.5;

/** True once a world has been built (its figures are listed in worlds.json). */
export function hasWorld(key) {
  return Boolean(worlds[key]?.figures?.length);
}

/** The world words, and which occurrence of each on the page opens its world. */
export function worldWords() {
  return Object.entries(worlds).map(([key, spec]) => ({ key, occurrence: spec.occurrence ?? 1 }));
}

const vertexShader = /* glsl */ `
  attribute float aShade;
  attribute vec3 aRand;

  uniform float uTime;
  uniform float uShimmer;   // metres
  uniform float uSize;      // CSS px at the focal distance
  uniform float uFocal;
  uniform float uPixelRatio;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uOpacity;

  varying float vAlpha;
  varying float vShade;

  void main() {
    // Breathing static: every point wobbles very slightly on its own phase.
    vec3 p = position + uShimmer * vec3(
      sin(uTime * 0.8 + aRand.x * 40.0),
      sin(uTime * 0.6 + aRand.y * 40.0),
      sin(uTime * 0.7 + aRand.z * 40.0)
    );
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;

    float distance = -view.z;
    gl_PointSize = clamp(uSize * uFocal / distance, 0.75, 7.0) * uPixelRatio;

    // Soft fog: distant points fade into the dark.
    vAlpha = (1.0 - smoothstep(uFogNear, uFogFar, distance)) * uOpacity;
    vShade = aShade * (0.85 + 0.15 * sin(uTime * 2.1 + aRand.y * 60.0));
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vShade;

  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    // White and grey only. Additive blending (below) makes dense areas glow,
    // so the shapes read through how tightly their dots are packed.
    gl_FragColor = vec4(vec3(vShade * vAlpha), 1.0);
  }
`;

export function createWorld(key) {
  const spec = worlds[key];

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uShimmer: { value: 0.004 },
      uSize: { value: 1.5 },
      uFocal: { value: 1 },
      uPixelRatio: { value: 1 },
      uFogNear: { value: 1 },
      uFogFar: { value: 2 },
      uOpacity: { value: 0 },
    },
  });

  const group = new THREE.Group();

  const addPoints = (cloud, figure = {}) => {
    const points = new THREE.Points(cloud.toGeometry(), material);
    points.position.fromArray(figure.position ?? [0, 0, 0]);
    points.rotation.fromArray(figure.rotation ?? [0, 0, 0]);
    points.scale.setScalar(figure.scale ?? 1);
    points.frustumCulled = false; // the shader moves points
    group.add(points);
  };

  // Each figure: a placeholder for now (see placeholders.js). Step 6 swaps
  // in points sampled from the generated model at `figure.model`.
  for (const figure of spec.figures) {
    const cloud = new PointCloud(seedFrom(`${key}/${figure.id}`));
    PLACEHOLDERS[figure.placeholder](cloud, figure.density, figure);
    addPoints(cloud, figure);
  }

  if (spec.environment?.ground) {
    const cloud = new PointCloud(seedFrom(`${key}/ground`));
    ground(cloud, spec.environment.ground);
    addPoints(cloud);
  }
  if (spec.environment?.dust) {
    const cloud = new PointCloud(seedFrom(`${key}/dust`));
    dust(cloud, spec.environment.dust);
    addPoints(cloud);
  }

  // The scripted camera: where it is, and where it looks, over the tour.
  const toCurve = (list) => new THREE.CatmullRomCurve3(list.map((p) => new THREE.Vector3(...p)));
  const path = toCurve(spec.cameraPath);
  // The tour always starts looking straight ahead (-z), the way the camera
  // faces as it comes through the word, so the hand-off has no jump.
  const lookPoints = spec.lookPath.slice();
  lookPoints[0] = [spec.cameraPath[0][0], spec.cameraPath[0][1], spec.cameraPath[0][2] - 1.5];
  const look = toCurve(lookPoints);
  const start = path.getPoint(0);

  let metre = 1;

  return {
    group,
    motion: spec.motion,

    /**
     * Scales the world into stage units and moves it so the start of its
     * camera path sits at `cameraEnd`, where the zoom leaves the camera.
     */
    place(cameraEnd, focal) {
      metre = METRE * focal;
      group.scale.setScalar(metre);
      group.position.copy(cameraEnd).addScaledVector(start, -metre);
      material.uniforms.uFogNear.value = metre * 3;
      material.uniforms.uFogFar.value = metre * 12;
      material.uniforms.uFocal.value = focal;
    },

    /** Camera position on the tour, t from 0 to 1, in stage units. */
    cameraAt(t, out) {
      return path.getPoint(t, out).multiplyScalar(metre).add(group.position);
    },

    /** Where the camera looks on the tour, in stage units. */
    lookAt(t, out) {
      return look.getPoint(t, out).multiplyScalar(metre).add(group.position);
    },

    update({ time, opacity, pixelRatio }) {
      material.uniforms.uTime.value = time;
      material.uniforms.uOpacity.value = opacity;
      material.uniforms.uPixelRatio.value = pixelRatio;
      group.visible = opacity > 0;
    },

    dispose() {
      group.traverse((o) => o.geometry?.dispose());
      material.dispose();
    },
  };
}
