import { PROXY_BASE } from '../api/directProxy';

/**
 * Pop-up defence for the parent page.
 *
 * The heavy lifting is done by the iframe `sandbox` attribute (we do NOT
 * grant `allow-popups`, so provider scripts inside the frame physically
 * cannot open new tabs). This module is the second line of defence for
 * anything that runs in OUR page context:
 *
 *  - neutralises window.open (providers sometimes escape via parent calls)
 *  - intercepts clicks on links that would open a new tab to an unknown host
 *  - auto-closes any window that does slip through
 *
 * Our own stream proxy is trusted — download/stream links must not be
 * treated as provider pop-ups. (Downloads don't open windows at all, see
 * lib/download.js; this keeps any future proxy link working too.)
 */
const TRUSTED_HOSTS = new Set([window.location.host, 'github.com', 'www.github.com']);
try {
  TRUSTED_HOSTS.add(new URL(PROXY_BASE).host);
} catch {
  /* keep the static list if the proxy base is malformed */
}

let installed = false;

export function installPopupGuard() {
  if (installed) return () => {};
  installed = true;

  const realOpen = window.open.bind(window);
  const opened = new Set();

  // 1. Neutralise window.open from our context.
  window.open = (url, target, features) => {
    try {
      const host = url ? new URL(url, window.location.href).host : '';
      if (!TRUSTED_HOSTS.has(host)) {
        console.info('[freakymustard] blocked pop-up:', url);
        return null;
      }
    } catch {
      return null;
    }
    const win = realOpen(url, target, features);
    if (win) opened.add(win);
    return win;
  };

  // 2. Intercept new-tab clicks to untrusted hosts (capture phase).
  const onClick = (e) => {
    const anchor = e.target.closest?.('a[target="_blank"]');
    if (!anchor) return;
    try {
      const host = new URL(anchor.href, window.location.href).host;
      if (!TRUSTED_HOSTS.has(host)) {
        e.preventDefault();
        e.stopPropagation();
        console.info('[freakymustard] blocked new-tab navigation:', anchor.href);
      }
    } catch {
      /* ignore */
    }
  };
  document.addEventListener('click', onClick, true);

  // 3. Sweep: close anything that slipped through.
  const sweeper = setInterval(() => {
    opened.forEach((win) => {
      if (win.closed) opened.delete(win);
      else {
        try {
          // Only closable when same-origin; cross-origin pop-ups are
          // already neutralised by the sandbox.
          if (!win.location.href.startsWith(window.location.origin)) win.close();
        } catch {
          win.close();
        }
      }
    });
  }, 2000);

  return () => {
    installed = false;
    window.open = realOpen;
    document.removeEventListener('click', onClick, true);
    clearInterval(sweeper);
  };
}
