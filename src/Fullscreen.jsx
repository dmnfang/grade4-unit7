import { useEffect, useState } from 'react';

// Standard header button: toggles fullscreen. Hidden where the browser can't do it (e.g. iPhone Safari).
const current = () => document.fullscreenElement || document.webkitFullscreenElement;
const supported = () => document.fullscreenEnabled || document.webkitFullscreenEnabled;

export default function FullscreenBtn() {
  const [on, setOn] = useState(!!current());

  useEffect(() => {
    const sync = () => setOn(!!current());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  if (!supported()) return null;

  const toggle = () => {
    const el = document.documentElement;
    const run = current()
      ? (document.exitFullscreen || document.webkitExitFullscreen).call(document)
      : (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    Promise.resolve(run).catch(() => {});
  };

  return (
    <button
      className="topbar-action secondary icon-btn"
      onClick={toggle}
      aria-label={on ? 'Exit full screen' : 'Enter full screen'}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {on ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
    </button>
  );
}
