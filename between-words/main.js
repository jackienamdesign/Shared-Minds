/**
 * Between Words — scrub through the worlds between seven words.
 *
 * Two sources feed the one plate:
 * - **Frames**: rendered ahead of time by section 3 of between_words.ipynb and
 *   committed to public/between-words/frames/. Always available.
 * - **Live**: section 4 of the notebook, served from Colab through localtunnel. Only
 *   up while the notebook runs, but takes any two words.
 *
 * Either way the page holds a chain of words and one position along it:
 * 0 is the first word, 1 the second, 1.5 halfway between the second and third.
 */

const FRAMES_URL = `${import.meta.env.BASE_URL}between-words/frames/`;

/** Shown before frames exist, so the page reads the same either way. */
const DEFAULT_WORDS = ['rain', 'puddle', 'glow', 'bread', 'pig', 'fluffy', 'dandelion'];

/** Live mode asks for t in steps of this size, so scrubbing back hits the cache. */
const LIVE_STEP = 0.02;

/** localtunnel answers browsers with a reminder page unless asked not to. */
const TUNNEL_HEADERS = { 'bypass-tunnel-reminder': 'true' };

const canvas = document.getElementById('plate');
const ctx = canvas.getContext('2d');
const plateNote = document.getElementById('plate-note');
const wordsRow = document.getElementById('words');
const slider = document.getElementById('position');
const caption = document.getElementById('caption');
const liveBox = document.getElementById('live');
const liveForm = document.getElementById('live-form');
const liveUrl = document.getElementById('live-url');
const liveWords = document.getElementById('live-words');
const wordA = document.getElementById('word-a');
const wordB = document.getElementById('word-b');
const liveStatus = document.getElementById('live-status');
const disconnect = document.getElementById('disconnect');

const state = {
  mode: 'frames', // 'frames' | 'live'
  words: DEFAULT_WORDS,
  position: 0,
};

const frames = {
  manifest: null,
  images: [], // decoded <img>s by frame index, filled in as they arrive
  loaded: 0,
};

const live = {
  url: null,
  cache: new Map(), // `${a}|${b}|${t}` → ImageBitmap
  wanted: null, // the newest frame asked for and not yet fetched
  busy: false,
  shown: null, // the bitmap currently on the plate
};

// ── The chain of words ──────────────────────────────────────────

function setWords(words) {
  state.words = words;
  slider.max = String(words.length - 1);
  wordsRow.replaceChildren(
    ...words.map((word, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'word';
      button.textContent = word;
      button.style.left = `${(i / (words.length - 1)) * 100}%`;
      button.addEventListener('click', () => moveTo(i));
      return button;
    }),
  );
  moveTo(Math.min(state.position, words.length - 1));
}

function moveTo(position) {
  state.position = Math.max(0, Math.min(state.words.length - 1, position));
  slider.value = String(state.position);
  update();
}

/** Every visible change follows from state.position; this applies it once per frame. */
let pending = false;
function update() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    paintWords();
    paintCaption();
    if (state.mode === 'live') requestLive();
    else drawFrames();
  });
}

function paintWords() {
  [...wordsRow.children].forEach((button, i) => {
    const near = Math.max(0, 1 - Math.abs(state.position - i));
    button.style.setProperty('--near', near.toFixed(3));
    button.classList.toggle('is-far', near === 0);
  });
}

function paintCaption() {
  const { words, position } = state;
  const i = Math.min(Math.floor(position), words.length - 2);
  const t = position - i;
  if (t < 0.02 || t > 0.98) {
    caption.innerHTML = `<b>${escapeHtml(words[Math.round(position)])}</b>`;
  } else {
    caption.innerHTML = `between <b>${escapeHtml(words[i])}</b> and <b>${escapeHtml(words[i + 1])}</b>`;
  }
}

function escapeHtml(text) {
  const span = document.createElement('span');
  span.textContent = text;
  return span.innerHTML;
}

// ── Frames rendered in Colab ────────────────────────────────────

async function loadFrames() {
  let manifest;
  try {
    const response = await fetch(`${FRAMES_URL}manifest.json`);
    if (!response.ok) throw new Error(String(response.status));
    manifest = await response.json();
  } catch {
    if (state.mode === 'frames') showNote('The in-between worlds haven’t been rendered yet.');
    return;
  }

  frames.manifest = manifest;
  canvas.width = canvas.height = manifest.size;
  if (state.mode === 'frames') setWords(manifest.words);

  for (let i = 0; i < manifest.count; i++) {
    const image = new Image();
    image.src = `${FRAMES_URL}${String(i).padStart(3, '0')}.webp`;
    image
      .decode()
      .then(() => {
        frames.images[i] = image;
        frames.loaded++;
        if (state.mode !== 'frames') return;
        if (frames.loaded === manifest.count) showNote(null);
        else showNote(`Loading ${frames.loaded} of ${manifest.count}`);
        update();
      })
      .catch(() => {}); // a missing frame leaves a gap; its neighbours still draw
  }
}

