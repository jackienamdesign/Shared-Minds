/**
 * Drag to look around.
 *
 * Once you're fully inside a world, dragging with the mouse turns the camera
 * on the spot, like turning your head. Dragging "pulls" the world: drag
 * right and the scene moves right. The camera eases toward where you've
 * dragged it rather than snapping, which keeps the 3D motion slow and soft.
 */

// Radians of turn per pixel dragged.
const SENSITIVITY = 0.0025;
// Don't let the view flip over the top or bottom.
const MAX_PITCH = 1.1;
// How quickly the view catches up with the drag (per second).
const EASE_RATE = 6;

export function createLook(element) {
  let enabled = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let targetYaw = 0;
  let targetPitch = 0;

  const look = { yaw: 0, pitch: 0, setEnabled, update };

  element.addEventListener('pointerdown', (event) => {
    // Touch stays reserved for zooming (swipe) for now.
    if (!enabled || event.pointerType === 'touch') return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    element.setPointerCapture(event.pointerId);
    element.classList.add('is-dragging');
  });

  element.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    targetYaw += (event.clientX - lastX) * SENSITIVITY;
    targetPitch += (event.clientY - lastY) * SENSITIVITY;
    targetPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, targetPitch));
    lastX = event.clientX;
    lastY = event.clientY;
  });

  const endDrag = () => {
    dragging = false;
    element.classList.remove('is-dragging');
  };
  element.addEventListener('pointerup', endDrag);
  element.addEventListener('pointercancel', endDrag);

  /** Looking is only allowed once you're all the way in. */
  function setEnabled(value) {
    if (value === enabled) return;
    enabled = value;
    element.classList.toggle('is-lookable', enabled);
    if (!enabled) {
      endDrag();
      // Leaving: turn back to face forward, the short way round.
      look.yaw = Math.atan2(Math.sin(look.yaw), Math.cos(look.yaw));
      targetYaw = targetPitch = 0;
    }
  }

  function update(dt) {
    const k = 1 - Math.exp(-EASE_RATE * dt);
    look.yaw += (targetYaw - look.yaw) * k;
    look.pitch += (targetPitch - look.pitch) * k;
  }

  return look;
}
