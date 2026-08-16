/**
 * Cross-origin file download trigger.
 *
 * The popup guard (see lib/popupGuard.js) kills window.open + new-tab links
 * to untrusted hosts, and browser popup blockers add their own friction —
 * but downloads don't need a window at all. A same-tab anchor navigation to
 * a `Content-Disposition: attachment` response starts the download without
 * leaving the page, so the anchor carries no `target` on purpose.
 *
 * A short preflight validates the URL (token still valid, proxy reachable)
 * so an expired link toasts an error instead of navigating the SPA to the
 * proxy's error JSON.
 */

/**
 * Kick off a browser download for an attachment URL.
 *
 * @param {string} url
 * @param {object} [callbacks]
 * @param {() => void} [callbacks.onStarted] fired once the download begins
 * @param {(status: number|null) => void} [callbacks.onError] fired if the
 *   URL is rejected (HTTP status) or unreachable (status null)
 * @returns {Promise<boolean>} true when the download was triggered
 */
export async function triggerDownload(url, { onStarted, onError } = {}) {
  let ok;
  let status = null;
  try {
    const resp = await fetch(url);
    status = resp.status;
    ok = resp.ok;
    // Headers are all we needed — stop the relay immediately so the proxy
    // doesn't keep streaming the file into a discarded response body.
    await resp.body?.cancel?.();
  } catch {
    // Network error (proxy cold start can also make fetch throw on some
    // browsers). Let the anchor try anyway — its pending navigation is the
    // normal cold-start path.
    ok = true;
  }

  if (!ok) {
    onError?.(status);
    return false;
  }

  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener'; // no target: same-tab attachment download (see header)
  document.body.appendChild(a);
  a.click();
  a.remove();
  onStarted?.();
  return true;
}
