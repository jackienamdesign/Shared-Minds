/**
 * Words Hold Worlds — entry point.
 *
 * Wires the pieces together:
 *   text-layer.js  the reading page and word selection
 *   stage.js       the three.js renderer, camera and scene
 *   zoom.js        scroll → progress → word to dots → dip to black → world
 *   world.js       a word's point-cloud world and its camera tour (worlds.json)
 *   look.js        drag to look around once you're inside
 */
import './style.css';
import {
  loadText,
  renderText,
  renderNotice,
  createSelection,
  markWorldWords,
} from './text-layer.js';
import { createStage } from './stage.js';
import { createZoom } from './zoom.js';
import { worldWords } from './world.js';

const textEl = document.getElementById('text');
const hintEl = document.getElementById('hint');

// BASE_URL keeps the path right when the page is served from a subfolder.
const TEXT_URL = `${import.meta.env.BASE_URL}text.txt`;

const text = await loadText(TEXT_URL);
if (text) {
  renderText(textEl, text);
  // A few chosen words hold worlds (see worlds.json). They're drawn darker.
  markWorldWords(textEl, worldWords());
} else {
  // Never invent book text — just say where the excerpt should go.
  renderNotice(textEl, 'Add your excerpt to public/text.txt.');
}

// The dots are sampled from the real font, so wait until Literata has loaded.
await document.fonts.ready;

const stage = createStage(document.getElementById('stage'));

// The hint walks a first-time reader through it, then goes for good:
// "pick a darker word" → once one is picked → "now scroll" → once you scroll, gone.
const HINT_PICK = hintEl.textContent;
const HINT_SCROLL = 'now scroll.';
let hintDone = false;

const zoom = createZoom({
  stage,
  page: document.getElementById('page'),
  veil: document.getElementById('veil'),
  onEnter: () => {
    hintDone = true;
    hintEl.classList.add('is-gone');
  },
  // Zoomed all the way back out: let go of the word, reading scroll returns.
  onRelease: () => selection.clear(),
});

const selection = createSelection(textEl, (span) => {
  if (!hintDone) hintEl.textContent = span ? HINT_SCROLL : HINT_PICK;
  if (span) zoom.attach(span);
  else zoom.detach();
});

// Escape always lets go of the word. If you're zoomed in, it plays the
// zoom backwards first, then deselects.
window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (zoom.progress > 0) zoom.release();
  else selection.clear();
});
