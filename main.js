/**
 * Shared Minds — sky only.
 *
 * The particle engine that used to live here was removed: the piece wants an
 * empty screen so the field and the thoughts are the only things on it.
 * (Recoverable from git history if it's ever wanted back.)
 */

/**
 * Vanta CLOUDS background (github.com/tengbao/vanta, MIT).
 * Daytime sky using Vanta's stock colors.
 */
function initCloudBackground() {
  if (typeof VANTA === 'undefined' || !VANTA.CLOUDS) {
    console.warn('[Shared Minds] Vanta unavailable — running without cloud background.');
    return null;
  }

  return VANTA.CLOUDS({
    el: '#vanta-bg',
    // Parallaxes the cloud shader with the cursor. This layers underneath the
    // real bubble repulsion in bubbles.js — two different things respond to the
    // pointer at once, by design.
    mouseControls: true,
    touchControls: true,
    gyroControls: false,

    backgroundColor: 0xffffff,
    skyColor: 0x68b8d7,
    cloudColor: 0xadc1de,
    cloudShadowColor: 0x183550,
    sunColor: 0xff9919,
    sunGlareColor: 0xff6633,
    sunlightColor: 0xff9933,

    speed: 0.7 // slow drift suits a stream of consciousness
  });
}

window.addEventListener('DOMContentLoaded', () => {
  window.vantaEffect = initCloudBackground();
});
