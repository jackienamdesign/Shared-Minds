# Shared Minds

Coursework for Shared Minds (ITP). One repo, one deployed site, one piece per
assignment, with a landing page at the root that lets you pick between them.

| | Piece | Lives in | URL |
|---|---|---|---|
| Week 01 | Stream of Consciousness | `public/week1/` | `/week1/` |
| Week 03 | Interactive Photobooth | `src/Photobooth.tsx` | `/#/photobooth` |

Live at **https://jackienamdesign.github.io/Shared-Minds/**

## Running it

```bash
npm install
npm run dev      # http://localhost:5173/Shared-Minds/
```

The dev server uses the same `/Shared-Minds/` base path as production, so a
broken asset path shows up locally instead of only after deploying.

```bash
npm run build    # -> dist/
npm run preview  # serve dist/ exactly as GitHub Pages will
```

## How the two pieces coexist

Week 1 has no build step and week 3 needs one, so they are served differently
rather than forced into one pipeline:

- **Week 1 lives in `public/`.** Vite copies that directory into the build
  byte-for-byte, so the import map and CDN `<script>` tags keep resolving at
  runtime exactly as they always did. It is never bundled.
- **Week 3 and the landing page are the Vite app** at the repo root, sharing one
  React bundle.
- **Routing is hash-based** (`#/photobooth`). GitHub Pages serves static files
  with no rewrite rules, so a real path like `/week3` would 404 on refresh.
  Week 1 is not a route — it is a genuine page load out of the app.

## Deploying

`.github/workflows/deploy.yml` builds on every push to `main` and publishes
`dist/`. This requires **Settings → Pages → Source = GitHub Actions** (not
"Deploy from a branch"), since the served site is now a build artifact rather
than the repo contents.

---

# Week 01 — Stream of Consciousness

A person types a worry into a field. It rises as a bubble and floats — or it is
destroyed, because a machine decided the thought was not about anything
billable.

## How it's built
- **No build step.** Plain ES modules loaded straight from its own `index.html`,
  with an import map pointing the bare `react` imports at a CDN. Nothing to
  compile — which is why it sits in `public/` untouched by the bundler.
- **The field** is `liquid-glass-react`, used for this one element because it is
  the focal point. Everything that floats uses cheap CSS glass instead —
  see the note at the top of `bubbles.js`.
- **The sky** is Vanta CLOUDS on three.js r134 (newer breaks its shaders).
- **The verdict** is Gemini 3.1 Pro via Replicate, with a keyword lexicon as the
  offline fallback. See below.

## The verdict

A submitted thought leaves the field immediately and floats **pending** — it has
not been reviewed yet, only released. `judge.js` sends it to Gemini 3.1 Pro on
Replicate, through the ITP/IMA proxy:

```
https://itp-ima-replicate-proxy.web.app/api/create_n_get
```

No API key lives in this repo and nothing is billed — the proxy holds the
credentials and relays both directions. The reply comes back in 3–8s as
`FLOAT` or `POP`; the bubble either keeps drifting or is destroyed.

The judge answers with a verdict and one tag from a closed set, so you can see
*which* rule fired: `throughput`, `not-billable`, `self-as-casualty`,
`self-as-subject`, `body`, `mixed`. The tag never changes the outcome and is
never shown to the person at the field — it goes to the console, for tuning.

`classify.js` is the fallback. If the proxy is unreachable, times out, or
answers with something unparseable, the original keyword lexicon decides
instead, so the piece still works offline. The rule is stated twice — as lists
in `classify.js`, as prose in `RUBRIC` in `judge.js` — and the two are meant to
agree. See `prompts/expand-lexicon.md` before widening either.

## Tuning what gets rejected

Don't edit `RUBRIC` by feel. There is a test set and a harness:

```bash
node calibrate.mjs              # every case
node calibrate.mjs body mixed   # only cases with these expected tags
```

`calibration.js` holds the intended verdict for ~35 thoughts, written in
minimal pairs — sentences on the same topic that differ only in who the
sentence is *about*, since that is the boundary the piece actually cares
about. `calibrate.mjs` runs them through the live judge and reports verdict
accuracy, tag accuracy, and what the lexicon would have said.

The loop: change **one** thing in `RUBRIC`, re-run, compare. Changing several
at once moves the number without telling you which edit did it. When a case
fails, decide whether the rubric is wrong or the expectation was — a
disagreement here is often the piece telling you something you hadn't decided.

The lexicon column is not a score. `classify.js` has no notion of who a
sentence is about, so it loses the `self-as-subject` and `body` blocks by
construction. The column shows how much blunter the piece gets when it falls
back, which is the standing argument for growing `SELF_AS_CASUALTY`.

## Getting Started

Run the site (`npm run dev`) and open `/Shared-Minds/week1/`. Every file for
this piece is in `public/week1/`; `calibrate.mjs` stays at the repo root so the
harness is not published with the site.

---

# Changelog

Newest first. One `###` block per working session — date, a short name for what
it was about, then what changed in plain terms. Keep "still open" notes at the
bottom of an entry; they are the fastest way back in next time.

