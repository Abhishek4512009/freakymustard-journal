/** Shimmering placeholder block. */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden="true" />;
}

/** Grid of poster-shaped skeletons matching the app's card layout. */
export function PosterSkeletonRow({ count = 6 }) {
  return (
    <div className="flex gap-4 overflow-hidden px-4 md:px-8" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="min-w-[140px] md:min-w-[180px] w-[140px] md:w-[180px] aspect-[2/3] shrink-0"
        />
      ))}
    </div>
  );
}

/** Full-page branded loading state. */
export function PageLoader({ label = 'Loading' }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[70vh] gap-5"
      role="status"
      aria-live="polite"
    >
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-brand-500/15 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-brand-500 rounded-full animate-spin" />
        <div className="absolute inset-0 m-auto w-8 h-8 bg-gradient-to-tr from-brand-500 to-accent-500 rounded-lg flex items-center justify-center shadow-glow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5-11-6.5z" />
          </svg>
        </div>
      </div>
      <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase animate-pulse-soft">
        {label}…
      </p>
    </div>
  );
}
