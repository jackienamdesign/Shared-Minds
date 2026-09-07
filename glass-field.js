/**
 * Liquid glass thought field.
 *
 * Uses liquid-glass-react (github.com/rdev/liquid-glass-react, MIT) mounted as a
 * small React "island" inside the otherwise-vanilla page. React and the library
 * are loaded from esm.sh via the import map in index.html, so there is still no
 * build step.
 *
 * Written with React.createElement rather than JSX — JSX needs a compiler, and
 * avoiding one is the whole point of the import-map setup.
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import LiquidGlass from 'liquid-glass-react';

const h = React.createElement;

function ThoughtField() {
  const [value, setValue] = useState('');

  return h(
    LiquidGlass,
    {
      // Tuned for a wide, pill-shaped input rather than the README's button.
      displacementScale: 58,
      blurAmount: 0.06,
      saturation: 135,
      aberrationIntensity: 2,
      elasticity: 0.22,
      cornerRadius: 999,
      padding: '16px 30px',
      overLight: true // the Vanta sky behind this is daytime
    },
    h('input', {
      type: 'text',
      className: 'thought-input',
      placeholder: 'what are you thinking about',
      value: value,
      onChange: (e) => setValue(e.target.value),
      // The canvas underneath listens on window for particle spawning; stop
      // typing from doubling as canvas interaction.
      onKeyDown: (e) => e.stopPropagation(),
      'aria-label': 'What are you thinking about'
    })
  );
}

const mount = document.getElementById('glass-field-root');

if (mount) {
  createRoot(mount).render(h(ThoughtField));
}
