/**
 * The reading page.
 *
 * Loads the excerpt from public/text.txt, wraps every word in its own <span>,
 * and handles hover / click selection. Exactly one word can be active at a
 * time. Nothing here knows about zooming or 3D — it just reports which word is
 * selected through the onSelect callback.
 */

// A "word" is a run of letters or digits, optionally joined by an apostrophe or
// hyphen ("don't", "apple-tree"). Anything around it — quotes, commas, dashes —
// is punctuation: it stays visible on the page but is not part of the word.
const WORD = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

/**
 * Fetches the excerpt. Returns null if the file is missing or empty, so the
 * page can say so instead of showing something it made up.
 */
export async function loadText(url) {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return null;
    const text = await response.text();
    // Guard against a dev server answering a missing file with an HTML page.
    if (/^\s*<!doctype html/i.test(text)) return null;
    return text.trim() ? text : null;
  } catch {
    return null;
  }
}

/**
 * The lowercase key used to look a word up in worlds.json:
 * "Bread" → "bread", "Don’t" → "don't".
 */
export function wordKey(raw) {
  return raw.toLowerCase().replace(/’/g, "'");
}

/**
 * Builds the paragraphs and word spans inside `container`.
 * Paragraphs in text.txt are separated by blank lines; single line breaks
 * inside a paragraph are treated as ordinary spaces, as in a book.
 */
export function renderText(container, text) {
  container.textContent = '';

  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const p = document.createElement('p');

    // Walk the paragraph, alternating between plain text (spaces and
    // punctuation, kept as text nodes) and words (wrapped in spans).
    let last = 0;
    for (const match of paragraph.matchAll(WORD)) {
      if (match.index > last) {
        p.append(paragraph.slice(last, match.index));
      }
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = match[0];
      span.dataset.key = wordKey(match[0]);
      p.append(span);
      last = match.index + match[0].length;
    }
    if (last < paragraph.length) p.append(paragraph.slice(last));

    container.append(p);
  }
}

/**
 * Marks the world words: for each, the nth time it appears on the page gets
 * the `has-world` class (drawn darker and a little bolder) and remembers
 * which world it opens.
 */
export function markWorldWords(container, words) {
  for (const { key, occurrence } of words) {
    const span = container.querySelectorAll(`.word[data-key="${CSS.escape(key)}"]`)[occurrence - 1];
    if (!span) continue;
    span.classList.add('has-world');
    span.dataset.world = key;
  }
}

/** Shows a one-line status in place of the excerpt. */
export function renderNotice(container, message) {
  container.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'notice';
  p.textContent = message;
  container.append(p);
}

/**
 * The sentence a word sits in, for giving the LLM context later on. Finds the
 * span's position in its paragraph and expands out to the nearest sentence
 * boundaries (. ! ? followed by a space).
 */
export function sentenceAround(span) {
  const paragraph = span.closest('p');
  if (!paragraph) return span.textContent;

  const text = paragraph.textContent;
  // Character offset of the span within the paragraph.
  let offset = 0;
  for (const node of paragraph.childNodes) {
    if (node === span) break;
    offset += node.textContent.length;
  }

  const before = text.slice(0, offset);
  const start = Math.max(
    before.lastIndexOf('. '),
    before.lastIndexOf('! '),
    before.lastIndexOf('? ')
  );
  const rest = text.slice(offset);
  const end = rest.search(/[.!?](\s|$)/);

  return text
    .slice(start === -1 ? 0 : start + 2, end === -1 ? text.length : offset + end + 1)
    .trim();
}

/**
 * Click handling. One listener on the container (event delegation) rather
 * than one per word, since an excerpt can have thousands of spans.
 *
 * Returns a small controller so other parts of the page (Escape key, the
 * zoom) can read or clear the selection.
 */
export function createSelection(container, onSelect) {
  let active = null;

  function select(span) {
    if (span === active) return;
    active?.classList.remove('is-active');
    active = span;
    active?.classList.add('is-active');
    onSelect(active);
  }

  container.addEventListener('click', (event) => {
    const span = event.target.closest('.word');
    if (!span) return;
    // Clicking the active word again puts it back.
    select(span === active ? null : span);
  });

  return {
    get active() {
      return active;
    },
    clear: () => select(null),
  };
}
