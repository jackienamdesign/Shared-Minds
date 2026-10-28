# Words Hold Worlds — build plan

Every word holds a world of its own. The page starts as a quiet e-ink style
reading page with one excerpt of a book chapter. Selecting a word and scrolling
zooms into it. The word dissolves into dots, and past the dots you enter a dark
3D point cloud world showing what the word holds.

NYU ITP Shared Minds, week on 3D. Goals: move a 2D HTML interface into 3D
space, use camera movement to tell a story, and have AI models help build the
world.

**Stack:** Vite + three.js. One HTML page. No UI frameworks. Readable,
commented code.

## Delivery steps

Stop after each step for testing before continuing.

1. [x] Text layer: e-ink styling, word selection, normal reading scroll.
2. [x] Word to dots zoom on scroll, with the e-ink flash and reverse.
3. [x] 3D point cloud world for "bread" using placeholder shapes, with the scripted camera path.
4. [ ] The other six world words' worlds (rain, puddle, glow, pig, fluffy, dandelion), on placeholders.
5. [ ] On hold (2026-10-28): LLM generated primitive worlds for all other words. For now only the chosen world words open worlds; any other word zooms into its own dots.
6. [ ] Hunyuan 3D generation script (`npm run generate`) and swapping placeholders for real models.

---

## 1. Text layer (starting state)

- Load the excerpt from `/public/text.txt` (supplied by Jackie). Never write, fill in or paraphrase any book text.
- Paragraphs in text.txt are separated by blank lines.
- E-ink reading look, not a device mockup. No frame or case.
- Background: warm paper grey (~#ecebe4) with a faint static paper grain (SVG noise, very low opacity).
- Font: Literata, ~18px, line height 1.6, centered column ~34em wide, generous margins.
- Ink: soft charcoal grey (#5a5a56), slightly grainy like e-ink particles.
- First-line indents instead of paragraph gaps, like a Kindle page.
- Page transitions are quick, flat and slightly stepped. No smooth hover fades.
- Each word in its own span; punctuation stripped for matching but kept visible.
- Hover: subtle darkening. Click: word turns #111, drawn bolder (a text stroke, so the line doesn't reflow), and becomes the active word. One active word at a time.
- Hint at the top on first load: "select a word, then scroll." Disappears after the first selection.

## 2. Scroll behavior

- No word selected: scroll reads down the page normally.
- Word selected: scroll zooms into it instead (page scroll locked).
- Scroll maps to one progress value 0 → 1 that drives every stage, so the transition is continuous and reversible.
- Escape, or zooming all the way back out, deselects the word and returns normal scroll.

## 3. Zoom transition

- Stage 1: the word scales up and breaks into black dots, sampled from its letter shapes on an offscreen canvas.
- Stage 2: a smooth dip to black — the page darkens under a veil, the black dots sink into it, and they rise back out as white dots. (Changed 2026-10-28 from a hard e-ink flash, which felt too abrupt.)
- Stage 3: background black, dots white, camera pushes through the letters into the 3D world.
- Zooming out reverses everything, through the same dip, before returning to the page.

## 4. 3D world (zoomed in)

- Black background. White and grey points only. No color.
- Point clouds placed all around the camera, not only in front.
- Soft fog; distant points fade.
- Points shimmer slightly over time, like breathing static.
- On entering, the camera follows a scripted path, carried by scroll rather than a timer (changed 2026-10-28: a timed path swivelled on its own and made scrolling back hard to follow). Drag to look around from the start of the path; only a faint breathing drift at the very end, which never turns the view.
- No lines, labels or text in the 3D world.

## 5. World data

Worlds live in `/src/worlds.json`, keyed by lowercase word:

```json
{
  "bread": {
    "source": "authored",
    "figures": [
      { "model": "/worlds/bread/girl.glb", "position": [0, 0, 0], "scale": 1, "density": 0 },
      { "model": "/worlds/bread/pig.glb", "position": [0, 0, 0], "scale": 1, "density": 0 }
    ],
    "cameraPath": [[0, 0, 0]],
    "motion": "still"
  }
}
```

(`density` is the per-figure point count setting required by step 6.)

**World words** (chosen 2026-10-28). Only these open worlds. They're drawn darker and slightly bolder on the page, and only one occurrence of each (`occurrence` in worlds.json) is marked: rain (1st), puddle, glow, bread (2nd), pig (2nd), fluffy, dandelion. Each entry has a `scene` brief.

Original three, cold to hope:

- **rain** — dense sheets of white dots falling all around; a small figure in an oversized jacket walking through them. Rain is a particle system. Motion: falling.
- **bread** — a girl slumped at the base of an apple tree, a pig pen and pig beside her, two loaves arcing through the air toward her. The loaves' burned crusts are the densest dots in the scene. Camera starts low on the muddy ground near the pig, rises slowly, and turns until the girl comes into view. Motion: still, heavy.
- **dandelion** — a single dandelion head whose seeds lift off and drift past and around. Motion: floating upward.

Simple placeholder point shapes for each figure until the real models exist.

## 6. AI generated 3D models (for authored worlds)

- Use `tencent/hunyuan-3d-3.1` on Replicate for image to 3D, called through the proxy. Never call Replicate directly from the browser and never put the Replicate token in client code.
- Before writing this code, check the model's API schema on Replicate for the exact input field names and output format. Do not guess them.
- Reuse the request pattern from `/reference/pingu-proxy.js`. If the proxy needs a different route or format for Replicate than for Gemini, tell Jackie what to change instead of working around it.
- Replicate predictions are async: create the prediction, poll its status until it succeeds or fails, then download the output file. Log each status to show progress.
- Inputs: shaded reference images in `/public/worlds/<word>/` (Jackie adds these). One image per figure.
- Output: a GLB mesh. Load with GLTFLoader, ignore all textures and color, sample points evenly across the surface with MeshSurfaceSampler. Points are white or grey only.
- Point density is a per-figure setting in worlds.json, so the loaves can be denser than the tree.
- Runs as a separate script (`npm run generate`), not from the live page. Save each GLB to `/public/worlds/<word>/` and skip any figure already generated, so each model only runs once.
- If generation fails, keep the placeholder points so the world still works.

## 7. LLM generated worlds (every other word)

- Any word without an authored world gets one generated on the fly.
- Send the word and its surrounding sentence to Gemini through the proxy. Ask for JSON only: a small scene of three.js primitives (sphere, box, cylinder, cone, torus, plane) with positions, scales, rotations, a camera path and a motion type (still, falling, floating, drifting).
- Validate the JSON. On parse failure retry once, then fall back to a slow drifting cloud of the word's own dots.
- Never render primitives as solid meshes — sample points across each surface so generated worlds match the dotted look.
- Cache each generated world in localStorage (try/catch) so a word returns to the same world.
- Loading state: the word's dots drift slowly in the dark while waiting.

## 8. Proxy

- Before writing any model code, read `/reference/pingu-proxy.js` and reuse the same proxy URL, request format and response handling.
- All proxy calls in one file, `/src/proxy.js`, so models can be swapped later.
- Never put API keys in client code. Secrets go in `.env`.

## Feel

Minimal, quiet, immersive. Monochrome only. Slow easing in the 3D world, flat
and stepped on the page. No buttons or menus.
