import './styles.css';
import './app.js';

// Register the lightweight runtime-caching service worker only in production.
// Keeping it out of Vite dev mode avoids stale assets while contributing.
if (import.meta.env?.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Proof Fitness service worker registration failed:', error);
    });
  });
}
