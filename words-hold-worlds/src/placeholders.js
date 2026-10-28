/**
 * Placeholder figures, made only of points.
 *
 * Until the real 3D models are generated (step 6), every figure in a world is
 * built here from a few simple shapes — ellipsoids, capsules, boxes — with
 * points scattered over their surfaces. A share of points drift off each
 * surface as haze, so the figures read like the dotted reference image rather
 * than like solid geometry.
 *
 * All sizes are in metres. Each figure faces +z unless noted.
 */
import * as THREE from 'three';

/** Seeded random numbers, so a world looks exactly the same on every visit. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a string like "bread/girl" into a number seed. */
export function seedFrom(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Collects points (and a brightness per point) for one figure.
 * Every shape method takes a `count` of points to place.
 */
export class PointCloud {
  constructor(seed) {
    this.random = seededRandom(seed);
    this.positions = [];
    this.shades = [];
  }

  range(lo, hi) {
    return lo + (hi - lo) * this.random();
  }

  /** Normally distributed random number (Box–Muller). */
  gaussian() {
    const u = 1 - this.random();
    const v = this.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** A random direction. */
  direction(out = new THREE.Vector3()) {
    out.set(this.gaussian(), this.gaussian(), this.gaussian());
    return out.lengthSq() < 1e-9 ? out.set(0, 1, 0) : out.normalize();
  }

  /**
   * Adds one point. About one in seven drifts off the surface as haze,
   * further for larger `haze`, and a little dimmer.
   */
  add(point, shade, haze = 0.05) {
    if (haze > 0 && this.random() < 0.14) {
      const distance = -Math.log(1 - this.random() * 0.999) * haze;
      point.addScaledVector(this.direction(), distance);
      shade *= 0.7;
    }
    this.positions.push(point.x, point.y, point.z);
    this.shades.push(shade);
  }

  /** Points on the surface of a (rotated) ellipsoid. */
  ellipsoid({ centre, radii, rotation = [0, 0, 0], count, shade = [0.55, 1], haze, jitter = 0.008 }) {
    const matrix = transform(centre, rotation);
    for (let i = 0; i < count; i++) {
      const p = this.direction()
        .multiply(new THREE.Vector3(...radii))
        .addScaledVector(this.direction(), jitter * this.gaussian())
        .applyMatrix4(matrix);
      this.add(p, this.range(...shade), haze);
    }
  }

  /**
   * Points around a line segment: a rounded tube, like a limb or branch.
   * Some points land inside the tube, which reads as soft volume.
   */
  capsule({ from, to, radius, count, shade = [0.55, 1], haze }) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    for (let i = 0; i < count; i++) {
      const p = a.clone().lerp(b, this.random()).addScaledVector(this.direction(), radius);
      this.add(p, this.range(...shade), haze);
    }
  }

  /** Points on the surface of a (rotated) box, spread evenly by face area. */
  box({ centre, size, rotation = [0, 0, 0], count, shade = [0.5, 0.9], haze }) {
    const matrix = transform(centre, rotation);
    const [w, h, d] = size;
    const faces = [h * d, h * d, w * d, w * d, w * h, w * h];
    const total = faces.reduce((s, f) => s + f, 0);
    for (let i = 0; i < count; i++) {
      let pick = this.random() * total;
      let face = 0;
      while (pick > faces[face]) pick -= faces[face++];
      const u = this.range(-0.5, 0.5);
      const v = this.range(-0.5, 0.5);
      const side = face % 2 ? 0.5 : -0.5;
      const axis = Math.floor(face / 2); // 0: x faces, 1: y faces, 2: z faces
      const local =
        axis === 0 ? [side * w, u * h, v * d] : axis === 1 ? [u * w, side * h, v * d] : [u * w, v * h, side * d];
      this.add(new THREE.Vector3(...local).applyMatrix4(matrix), this.range(...shade), haze);
    }
  }

  /** Loose points filling a box of space (dust, mud, blossom). */
  scatter({ centre, size, count, shade = [0.15, 0.45] }) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Vector3(
        centre[0] + this.range(-0.5, 0.5) * size[0],
        centre[1] + this.range(-0.5, 0.5) * size[1],
        centre[2] + this.range(-0.5, 0.5) * size[2]
      );
      this.add(p, this.range(...shade), 0);
    }
  }

  /** Hands the points to three.js. */
  toGeometry() {
    const count = this.shades.length;
    const rand = new Float32Array(count * 3);
    for (let i = 0; i < rand.length; i++) rand[i] = this.random() * 2 - 1;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('aShade', new THREE.Float32BufferAttribute(this.shades, 1));
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
    return geometry;
  }
}

function transform(centre, rotation) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...centre),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(1, 1, 1)
  );
}

