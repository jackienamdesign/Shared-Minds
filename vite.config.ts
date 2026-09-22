import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// GitHub Pages serves this repo from a subpath, so every asset URL needs the
// repo name prefixed. Applied in dev too, not just in build: `vite preview`
// runs as command 'serve', so making this conditional silently desyncs the
// preview server from the paths baked into the built HTML.
const GITHUB_PAGES_BASE = '/Shared-Minds/'

export default defineConfig({
  base: GITHUB_PAGES_BASE,
  // No SPA fallback. Routing here is hash-based, so it is never needed, and
  // leaving it on makes dev/preview serve the root page for /week1/ — which
  // GitHub Pages would not do. 'mpa' keeps local behaviour honest.
  appType: 'mpa',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // public/ is copied to the build verbatim. Week 1 lives in public/week1 — it
  // resolves React through an import map at runtime and must not be bundled.
  // Week 3's images are in public/week3/assets; its React source is bundled
  // from src/week3.
})
