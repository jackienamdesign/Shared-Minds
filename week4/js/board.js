/**
 * Phase 2: The Board
 *
 * Renders prayer requests as soft paper cards in a masonry layout, handles the
 * share-a-request modal, the "I prayed" interaction, and infinite scroll.
 *
 * All Firestore access is delegated to requests.js.
 */

import {
  CATEGORIES,
  MAX_TEXT,
  categoryMeta,
  createRequest,
  fetchRequestPage,
  fetchMyRecentPrayers,
  fetchMyCardStats,
  prayForRequest,
  setRequestStatus,
  deleteRequest,
  relativeTime,
  heldInPrayerCopy,
} from './requests.js';

// ----------------------------------------------------------------------------
// Module state
// ----------------------------------------------------------------------------
let currentUser = null;
let currentProfile = null;

let cards = [];
let cursor = null;
let hasMore = true;
let isLoading = false;
let prayedToday = new Set();
let myStats = {};
let boardStarted = false;
let scrollSentinel = null;
let observer = null;

// DOM handles, resolved on init
let els = {};
let showToast = () => {};

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

/** Stable pseudo-random in [0,1) from a document id, so a re-render lands on
 *  the same value — re-rolling per paint would make the whole board twitch. */
function hashUnit(id, salt) {
  let hash = salt;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 100003;
  return (hash % 1000) / 1000;
}

/** Scraps sit a degree or two off square, and nudge left or right of centre. */
function tiltFor(id) {
  return (hashUnit(id, 7) * 3 - 1.5).toFixed(2);
}
function shiftFor(id) {
  return Math.round(hashUnit(id, 13) * 16 - 8);
}

/** Paper stocks and fasteners, cycled so neighbouring scraps differ. */
const STOCKS = ['stock-ruled', 'stock-chartreuse', 'stock-peri', 'stock-cream', 'stock-green'];
const FASTENERS = ['clip-binder', 'clip-tape', 'clip-none', 'clip-tape', 'clip-none'];

