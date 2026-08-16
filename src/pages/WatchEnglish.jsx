import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  Star,
  Plus,
  Check,
  Server,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { getDetails } from '../api/englishApi';
import { useApp } from '../context/AppContext';
import { usePageMeta } from '../hooks';
import { cleanTitle } from '../lib/format';
import { installPopupGuard } from '../lib/popupGuard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../components/ui/States';

/**
 * English watch page (movie or series).
 * Streams via third-party embed servers; the user picks a server and we
 * remember the choice. Progress is recorded honestly (opened = started,
 * no fabricated percentages).
 */
export default function WatchEnglish() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { saveProgress, addToWatchlist, removeFromWatchlist, isInWatchlist, showToast } = useApp();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [serverIndex, setServerIndex] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  usePageMeta(details ? `${cleanTitle(details.title)} — Streamda` : 'Watching — Streamda');

  // Pop-up defence while a player is mounted.
  useEffect(() => installPopupGuard(), []);

  useEffect(() => {
    const controller = new AbortController();
    let started = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDetails(type, id, controller.signal);
        if (!data) throw new Error('Empty response');
        setDetails(data);

        if (type === 'series' && data.episodes?.length > 0) {
          const firstEp = data.episodes[0];
          setSelectedSeason(firstEp.season);
          setSelectedEpisode(firstEp);
        }

        // Honest "started watching" bookmark (progress unknown for embeds).
        if (!started) {
          started = true;
          saveProgress({
            id: data.id || id,
            title: data.title,
            type: type === 'movies' ? 'movies' : 'series',
            poster: data.poster || data.backdrop,
            progress: null,
            watchLink: `/watch/english/${type}/${data.id || id}`,
          });
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  const seasons = useMemo(
    () =>
      type === 'series' && details?.episodes
        ? [...new Set(details.episodes.map((ep) => ep.season))].sort((a, b) => a - b)
        : [],
    [type, details]
  );

  const seasonEpisodes = useMemo(
    () =>
      type === 'series' && details?.episodes
        ? details.episodes
            .filter((ep) => ep.season === selectedSeason)
            .sort((a, b) => a.episode - b.episode)
        : [],
    [type, details, selectedSeason]
  );

  const currentStreams = useMemo(() => {
    if (!details) return [];
    const backendStreams =
      type === 'movies' ? details.streams || [] : selectedEpisode?.streams || [];

    // Front-load a verified ad-light provider (clean Next.js player, no
    // pop-under networks detected) so it's the default pick.
    // Movies only: vidlink's TV routes need TMDB ids, and our backend
    // speaks IMDB — series fall back to the backend's server list.
    const imdbId = details.id || id;
    const merged =
      type === 'movies'
        ? [{ name: 'VidLink ✦', url: `https://vidlink.pro/movie/${imdbId}` }, ...backendStreams]
        : backendStreams;
    // De-dupe by URL in case the backend adds the same provider later.
    const seen = new Set();
    return merged.filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }, [details, type, selectedEpisode, id]);

  const currentStream = currentStreams[Math.min(serverIndex, currentStreams.length - 1)];

  const selectEpisode = (ep) => {
    setSelectedEpisode(ep);
    setServerIndex(0);
    saveProgress({
      id: details.id || id,
      title: details.title,
      type: 'series',
      poster: details.poster || details.backdrop,
      progress: null,
      season: ep.season,
      episode: ep.episode,
      watchLink: `/watch/english/series/${details.id || id}`,
    });
    showToast(`Now playing S${ep.season} E${ep.episode}: "${ep.title}"`, 'info');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Watch link copied to clipboard', 'success');
    } catch {
      showToast('Could not copy the link', 'error');
    }
  };

  if (loading) return <PageLoader label="Loading player" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!details) return <EmptyState title="Title not found" />;

  const title = cleanTitle(details.title);
  const isAdded = isInWatchlist(details.id || id);

  const toggleWatchlist = () => {
    if (isAdded) {
      removeFromWatchlist(details.id || id);
      showToast(`Removed "${title}" from Watchlist`, 'info');
    } else {
      addToWatchlist({
        id: details.id || id,
        title: details.title,
        type,
        poster: details.poster || details.backdrop,
        year: details.year,
        rating: details.rating,
      });
      showToast(`Added "${title}" to Watchlist`, 'success');
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="px-4 md:px-10 pt-6 md:pt-10 pb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-2.5 bg-ink-800 hover:bg-ink-700 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-white truncate font-display">
              {title}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 truncate">
              {details.year} {details.runtime && `· ${details.runtime}`}
              {details.rating && ` · ⭐ ${details.rating}`}
              {type === 'series' && selectedEpisode && (
                <span className="text-brand-300 font-semibold">
                  {' '}
                  · S{selectedSeason} E{selectedEpisode.episode}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleWatchlist}
            aria-label={isAdded ? 'Remove from watchlist' : 'Add to watchlist'}
            aria-pressed={isAdded}
          >
            {isAdded ? <Check size={18} className="text-brand-400" /> : <Plus size={18} />}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleShare}>
            <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
          </Button>
        </div>
      </div>

      <div className="px-4 md:px-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 xl:gap-8 max-w-[1600px] mx-auto">
        {/* Player column */}
        <div className="space-y-5 min-w-0">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-ink-700 shadow-card">
            {currentStream ? (
              <iframe
                key={currentStream.url}
                src={currentStream.url}
                className="w-full h-full"
                title={`${title} player`}
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                referrerPolicy="no-referrer"
                // Deliberately NO `allow-popups`: this is what physically
                // prevents provider ad scripts from opening pop-unders.
                // Playback-critical permissions (scripts/same-origin/forms)
                // stay granted so players keep working.
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <AlertTriangle size={28} />
                <p className="text-sm font-semibold">No streams available for this title.</p>
              </div>
            )}
          </div>

          {/* Server picker */}
          {currentStreams.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                <Server size={13} /> Servers
              </span>
              {currentStreams.map((s, idx) => (
                <button
                  key={s.url}
                  onClick={() => setServerIndex(idx)}
                  aria-pressed={idx === serverIndex}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-200 cursor-pointer ${
                    idx === serverIndex
                      ? 'bg-brand-500 border-brand-400 text-white shadow-glow'
                      : 'bg-ink-800 border-ink-700 text-slate-300 hover:border-brand-500/40 hover:text-white'
                  }`}
                >
                  {s.name || `Server ${idx + 1}`}
                </button>
              ))}
              <a
                href={currentStream?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Open in new tab <ExternalLink size={11} />
              </a>
            </div>
          )}

          {/* About */}
          <div className="bg-ink-900/70 border border-ink-700/60 rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
              About
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {details.description || 'No description available.'}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(details.genres || []).map((g) => (
                <Badge key={g} tone="brand">
                  {g}
                </Badge>
              ))}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {details.rating && (
                <div className="flex gap-2">
                  <dt className="text-slate-500 shrink-0">Rating</dt>
                  <dd className="text-white font-semibold flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" /> {details.rating}
                  </dd>
                </div>
              )}
              {details.director?.length > 0 && (
                <div className="flex gap-2">
                  <dt className="text-slate-500 shrink-0">Director</dt>
                  <dd className="text-white">{details.director.join(', ')}</dd>
                </div>
              )}
              {details.cast?.length > 0 && (
                <div className="flex gap-2 sm:col-span-2">
                  <dt className="text-slate-500 shrink-0">Cast</dt>
                  <dd className="text-white">{details.cast.join(', ')}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Side column */}
        <aside className="min-w-0">
          {type === 'series' ? (
            <div className="bg-ink-900/70 border border-ink-700/60 rounded-2xl overflow-hidden flex flex-col max-h-[75vh] lg:sticky lg:top-6">
              <div className="p-4 border-b border-ink-700/60 bg-ink-800/60">
                <label
                  htmlFor="season-select"
                  className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2"
                >
                  Season
                </label>
                <select
                  id="season-select"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(parseInt(e.target.value, 10))}
                  className="w-full bg-ink-900 border border-ink-700 text-white text-sm rounded-lg p-2.5 focus:outline-none focus:border-brand-500/60 cursor-pointer"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      Season {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                {seasonEpisodes.map((ep) => {
                  const active =
                    selectedEpisode?.id === ep.id || selectedEpisode?.episode === ep.episode;
                  return (
                    <button
                      key={ep.id || ep.episode}
                      onClick={() => selectEpisode(ep)}
                      aria-current={active}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left cursor-pointer border ${
                        active
                          ? 'bg-brand-500/15 border-brand-500/40'
                          : 'hover:bg-ink-800 border-transparent'
                      }`}
                    >
                      <div className="w-24 shrink-0 aspect-video bg-ink-950 rounded-lg overflow-hidden relative">
                        {ep.thumbnail ? (
                          <img
                            src={ep.thumbnail}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600 font-bold">
                            E{ep.episode}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-bold truncate ${active ? 'text-brand-300' : 'text-white'}`}
                        >
                          {ep.episode}. {ep.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {ep.released?.split('T')[0] || ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-ink-900/70 border border-ink-700/60 rounded-2xl p-6 text-center lg:sticky lg:top-6">
              <h3 className="text-base font-bold text-white mb-2">Tips</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The player frame blocks pop-ups at the browser level. If a server still shows
                overlay ads or buffers, switch to another one — VidLink ✦ is usually the cleanest.
              </p>
              <Link
                to="/english"
                className="inline-block mt-5 text-xs font-bold text-brand-300 hover:text-brand-200 transition-colors"
              >
                Browse more movies →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
