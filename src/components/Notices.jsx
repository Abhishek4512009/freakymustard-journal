import { createPortal } from 'react-dom';
import { SearchX, WifiOff, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

/** Flat loading rule. */
export function Loading({ label = 'Setting the type' }) {
  return (
    <div className="fm-loading" role="status" aria-live="polite">
      <div className="fm-loading-bar" aria-hidden="true">
        <i />
      </div>
      <p>{label}…</p>
    </div>
  );
}

/** Friendly empty state. */
export function Empty({ title, message, action }) {
  return (
    <div className="fm-notice">
      <SearchX size={22} aria-hidden="true" style={{ margin: '0 auto 10px' }} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

/** Network / API failure state with retry. */
export function Failure({ message, onRetry, compact = false }) {
  return (
    <div className="fm-notice" role="alert" style={compact ? { margin: '8px 0' } : undefined}>
      <WifiOff size={22} aria-hidden="true" style={{ margin: '0 auto 10px' }} />
      <h3>Couldn’t set this page</h3>
      <p>
        {message ||
          'The journal’s press (our backend) may be waking from sleep. Give it a moment and retry.'}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="fm-btn fm-btn--plain">
          Try again
        </button>
      )}
    </div>
  );
}

/** Global toast slips, bottom-left. */
export function Toasts() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fm-toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className="fm-toast">
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