function stockFor(id, index) {
  return STOCKS[Math.floor(hashUnit(id, 3) * STOCKS.length * 1.7 + index) % STOCKS.length];
}
function fastenerFor(id, index) {
  return FASTENERS[Math.floor(hashUnit(id, 23) * FASTENERS.length * 1.3 + index) % FASTENERS.length];
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ----------------------------------------------------------------------------
// Card rendering
// ----------------------------------------------------------------------------

function cardMarkup(card, index) {
  const isMine = currentUser && card.authorId === currentUser.uid;
  const isAnswered = card.status === 'answered';
  const hasPrayed = prayedToday.has(card.id);
  const cat = categoryMeta(card.category);
  const name = card.isAnonymous ? 'Someone' : card.authorName || 'Kind Neighbour';

  // Author-only private line. Public cards never carry a count at all — the
  // number is not withheld in the markup, it is never fetched.
  const privateLine = isMine
    ? `<p class="card-private" aria-label="Private to you">
         <span class="private-icon" aria-hidden="true">🔒</span>
         <span data-private-count="${card.id}">${esc(heldInPrayerCopy(myStats[card.id] ?? 0))}</span>
       </p>`
    : '';

  const authorTools = isMine
    ? `<div class="card-author-tools">
         <button class="card-tool" type="button" data-action="toggle-status" data-id="${card.id}"
                 aria-label="${isAnswered ? 'Reopen this request' : 'Mark this request as answered'}">
           ${isAnswered ? '↩️ Reopen' : '🌼 Mark answered'}
         </button>
         <button class="card-tool card-tool-danger" type="button" data-action="delete" data-id="${card.id}"
                 aria-label="Delete this request">
           🗑️ Delete
         </button>
       </div>`
    : '';

  return `
    <article class="prayer-card ${stockFor(card.id, index)} ${fastenerFor(card.id, index)} ${isAnswered ? 'is-answered' : ''}"
             style="--tilt: ${tiltFor(card.id)}deg; --shift: ${shiftFor(card.id)}px"
             data-card="${card.id}">
      ${isAnswered ? '<span class="answered-stamp" aria-label="Answered">Answered</span>' : ''}

      ${cat ? `<span class="card-section">${esc(cat.label)}</span>` : ''}

      <p class="card-text">${esc(card.text)}</p>

      <!-- Signed off like a clipping: who, then when. -->
      <div class="card-sign">
        <span class="sign-name">${esc(name)}</span>
        <time class="sign-time" datetime="${card.createdAt?.toDate?.()?.toISOString?.() || ''}">
          ${esc(relativeTime(card.createdAt))}
        </time>
      </div>

      <button class="btn-pray ${hasPrayed ? 'has-prayed' : ''}"
              type="button"
              data-action="pray"
              data-id="${card.id}"
              data-author="${card.authorId}"
              ${hasPrayed ? 'disabled' : ''}
              aria-label="${hasPrayed ? 'You already prayed for this today' : 'I prayed for this request'}">
        <span class="pray-flame" aria-hidden="true">🕯️</span>
        <span class="pray-label">${hasPrayed ? 'Prayed today' : 'I prayed'}</span>
      </button>

      ${privateLine}
      ${authorTools}
    </article>
  `;
}

function renderBoard() {
  if (!els.boardGrid) return;

  if (!cards.length && !isLoading) {
    els.boardGrid.innerHTML = '';
    els.emptyState?.classList.remove('is-hidden');
    return;
  }

  els.emptyState?.classList.add('is-hidden');
  els.boardGrid.innerHTML = cards.map((c, i) => cardMarkup(c, i)).join('');
}

// ----------------------------------------------------------------------------
// Loading pages
// ----------------------------------------------------------------------------

async function loadNextPage({ reset = false } = {}) {
  if (isLoading) return;
  if (!reset && !hasMore) return;

  isLoading = true;
  els.loadingRow?.classList.remove('is-hidden');

  if (reset) {
    cards = [];
    cursor = null;
    hasMore = true;
  }

  const startedAt = performance.now();

  try {
    // The cooldown set only needs refreshing on a full reload; it is unchanged
    // mid-scroll apart from prayers this session, which are tracked locally.
    if (reset) prayedToday = await fetchMyRecentPrayers();

    const page = await fetchRequestPage(cursor);
    cursor = page.cursor;
    hasMore = page.hasMore;
    cards = cards.concat(page.cards);

    // Private counts, for the signed-in user's own cards in this page only.
    const mine = page.cards.filter((c) => c.authorId === currentUser?.uid).map((c) => c.id);
    if (mine.length) {
      myStats = { ...myStats, ...(await fetchMyCardStats(mine)) };
    }

    renderBoard();

    const ms = Math.round(performance.now() - startedAt);
    console.info(
      `[Prayer Board] Loaded ${page.cards.length} cards in ${ms}ms · ` +
        `${page.readCount + 1 + mine.length} Firestore reads · ${cards.length} on board`
    );
  } catch (err) {
    console.error('[Prayer Board] Board load failed:', err);
    if (err.code === 'permission-denied') {
      showToast('The board rules need deploying — run firebase deploy --only firestore:rules', '🔒');
    } else {
      showToast('Could not load the board just now. Please try again.', '🌧️');
    }
  } finally {
    isLoading = false;
    els.loadingRow?.classList.add('is-hidden');
    els.endNote?.classList.toggle('is-hidden', hasMore || cards.length === 0);
  }
}

/** Infinite scroll. IntersectionObserver rather than a scroll listener so it
 *  costs nothing while idle. */
function setupInfiniteScroll() {
  if (observer || !scrollSentinel) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && hasMore && !isLoading) {
        loadNextPage();
      }
    },
    { rootMargin: '320px' }
  );
  observer.observe(scrollSentinel);
}

// ----------------------------------------------------------------------------
// The "I prayed" interaction
// ----------------------------------------------------------------------------

/** Candle flare plus a few drifting sparkles, anchored to the button. */
function playPrayerAnimation(button) {
  if (prefersReducedMotion()) return;

  button.classList.add('is-flaring');
  setTimeout(() => button.classList.remove('is-flaring'), 900);

  const burst = document.createElement('span');
  burst.className = 'sparkle-burst';
  burst.setAttribute('aria-hidden', 'true');
  burst.innerHTML = ['✨', '🌟', '✨'].map((s, i) => `<span class="spark s${i}">${s}</span>`).join('');
  button.appendChild(burst);
  setTimeout(() => burst.remove(), 1100);
}

