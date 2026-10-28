import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so the built page works from any subpath (e.g. GitHub Pages
  // under /Shared-Minds/words-hold-worlds/) without changing any code.
  base: './',
  // 'mpa' makes a missing file return a real 404 instead of index.html, so a
  // missing public/text.txt is detected honestly rather than parsed as HTML.
  appType: 'mpa',
})
