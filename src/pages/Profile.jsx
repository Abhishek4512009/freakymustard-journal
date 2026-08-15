import { Link } from 'react-router-dom';
import { Bookmark, History, CheckCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePageMeta } from '../hooks';
import MovieCarousel from '../components/MovieCarousel';
import SectionHeader from '../components/SectionHeader';
import { EmptyState } from '../components/ui/States';
import Badge from '../components/ui/Badge';

/**
 * My Space: profile switcher, honest stats, continue watching + watchlist.
 */
export default function Profile() {
  usePageMeta('My Space — Streamda', 'Manage profiles, watchlist and continue watching.');

  const { profiles, activeProfile, switchProfile, watchlist, continueWatching, showToast } =
    useApp();

  const stats = [
    {
      label: 'In watchlist',
      value: watchlist.length,
      icon: Bookmark,
      tone: 'text-brand-400 bg-brand-500/10',
      to: '/watchlist',
    },
    {
      label: 'Continue watching',
      value: continueWatching.length,
      icon: History,
      tone: 'text-accent-400 bg-accent-500/10',
      to: '#continue',
    },
    {
      label: 'Finished',
      value: continueWatching.filter((x) => x.progress >= 95).length,
      icon: CheckCheck,
      tone: 'text-emerald-400 bg-emerald-500/10',
    },
  ];

  return (
    <div className="min-h-screen pb-20 pt-8 md:pt-14 px-4 md:px-8 space-y-10 max-w-6xl mx-auto">
      {/* Profile header */}
      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-ink-900 to-ink-950 p-6 md:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-16 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px]"
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className={`w-18 h-18 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${activeProfile.gradient} flex items-center justify-center text-4xl shadow-card border border-white/10`}
              style={{ width: 76, height: 76 }}
            >
              {activeProfile.emoji}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white font-display">
                {activeProfile.name}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Your watchlist and progress are saved on this device.
              </p>
            </div>
          </div>

          {/* Switcher */}
          <div
            className="flex items-center gap-2.5 bg-ink-950/60 border border-white/5 p-2 rounded-xl self-start"
            role="radiogroup"
            aria-label="Switch profile"
          >
            {profiles.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={activeProfile.id === p.id}
                title={p.name}
                onClick={() => {
                  switchProfile(p.id);
                  showToast(`Switched to ${p.name}`, 'info');
                }}
                className={`w-11 h-11 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center text-xl border transition-all duration-200 cursor-pointer ${
                  activeProfile.id === p.id
                    ? 'border-white scale-110 shadow-card'
                    : 'border-transparent opacity-50 hover:opacity-90 hover:scale-105'
                }`}
              >
                {p.emoji}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Statistics">
        {stats.map(({ label, value, icon: Icon, tone, to }) => {
          const inner = (
            <>
              <div className={`p-3 rounded-xl ${tone}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-black text-white font-display">{value}</p>
                <p className="text-xs text-slate-400 font-semibold">{label}</p>
              </div>
            </>
          );
          const cls =
            'flex items-center gap-4 p-5 rounded-2xl bg-ink-900/60 border border-ink-700/60 hover:border-ink-600 transition-colors';
          return to ? (
            <Link key={label} to={to} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={label} className={cls}>
              {inner}
            </div>
          );
        })}
      </section>

      {/* Continue watching */}
      <section id="continue" aria-label="Continue watching">
        <SectionHeader title="Continue Watching" />
        {continueWatching.length > 0 ? (
          <>
            <MovieCarousel
              movies={continueWatching.map((item) => ({ ...item, _watchLink: item.watchLink }))}
              isContinueWatching
            />
            <p className="text-[11px] text-slate-600 px-4 md:px-8 mt-2">
              Progress for embedded players is marked as started; Tamil direct streams save exact
              positions.
            </p>
          </>
        ) : (
          <div className="px-4 md:px-8">
            <EmptyState
              icon={History}
              title="Nothing in progress"
              message="Start watching anything and it will show up here so you can pick up where you left off."
              action={
                <Link
                  to="/"
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold transition-colors"
                >
                  Browse home
                </Link>
              }
            />
          </div>
        )}
      </section>

      {/* Watchlist preview */}
      <section aria-label="Watchlist preview">
        <SectionHeader title="Watchlist" to="/watchlist" />
        {watchlist.length > 0 ? (
          <MovieCarousel movies={watchlist} type="movies" />
        ) : (
          <div className="px-4 md:px-8">
            <EmptyState
              icon={Bookmark}
              title="Your watchlist is empty"
              message="Tap the + button on any movie or series to save it for later."
              action={
                <Link
                  to="/search"
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold transition-colors"
                >
                  Find something to watch
                </Link>
              }
            />
          </div>
        )}
      </section>

      {/* Storage note */}
      <section className="px-4 md:px-8">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-ink-900/40 border border-ink-700/40">
          <Badge tone="neutral" className="mt-0.5 shrink-0">
            LOCAL
          </Badge>
          <p className="text-xs text-slate-500 leading-relaxed">
            Streamda stores everything in your browser (localStorage) — no account, no tracking.
            Clearing site data will reset your watchlist and history.
          </p>
        </div>
      </section>
    </div>
  );
}
