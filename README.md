# Shared Minds

An interactive canvas tool to capture, visualize, and map streams of consciousness in real-time.

A person types a worry into a field. It rises as a bubble and floats — or it is
destroyed, because a machine decided the thought was not about anything
billable.

## How it's built
- **No build step.** Plain ES modules loaded straight from `index.html`, with an
  import map pointing the bare `react` imports at a CDN. Nothing to compile.
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
Simply open `index.html` in any modern web browser or serve it locally:

```bash
# Optional: using python or any static server
python3 -m http.server 8000
```

---

# Changelog

Newest first. One `###` block per working session — date, a short name for what
it was about, then what changed in plain terms. Keep "still open" notes at the
bottom of an entry; they are the fastest way back in next time.

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
