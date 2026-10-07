import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import Landing from './Landing.tsx';
import Photobooth from './week3/Photobooth.tsx';
import './index.css';

/**
 * Hash routing, not history routing: GitHub Pages serves static files with no
 * rewrite rules, so a deep path like /week3 would 404 on a hard refresh.
 *
 * Week 1 and Week 4 are standalone multi-page entries (public/week1 and week4/)
 * reached by real navigations.
 */
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return hash.replace(/^#\/?/, '');
}

function Site() {
  const route = useHashRoute();

  useEffect(() => {
    // The landing page scrolls; the photobooth is a fixed-size stage.
    document.body.style.overflow = route === 'photobooth' ? 'hidden' : '';
  }, [route]);

  if (route === 'photobooth') return <Photobooth />;
  return <Landing />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Site />
  </StrictMode>,
);