// ─────────────────────────────────────────────────────────────
// The figures. Each takes the cloud, a point budget, and its spec
// from worlds.json. `share(f)` is a fraction of the budget.
// ─────────────────────────────────────────────────────────────

/** A girl slumped at the base of a tree, knees up, head bowed, in an oversized jacket. */
function girl(cloud, density) {
  const share = (f) => Math.round(density * f);
  // Torso in a too-big hunting jacket, leaning back against the trunk.
  cloud.ellipsoid({ centre: [0, 0.42, -0.07], radii: [0.22, 0.31, 0.17], rotation: [-0.25, 0, 0], count: share(0.3) });
  // The jacket's hem, spread on the ground around her.
  cloud.ellipsoid({ centre: [0, 0.15, -0.04], radii: [0.26, 0.08, 0.21], count: share(0.07) });
  // Head bowed forward, hair falling around it.
  cloud.ellipsoid({ centre: [0, 0.8, -0.04], radii: [0.095, 0.11, 0.1], rotation: [0.5, 0, 0], count: share(0.1) });
  cloud.ellipsoid({ centre: [0, 0.81, -0.08], radii: [0.11, 0.13, 0.1], count: share(0.05), shade: [0.4, 0.8] });

  for (const s of [-1, 1]) {
    // Legs drawn up: thigh up to the knee, shin back down to the foot.
    cloud.capsule({ from: [s * 0.1, 0.14, 0.02], to: [s * 0.11, 0.42, 0.34], radius: 0.075, count: share(0.07) });
    cloud.capsule({ from: [s * 0.11, 0.42, 0.34], to: [s * 0.12, 0.05, 0.48], radius: 0.058, count: share(0.06) });
    cloud.ellipsoid({ centre: [s * 0.12, 0.04, 0.55], radii: [0.05, 0.04, 0.1], count: share(0.015) });
    // Sleeves: shoulders down to elbows, forearms wrapped round the knees.
    cloud.capsule({ from: [s * 0.22, 0.62, -0.1], to: [s * 0.21, 0.43, 0.14], radius: 0.07, count: share(0.05) });
    cloud.capsule({ from: [s * 0.21, 0.43, 0.14], to: [s * 0.06, 0.46, 0.32], radius: 0.06, count: share(0.04) });
  }
}

/** An old apple tree in early spring: a thick trunk, bare branches, a few buds. */
function appleTree(cloud, density) {
  const share = (f) => Math.round(density * f);
  cloud.capsule({ from: [0, 0, 0], to: [0.06, 1.5, 0.02], radius: 0.15, count: share(0.28), shade: [0.35, 0.8] });
  cloud.ellipsoid({ centre: [0, 0.06, 0], radii: [0.32, 0.08, 0.32], count: share(0.06), shade: [0.3, 0.7] });

  // Branches split three times from the top of the trunk. Collect them
  // first, then share the points out by length × thickness.
  const branches = [];
  const grow = (from, dir, length, radius, depth) => {
    const to = from.clone().addScaledVector(dir, length);
    branches.push({ from, to, radius, weight: length * radius });
    if (depth === 0) return;
    for (let k = 0; k < 2 + (cloud.random() < 0.4 ? 1 : 0); k++) {
      const next = dir
        .clone()
        .add(new THREE.Vector3(cloud.range(-0.7, 0.7), cloud.range(-0.1, 0.5), cloud.range(-0.7, 0.7)))
        .normalize();
      grow(to, next, length * 0.72, radius * 0.62, depth - 1);
    }
  };
  const top = new THREE.Vector3(0.06, 1.45, 0.02);
  for (let k = 0; k < 3; k++) {
    const dir = new THREE.Vector3(Math.cos(k * 2.1) * 0.7, 0.8, Math.sin(k * 2.1) * 0.7).normalize();
    grow(top, dir, 0.75, 0.08, 3);
  }
  const total = branches.reduce((s, b) => s + b.weight, 0);
  for (const b of branches) {
    cloud.capsule({
      from: b.from.toArray(),
      to: b.to.toArray(),
      radius: b.radius,
      count: Math.round(share(0.5) * (b.weight / total)),
      shade: [0.3, 0.75],
    });
  }

  // A few small clusters of buds at the branch tips.
  const tips = branches.slice(-18);
  for (const b of tips) {
    cloud.scatter({ centre: b.to.toArray(), size: [0.22, 0.18, 0.22], count: Math.round(share(0.16) / tips.length), shade: [0.4, 0.85] });
  }
}

