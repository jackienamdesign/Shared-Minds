import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import Landing from './Landing.tsx';
import Photobooth from './Photobooth.tsx';
import './index.css';

/**
 * Hash routing, not history routing: GitHub Pages serves static files with no
 * rewrite rules, so a deep path like /week3 would 404 on a hard refresh.
 *
 * Week 1 is not a route here — it is a standalone no-build page in public/week1
 * and is reached by a real navigation out of this app.
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

  return route === 'photobooth' ? <Photobooth /> : <Landing />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Site />
  </StrictMode>,
);
