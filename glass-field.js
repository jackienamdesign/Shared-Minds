/**
 * The thought field.
 *
 * Uses liquid-glass-react (github.com/rdev/liquid-glass-react, MIT) for this one
 * element only — it is the piece's focal point and worth the cost. Everything
 * that floats uses cheap CSS glass instead; see bubbles.js.
 *
 * React and the library resolve through the import map in index.html, so there
 * is still no build step. Written with React.createElement rather than JSX,
 * because JSX would require a compiler and that is the whole point.
 */

import React, { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import LiquidGlass from 'liquid-glass-react';

import { classify } from './classify.js';
import { spawnThought } from './bubbles.js';

const h = React.createElement;

const ERROR_TEXT = 'Sorry, you are not allowed to think those thoughts. Try again.';
const ERROR_HOLD = 3000;

/** Vertical half of the glass pill's padding prop — keep the two in sync. */
const GLASS_PAD_Y = 16;

function ThoughtField() {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const [recoiling, setRecoiling] = useState(false);

  const inputRef = useRef(null);
  const errorTimer = useRef(null);

  // Fires at the instant of the pop, not at submit — the pop is the reveal.
  const handlePop = useCallback(() => {
    setShowError(true);
    setRecoiling(true);
    window.setTimeout(() => setRecoiling(false), 320);

    window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setShowError(false), ERROR_HOLD);
  }, []);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text) return;

    const verdict = classify(text);

    // Measured from the input, not a wrapper: the glass is fixed-positioned by
    // the library, so its wrapper has no laid-out box. GLASS_PAD_Y backs the
    // measurement out to the pill's actual top edge.
    const rect = inputRef.current.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top - GLASS_PAD_Y };

    spawnThought(text, verdict, origin, verdict === 'rejected' ? handlePop : undefined);

    setValue('');
    setShowError(false);
    window.clearTimeout(errorTimer.current);
  }, [value, handlePop]);

  const onKeyDown = useCallback(
    (e) => {
      // The page has no other keyboard handlers, but keep typing from leaking.
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  return h(
    React.Fragment,
    null,
    h(
      LiquidGlass,
      {
        displacementScale: 58,
        blurAmount: 0.06,
        saturation: 135,
        aberrationIntensity: 2,
        // Elasticity physically drags the glass toward the cursor. Kept low so
        // the field stays visually centred; 0 locks it dead centre.
        elasticity: 0.1,
        cornerRadius: 999,
        padding: `${GLASS_PAD_Y}px 30px`,
        overLight: true,
        // The library always emits translate(-50%, -50%) and defaults to
        // top/left:50%, but leaves `position` to the caller. Without fixed
        // here it centres against whatever ancestor box it lands in and drifts
        // off-screen-centre. The recoil rides the library's own 0.2s ease-out
        // transition by nudging `top` — an ancestor transform can't be used,
        // it would break position:fixed.
        style: {
          position: 'fixed',
          top: recoiling ? 'calc(50% + 5px)' : '50%',
          left: '50%'
        }
      },
      h('input', {
        ref: inputRef,
        type: 'text',
        className: 'thought-input',
        placeholder: 'what are you worried about?',
        value: value,
        autoFocus: true,
        autoComplete: 'off',
        spellCheck: false,
        onChange: (e) => setValue(e.target.value),
        onKeyDown: onKeyDown,
        'aria-label': 'What are you worried about?'
      })
    ),
    h(
      'div',
      {
        className: 'field-error' + (showError ? ' is-visible' : ''),
        role: 'status',
        'aria-live': 'polite'
      },
      ERROR_TEXT
    )
  );
}

const mount = document.getElementById('glass-field-root');

if (mount) {
  createRoot(mount).render(h(ThoughtField));
}
