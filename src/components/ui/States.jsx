import { SearchX, WifiOff, Film } from 'lucide-react';
import Button from './Button';

/** Friendly empty state (no results, empty watchlist, …). */
export function EmptyState({ icon: Icon = SearchX, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-ink-800 border border-ink-700 flex items-center justify-center mb-5">
        <Icon size={28} className="text-slate-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1.5">{title}</h3>
      {message && <p className="text-sm text-slate-400 max-w-sm leading-relaxed">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Network / API failure state with retry. */
export function ErrorState({ message, onRetry, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10' : 'min-h-[60vh]'} px-6 animate-fade-in`}
      role="alert"
    >
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
        <WifiOff size={28} className="text-red-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1.5">Couldn't load content</h3>
      <p className="text-sm text-slate-400 max-w-md leading-relaxed">
        {message ||
          'The streaming backend may be waking up from sleep (free hosting). Give it a moment and retry.'}
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-6">
          Try again
        </Button>
      )}
    </div>
  );
}

/** Poster fallback when an image URL is missing or broken. */
export function PosterFallback({ title }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-ink-800 to-ink-950 flex flex-col items-center justify-center gap-2 p-3">
      <Film size={24} className="text-slate-600" />
      <span className="text-[11px] font-semibold text-slate-500 text-center line-clamp-3">
        {title || 'No poster'}
      </span>
    </div>
  );
}