/** Crossfades the two frames either side of the position, so scrubbing is smooth between them. */
function drawFrames() {
  const { manifest, images } = frames;
  if (!manifest) return;
  const exact = state.position * (manifest.framesPerPair - 1);
  const i = Math.floor(exact);
  const fade = exact - i;
  const here = images[i];
  const next = images[Math.min(i + 1, manifest.count - 1)];
  if (!here) return; // not loaded yet: keep whatever is on the plate

  ctx.globalAlpha = 1;
  ctx.drawImage(here, 0, 0, canvas.width, canvas.height);
  if (next && fade > 0) {
    ctx.globalAlpha = fade;
    ctx.drawImage(next, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
}

// ── Live from Colab ─────────────────────────────────────────────

async function connect(url) {
  url = url.trim().replace(/\/+$/, '');
  setStatus('Connecting…');
  try {
    const response = await fetch(`${url}/health`, {
      headers: TUNNEL_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`the server answered ${response.status}`);
    const info = await response.json();

    live.url = url;
    live.cache.clear();
    state.mode = 'live';
    canvas.width = canvas.height = info.size;
    showNote(null);

    // Start live between the two words you were already between.
    const i = Math.min(Math.floor(state.position), state.words.length - 2);
    wordA.value = state.words[i];
    wordB.value = state.words[i + 1];
    const t = state.position - i;
    liveWords.hidden = false;
    setWords([wordA.value, wordB.value]);
    moveTo(t);
    setStatus(`Live from Colab, drawn by ${info.model}.`);
  } catch (error) {
    setStatus(`Couldn’t reach it (${error.message}). Is the notebook’s last cell still running?`);
  }
}

function leaveLive() {
  state.mode = 'frames';
  live.url = null;
  live.wanted = null;
  liveWords.hidden = true;
  setStatus('');
  canvas.width = canvas.height = frames.manifest?.size ?? 512;
  if (frames.manifest) {
    showNote(frames.loaded === frames.manifest.count ? null : `Loading ${frames.loaded} of ${frames.manifest.count}`);
    setWords(frames.manifest.words);
  } else {
    showNote('The in-between worlds haven’t been rendered yet.');
    setWords(DEFAULT_WORDS);
  }
  moveTo(0);
}

function requestLive() {
  const [a, b] = state.words;
  const t = Math.round(state.position / LIVE_STEP) * LIVE_STEP;
  const key = `${a}|${b}|${t.toFixed(2)}`;
  const cached = live.cache.get(key);
  if (cached) {
    live.wanted = null;
    drawBitmap(cached);
    return;
  }
  live.wanted = { key, a, b, t };
  if (!live.busy) fetchLive();
}

/**
 * Fetches one frame at a time. While a frame is on its way the slider keeps
 * moving; when it lands, only the newest position is fetched next, never the
 * ones scrubbed past in between.
 */
async function fetchLive() {
  live.busy = true;
  while (live.wanted && state.mode === 'live') {
    const { key, a, b, t } = live.wanted;
    live.wanted = null;
    const params = new URLSearchParams({ a, b, t: t.toFixed(2) });
    try {
      const response = await fetch(`${live.url}/frame?${params}`, { headers: TUNNEL_HEADERS });
      if (!response.ok) throw new Error(String(response.status));
      const bitmap = await createImageBitmap(await response.blob());
      live.cache.set(key, bitmap);
      if (live.cache.size > 300) live.cache.delete(live.cache.keys().next().value);
      if (state.mode === 'live') drawBitmap(bitmap);
    } catch (error) {
      setStatus(`Lost the connection (${error.message}). Is the notebook still running?`);
    }
  }
  live.busy = false;
}

function drawBitmap(bitmap) {
  if (bitmap === live.shown) return;
  live.shown = bitmap;
  ctx.globalAlpha = 1;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
}

function applyLiveWords() {
  const a = wordA.value.trim();
  const b = wordB.value.trim();
  if (!a || !b) return;
  setWords([a, b]);
}

// ── Small helpers ───────────────────────────────────────────────

function showNote(text) {
  plateNote.hidden = !text;
  plateNote.textContent = text ?? '';
}

function setStatus(text) {
  liveStatus.textContent = text;
}

/** One frame's worth of movement, for the arrow keys. */
function frameStep() {
  if (state.mode === 'live') return LIVE_STEP;
  return 1 / ((frames.manifest?.framesPerPair ?? 24) - 1);
}

// ── Input ───────────────────────────────────────────────────────

slider.addEventListener('input', () => moveTo(Number(slider.value)));

// A range with step="any" has no sensible arrow-key step, so set one.
slider.addEventListener('keydown', (event) => {
  const moves = {
    ArrowRight: frameStep(),
    ArrowUp: frameStep(),
    ArrowLeft: -frameStep(),
    ArrowDown: -frameStep(),
    PageUp: 1,
    PageDown: -1,
  };
  if (event.key in moves) moveTo(state.position + moves[event.key]);
  else if (event.key === 'Home') moveTo(0);
  else if (event.key === 'End') moveTo(state.words.length - 1);
  else return;
  event.preventDefault();
});

// Scrolling over the plate scrubs, the way scrolling zooms in Words Hold Worlds.
canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    moveTo(state.position + delta * 0.003);
  },
  { passive: false },
);

// Dragging across the plate scrubs too: its full width is one word's distance.
canvas.addEventListener('pointerdown', (event) => {
  const start = { x: event.clientX, position: state.position };
  canvas.setPointerCapture(event.pointerId);
  const move = (e) => moveTo(start.position + (e.clientX - start.x) / canvas.clientWidth);
  const end = () => {
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', end);
    canvas.removeEventListener('pointercancel', end);
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
});

liveForm.addEventListener('submit', (event) => {
  event.preventDefault();
  connect(liveUrl.value);
});
wordA.addEventListener('change', applyLiveWords);
wordB.addEventListener('change', applyLiveWords);
disconnect.addEventListener('click', leaveLive);

// ── Start ───────────────────────────────────────────────────────

ctx.fillStyle = '#050505';
ctx.fillRect(0, 0, canvas.width, canvas.height);
setWords(DEFAULT_WORDS);

// The notebook prints a link with ?live=<tunnel url>, which connects straight away.
const liveParam = new URLSearchParams(location.search).get('live');
loadFrames().then(() => {
  if (!liveParam) return;
  liveBox.open = true;
  liveUrl.value = liveParam;
  connect(liveParam);
});
