import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Accessible modal: portal, backdrop, Escape to close, focus trap,
 * body scroll lock, focus restore on unmount.
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }) {
  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Scroll lock + focus bookkeeping
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog
    requestAnimationFrame(() => {
      containerRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  // Escape + focus trap
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && containerRef.current) {
        const focusables = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, video, iframe, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`bg-ink-900 border border-ink-700 rounded-2xl w-full ${maxWidth} overflow-hidden shadow-2xl animate-scale-in outline-none`}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700">
            <div className="text-lg font-black text-white truncate pr-4">{title}</div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 rounded-full bg-ink-800 hover:bg-red-600 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