async function handlePray(button) {
  const id = button.dataset.id;
  const authorId = button.dataset.author;
  if (!id || prayedToday.has(id)) return;

  // Optimistic: the flame should respond to the tap, not to the network.
  button.disabled = true;
  playPrayerAnimation(button);

  try {
    await prayForRequest(id, authorId);

    prayedToday.add(id);
    button.classList.add('has-prayed');
    button.querySelector('.pray-label').textContent = 'Prayed today';
    button.setAttribute('aria-label', 'You already prayed for this today');

    // The author sees their own private count move straight away.
    if (authorId === currentUser?.uid) {
      myStats[id] = (myStats[id] ?? 0) + 1;
      const line = document.querySelector(`[data-private-count="${id}"]`);
      if (line) line.textContent = heldInPrayerCopy(myStats[id]);
    }

    showToast('Thank you for holding this in prayer.', '🕯️');
  } catch (err) {
    if (err.code === 'cooldown') {
      prayedToday.add(id);
      button.classList.add('has-prayed');
      button.querySelector('.pray-label').textContent = 'Prayed today';
      showToast('You already held this in prayer today. Come back tomorrow 🌙', '🌙');
    } else {
      console.error('[Prayer Board] Prayer failed:', err);
      button.disabled = false;
      showToast('That prayer did not save. Please try again.', '🌧️');
    }
  }
}

// ----------------------------------------------------------------------------
// Author actions
// ----------------------------------------------------------------------------

async function handleToggleStatus(button) {
  const id = button.dataset.id;
  const card = cards.find((c) => c.id === id);
  if (!card) return;

  const next = card.status === 'answered' ? 'open' : 'answered';
  button.disabled = true;

  try {
    await setRequestStatus(id, next);
    card.status = next;
    renderBoard();
    showToast(
      next === 'answered' ? 'Marked as answered. 🌼' : 'Reopened and resting here again.',
      next === 'answered' ? '🌼' : '↩️'
    );
  } catch (err) {
    console.error('[Prayer Board] Status change failed:', err);
    button.disabled = false;
    showToast('Could not update that just now.', '🌧️');
  }
}

async function handleDelete(button) {
  const id = button.dataset.id;
  const card = cards.find((c) => c.id === id);
  if (!card) return;

  // Deliberately a two-tap confirm in the card rather than window.confirm:
  // a native dialog would be jarring here, and blocks the page.
  if (button.dataset.confirming !== 'true') {
    button.dataset.confirming = 'true';
    button.textContent = '🗑️ Tap again to delete';
    button.classList.add('is-confirming');
    setTimeout(() => {
      if (button.dataset.confirming === 'true') {
        button.dataset.confirming = 'false';
        button.textContent = '🗑️ Delete';
        button.classList.remove('is-confirming');
      }
    }, 4000);
    return;
  }

  button.disabled = true;
  try {
    await deleteRequest(id);
    cards = cards.filter((c) => c.id !== id);
    delete myStats[id];
    renderBoard();
    showToast('Your request has been gently removed.', '🕊️');
  } catch (err) {
    console.error('[Prayer Board] Delete failed:', err);
    button.disabled = false;
    showToast('Could not remove that just now.', '🌧️');
  }
}

// ----------------------------------------------------------------------------
// Share-a-request modal
// ----------------------------------------------------------------------------

function buildCategoryChips() {
  if (!els.categoryRow) return;
  els.categoryRow.innerHTML = CATEGORIES.map(
    (c) => `
      <button class="category-chip" type="button" role="radio" aria-checked="false"
              data-category="${c.id}">
        <span aria-hidden="true">${c.emoji}</span> ${c.label}
      </button>`
  ).join('');

  els.categoryRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    const already = chip.classList.contains('is-selected');
    els.categoryRow.querySelectorAll('.category-chip').forEach((c) => {
      c.classList.remove('is-selected');
      c.setAttribute('aria-checked', 'false');
    });
    // Category is optional, so tapping the selected chip clears it.
    if (!already) {
      chip.classList.add('is-selected');
      chip.setAttribute('aria-checked', 'true');
    }
  });
}

function selectedCategory() {
  return els.categoryRow?.querySelector('.category-chip.is-selected')?.dataset.category || 'other';
}

function openShareModal() {
  els.shareError?.classList.add('is-hidden');
  els.shareModal?.classList.remove('is-hidden');
  document.body.style.overflow = 'hidden';
  els.requestText?.focus();
  updateCharCount();
}

