# Shared Minds

An interactive canvas tool to capture, visualize, and map streams of consciousness in real-time.

## Features (Foundation)
- 🎨 **Vanilla HTML5 Canvas & JavaScript**: Ultra-fast, zero-dependency foundation with retina display support.
- 🌌 **Neural Particle Engine**: Interactive particle streams connecting ambient thoughts.
- ✨ **Aesthetic HUD**: Modern glassmorphism interface ready to be customized.

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
