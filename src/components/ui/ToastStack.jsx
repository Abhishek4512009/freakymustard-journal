import { createPortal } from 'react-dom';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const config = {
  success: {
    icon: CheckCircle2,
    classes: 'border-emerald-500/30 text-emerald-300',
    iconColor: 'text-emerald-400',
  },
  info: { icon: Info, classes: 'border-brand-500/30 text-brand-300', iconColor: 'text-brand-400' },
  warning: {
    icon: AlertTriangle,
    classes: 'border-amber-500/30 text-amber-300',
    iconColor: 'text-amber-400',
  },
  error: { icon: XCircle, classes: 'border-red-500/30 text-red-300', iconColor: 'text-red-400' },
};

/** Global toast stack (bottom-right desktop, above nav-bar on mobile). */
export default function ToastStack() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[300] flex flex-col gap-2 items-end pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const { icon: Icon, classes, iconColor } = config[toast.type] || config.success;
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-3 rounded-xl border glass shadow-card animate-toast-in max-w-sm ${classes}`}
          >
            <Icon size={18} className={`shrink-0 ${iconColor}`} />
            <span className="text-sm font-semibold text-white leading-snug">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
