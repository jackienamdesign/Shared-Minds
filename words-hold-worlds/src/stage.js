/**
 * The three.js stage: one renderer, one camera, one scene, drawn on a canvas
 * that sits over the reading page.
 *
 * The camera is placed so that, on the z = 0 plane, one world unit is exactly
 * one CSS pixel. That lets the word's dots start precisely on top of the word
 * on the page, and then fly off into 3D from there.
 */
import * as THREE from 'three';

const FOV = 45; // vertical field of view, degrees

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setClearColor(0x000000, 0); // transparent: the page shows through

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 100000);

  const stage = {
    renderer,
    scene,
    camera,
    width: 0,
    height: 0,
    // Camera distance at which 1 world unit on the z = 0 plane = 1 CSS pixel.
    focal: 0,
    resize,
    render: () => renderer.render(scene, camera),
  };

  function resize() {
    stage.width = window.innerWidth;
    stage.height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(stage.width, stage.height, false);
    camera.aspect = stage.width / stage.height;
    // Half the screen height, divided by tan(half the field of view).
    stage.focal = stage.height / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.updateProjectionMatrix();
  }

  resize();
  return stage;
}