function closeShareModal() {
  els.shareModal?.classList.add('is-hidden');
  document.body.style.overflow = '';
  els.shareForm?.reset();
  els.categoryRow?.querySelectorAll('.category-chip').forEach((c) => {
    c.classList.remove('is-selected');
    c.setAttribute('aria-checked', 'false');
  });
  updateCharCount();
}

function updateCharCount() {
  if (!els.charCount || !els.requestText) return;
  const len = els.requestText.value.length;
  els.charCount.textContent = `${len} / ${MAX_TEXT}`;
  els.charCount.classList.toggle('is-near-limit', len > MAX_TEXT - 60);
}

async function handleShareSubmit(e) {
  e.preventDefault();
  els.shareError?.classList.add('is-hidden');

  const text = els.requestText.value.trim();
  if (!text) {
    els.shareError.textContent = 'Please write a little about what you need prayer for.';
    els.shareError.classList.remove('is-hidden');
    return;
  }

  els.shareSubmit.disabled = true;
  const original = els.shareSubmit.textContent;
  els.shareSubmit.textContent = 'Placing it on the board...';

  try {
    const card = await createRequest({
      text,
      category: selectedCategory(),
      isAnonymous: els.anonToggle?.checked,
      displayName: currentProfile?.displayName || currentUser?.displayName,
    });

    // Prepend rather than refetch: the card is already known and a reload
    // would cost another page of reads.
    cards.unshift(card);
    myStats[card.id] = 0;
    renderBoard();
    closeShareModal();
    showToast('Your request is on the board. You are not alone. 🌷', '🌷');
  } catch (err) {
    console.error('[Prayer Board] Could not post request:', err);
    els.shareError.textContent = err.message || 'Could not share that just now.';
    els.shareError.classList.remove('is-hidden');
  } finally {
    els.shareSubmit.disabled = false;
    els.shareSubmit.textContent = original;
  }
}

// ----------------------------------------------------------------------------
// Init / teardown
// ----------------------------------------------------------------------------

export function initBoard({ toast }) {
  showToast = toast || (() => {});

  els = {
    boardGrid: document.getElementById('board-grid'),
    emptyState: document.getElementById('board-empty'),
    loadingRow: document.getElementById('board-loading'),
    endNote: document.getElementById('board-end'),
    shareModal: document.getElementById('share-modal'),
    shareForm: document.getElementById('share-form'),
    requestText: document.getElementById('request-text'),
    charCount: document.getElementById('char-count'),
    categoryRow: document.getElementById('category-row'),
    anonToggle: document.getElementById('anon-toggle'),
    shareError: document.getElementById('share-error'),
    shareSubmit: document.getElementById('share-submit-btn'),
    closeShareBtn: document.getElementById('close-share-btn'),
  };
  scrollSentinel = document.getElementById('scroll-sentinel');

  buildCategoryChips();

  // One delegated listener for the whole board — cards are re-rendered often
  // and per-card listeners would leak.
  els.boardGrid?.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const { action } = button.dataset;
    if (action === 'pray') handlePray(button);
    else if (action === 'toggle-status') handleToggleStatus(button);
    else if (action === 'delete') handleDelete(button);
  });

  // The empty state's call to action opens the same modal as the header button.
  document
    .querySelector('[data-opens-share]')
    ?.addEventListener('click', () => openShareModal());

  els.shareForm?.addEventListener('submit', handleShareSubmit);
  els.requestText?.addEventListener('input', updateCharCount);
  els.closeShareBtn?.addEventListener('click', closeShareModal);
  els.shareModal?.addEventListener('click', (e) => {
    if (e.target === els.shareModal) closeShareModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.shareModal?.classList.contains('is-hidden')) {
      closeShareModal();
    }
  });
}

export function openShare() {
  openShareModal();
}

/** Called when a user signs in. Safe to call repeatedly. */
export async function startBoard(user, profile) {
  currentUser = user;
  currentProfile = profile;
  if (boardStarted) return;
  boardStarted = true;

  await loadNextPage({ reset: true });
  setupInfiniteScroll();
}

/** Called on sign out so the next person does not inherit this board. */
export function resetBoard() {
  currentUser = null;
  currentProfile = null;
  cards = [];
  cursor = null;
  hasMore = true;
  prayedToday = new Set();
  myStats = {};
  boardStarted = false;
  observer?.disconnect();
  observer = null;
  if (els.boardGrid) els.boardGrid.innerHTML = '';
}