### 2026-09-22 — one site, two pieces

**The short version:** the repo used to be one piece served straight from its
files. It is now a small site with a front page that lets you pick a piece, and
the week 3 photobooth has been brought in alongside week 1.

**1. Week 1 moved into `public/week1/` and is otherwise untouched.** Vite copies
that folder into the build verbatim, so the import map and CDN scripts still
resolve at runtime. Deliberately not bundled — bundling it would have meant
resolving the bare `react` imports at build time and rewriting a piece whose
whole premise is that it has no build step. Only two additions: a back link in
`index.html` and a `.back-link` rule in `style.css`.

**2. Week 3 came over from Figma Make.** `App.tsx` became `src/Photobooth.tsx`.
The four Figma-specific Vite plugins and `.figma/make/site.json` were dropped —
they only did anything inside Figma's hosting — so `vite.config.ts` is now about
20 lines instead of 400.

**3. There's a landing page.** `src/Landing.tsx`, with a CSS-drawn preview of
each piece rather than screenshots, so the cards don't go stale when a piece is
edited.

**4. The site is built and deployed by CI now.** Week 3 needs a build and week 1
doesn't, so GitHub Pages can no longer serve the repo as-is.
`.github/workflows/deploy.yml` builds and publishes `dist/`.

**5. Toolchain is npm, not pnpm.** The photobooth arrived with a pnpm lockfile,
but pnpm isn't installed on the machine this was set up on and `.mise.toml`
wasn't in effect either. `.mise.toml` now just pins Node 22.

**Still open:**
- **The Pages source has to be changed by hand** — Settings → Pages → Source →
  GitHub Actions. Until that's flipped, the deploy workflow will run green and
  the live site will keep serving the old week-1-at-root version.
- Week 1's live URL moved from `/Shared-Minds/` to `/Shared-Minds/week1/`. The
  old URL now lands on the picker, so a previously-submitted link still resolves
  somewhere sensible, but no longer opens the piece directly.
- The photobooth's film strip and the ⊞ / ☺ / ▭ toolbar buttons are still
  decorative — the strip shows stock Pingu frames rather than reacting to the
  captured pose, which is the part week 3 is actually meant to do.
- Verified by build, typecheck, and serving `dist/` locally. Not opened in a
  browser here, and the photobooth needs camera permission, so give both pieces
  a real look before submitting.

### 2026-09-15 — the judge

**The short version:** thoughts used to be checked against a list of words.
Now an AI reads the sentence and decides. The word list is still there, but
only as a backup for when the internet isn't.

**1. The site talks to Replicate now.** New file `judge.js`. It sends the
thought to Google's Gemini 3.1 Pro through the ITP/IMA proxy, so there's no API
key in this project and nothing to pay for.

**2. Thoughts float before they're judged.** The AI takes 3–8 seconds to
answer. Freezing the input that long would just read as the site being broken,
so a thought now leaves the field immediately and drifts while it's under
review, then gets destroyed or left alone when the verdict lands. While it's
waiting there's a faint pulse on the bubble. Nothing here is safe — it just
hasn't been reviewed yet.

**3. The word list got demoted.** `classify.js` is unchanged, but it only
decides when the proxy is unreachable, times out, or replies with something
unreadable. The piece still works with no internet.

**4. The rule the AI follows got much sharper.** It used to be a list of
allowed topics, which meant anything containing the word "rent" survived. Now
it's one principle — *a thought about the work survives, a thought about the
person doesn't* — plus three ways a work-sounding thought still dies:

| looks allowed, but | example |
|---|---|
| the job is consuming you | "my job is destroying me" |
| you're judging yourself, work is just the backdrop | "i'm not good enough for this job" |
| money or work has reached your body | "i skip meals to make rent" |

And: if any part of a sentence is about you, the whole sentence pops. A
permitted clause doesn't launder the rest of it.

**5. The AI says *why*.** Every verdict comes back with one word naming which
rule fired — `throughput`, `not-billable`, `self-as-casualty`,
`self-as-subject`, `body`, `mixed`. It goes to the browser console only. The
person at the field is still told nothing, which is the point.

**6. There's a way to test changes now.** `calibration.js` holds 35 example
thoughts with the verdict they *should* get. `node calibrate.mjs` runs them all
and scores it. Currently **34/35**. Use it whenever you edit the rule — change
one thing, re-run, compare.

**Still open:**
- `"should i quit and go to grad school"` is the one failing case. The AI pops
  it (reads as a question about who you are); the test file expects it to float
  (it's a career decision). Both are defensible — it needs your call, not a fix.
- The AI is now far stricter than the word list can ever be, because a word list
  can't tell who a sentence is about. When the proxy is down the piece gets
  noticeably blunter. Growing `SELF_AS_CASUALTY` narrows that gap but can't
  close it.
- The Chrome extension wasn't connected, so the new pending-pulse was verified
  in Node against a DOM stub, not by eye in a real browser. Worth a look.