/** A small pen: fence posts, two rails, a trough, and mud. Centred on its origin. */
function pigPen(cloud, density) {
  const share = (f) => Math.round(density * f);
  const w = 2.4; // along x
  const d = 2.0; // along z
  const corners = [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ];

  // Posts every 0.6 m around the edge.
  const posts = [];
  for (let i = 0; i < 4; i++) {
    const [x1, z1] = corners[i];
    const [x2, z2] = corners[(i + 1) % 4];
    const n = Math.round(Math.hypot(x2 - x1, z2 - z1) / 0.6);
    for (let k = 0; k < n; k++) posts.push([x1 + ((x2 - x1) * k) / n, z1 + ((z2 - z1) * k) / n]);
  }
  for (const [x, z] of posts) {
    cloud.box({
      centre: [x, 0.45, z],
      size: [0.07, 0.9, 0.07],
      rotation: [cloud.range(-0.05, 0.05), 0, cloud.range(-0.05, 0.05)],
      count: Math.round(share(0.3) / posts.length),
    });
  }

  // Two rails along every side.
  for (let i = 0; i < 4; i++) {
    const [x1, z1] = corners[i];
    const [x2, z2] = corners[(i + 1) % 4];
    for (const y of [0.35, 0.75]) {
      cloud.capsule({ from: [x1, y, z1], to: [x2, y + cloud.range(-0.04, 0.04), z2], radius: 0.025, count: share(0.05), shade: [0.4, 0.85], haze: 0.02 });
    }
  }

  // The trough, and the trampled mud inside the pen.
  cloud.box({ centre: [-0.7, 0.12, 0.55], size: [0.8, 0.22, 0.3], count: share(0.12) });
  cloud.scatter({ centre: [0, 0.01, 0], size: [w, 0.03, d], count: share(0.18), shade: [0.15, 0.4] });
}

/** A pig, head down toward the trough. Faces +x. */
function pig(cloud, density) {
  const share = (f) => Math.round(density * f);
  cloud.ellipsoid({ centre: [0, 0.4, 0], radii: [0.45, 0.25, 0.24], count: share(0.5) });
  cloud.ellipsoid({ centre: [0.5, 0.36, 0], radii: [0.15, 0.15, 0.14], rotation: [0, 0, -0.3], count: share(0.14) });
  cloud.capsule({ from: [0.6, 0.31, 0], to: [0.7, 0.28, 0], radius: 0.06, count: share(0.05) });
  for (const s of [-1, 1]) {
    cloud.ellipsoid({ centre: [0.46, 0.5, s * 0.09], radii: [0.05, 0.06, 0.02], rotation: [s * 0.4, 0, -0.5], count: share(0.02) });
    for (const x of [-0.28, 0.28]) {
      cloud.capsule({ from: [x, 0.25, s * 0.13], to: [x, 0.02, s * 0.13], radius: 0.055, count: share(0.055) });
    }
  }
  cloud.capsule({ from: [-0.45, 0.45, 0], to: [-0.52, 0.5, 0], radius: 0.015, count: share(0.01) });
}

/**
 * A loaf of bread, mid-air. Most points sit on the top crust and are the
 * brightest in the scene: the burned crusts are the densest dots.
 */
function loaf(cloud, density) {
  const radii = new THREE.Vector3(0.17, 0.09, 0.1);
  for (let i = 0; i < density; i++) {
    const dir = cloud.direction();
    // Push most of the bottom-half points up onto the crust.
    if (dir.y < 0 && cloud.random() < 0.6) dir.y = -dir.y;
    const crust = dir.y > 0;
    const p = dir.multiply(radii).addScaledVector(cloud.direction(), 0.006 * cloud.gaussian());
    cloud.add(p, crust ? cloud.range(0.55, 0.75) : cloud.range(0.3, 0.5), 0.02);
  }
}

/** A faint trail of points along the loaves' arc through the air. */
function arc(cloud, density, spec) {
  const from = new THREE.Vector3(...spec.from);
  const to = new THREE.Vector3(...spec.to);
  for (let i = 0; i < density; i++) {
    const t = cloud.random();
    const p = from.clone().lerp(to, t);
    p.y += spec.height * t * (1 - t);
    p.addScaledVector(cloud.direction(), 0.03 * cloud.gaussian());
    cloud.add(p, cloud.range(0.2, 0.45), 0);
  }
}

/** Muddy ground: a wide disc of dim points, denser near the middle, with ruts. */
export function ground(cloud, { radius, density }) {
  for (let i = 0; i < density; i++) {
    const r = radius * Math.pow(cloud.random(), 0.8);
    const angle = cloud.random() * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = 0.015 * cloud.gaussian() + 0.025 * Math.sin(x * 3) * Math.sin(z * 2.3);
    cloud.add(new THREE.Vector3(x, y, z), cloud.range(0.18, 0.5), 0);
  }
}

/** Loose specks hanging in the air all around. */
export function dust(cloud, { size, density }) {
  cloud.scatter({ centre: [0, size[1] / 2, 0], size, count: density, shade: [0.12, 0.4] });
}

export const PLACEHOLDERS = { girl, appleTree, pigPen, pig, loaf, arc };
