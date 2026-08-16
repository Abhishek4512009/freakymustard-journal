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
  Zap,
  Loader2,
  Download,
} from 'lucide-react';
import { getDetails } from '../api/englishApi';
import { resolveDirect, buildDownloadUrl } from '../api/directProxy';
import { useApp } from '../context/AppContext';
import { usePageMeta } from '../hooks';
import { cleanTitle } from '../lib/format';
import { installPopupGuard } from '../lib/popupGuard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import VideoPlayer from '../components/VideoPlayer';
import { PageLoader } from '../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../components/ui/States';

/**
 * English watch page (movie or series).
 *
 * Playback sources, in priority order:
 *  1. FreakyMustard ✦ Direct — our own ad-free HLS proxy (hls.js player, real
 *     progress tracking + resume). Resolved asynchronously; if it's slow or
 *     fails, embed servers keep working exactly as before.
 *  2. Third-party embed servers (VidLink, backend providers) — unchanged.
 *
 * Progress is recorded honestly (opened = started for embeds; real measured
 * position for Direct).
 */
export default function WatchEnglish() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const {
    saveProgress,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    showToast,
    continueWatching,
  } = useApp();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Key of the selected server in the unified list (e.g. "direct:0", "embed:1").
  // Key-based (not index-based) so the selection survives the Direct sources
  // loading in asynchronously at the front of the list.
  const [serverKey, setServerKey] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  // FreakyMustard Direct (our own HLS proxy) resolution state.
  const [directSources, setDirectSources] = useState([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [directError, setDirectError] = useState(null);
  // True only when Direct resolved quickly enough to be a sensible default.
  // A slow (cold-start) resolve won't yank the user off an embed that's
  // already playing — they can still pick Direct manually.
  const [directIsDefault, setDirectIsDefault] = useState(false);

  usePageMeta(
    details ? `${cleanTitle(details.title)} — FreakyMustard` : 'Watching — FreakyMustard'
  );

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

  // Resolve FreakyMustard Direct HLS sources whenever the title/episode changes.
  // Runs independently of the embed server list; failures degrade gracefully
  // to the normal providers (directError is surfaced in the Direct panel).
  useEffect(() => {
    if (!details) return undefined;
    const controller = new AbortController();
    const imdbId = details.id || id;
    if (!imdbId) return undefined;

    const isSeries = type === 'series';
    if (isSeries && !selectedEpisode) return undefined;

    // Reset the previous title/episode's result before fetching the new one.
    // This synchronous reset is the standard data-fetching pattern; the rule
    // only objects to render-coupled state, which this is not.
    /* eslint-disable react-hooks/set-state-in-effect */
    setDirectLoading(true);
    setDirectError(null);
    setDirectSources([]);
    setDirectIsDefault(false);
    /* eslint-enable react-hooks/set-state-in-effect */

    const startedAt = Date.now();
    resolveDirect(
      {
        type,
        imdbId,
        season: isSeries ? selectedEpisode.season : undefined,
        episode: isSeries ? selectedEpisode.episode : undefined,
      },
      controller.signal
    )
      .then((data) => {
        const sources = data?.sources || [];
        setDirectSources(sources);
        // Only auto-default to Direct if it resolved fast enough that the
        // user hasn't already settled into an embed (cold starts can take
        // 30-50s; we don't want to yank a playing video).
        if (sources.length > 0 && Date.now() - startedAt < 4000) {
          setDirectIsDefault(true);
        }
        if (sources.length === 0) setDirectError('No direct streams found for this title.');
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setDirectError(err?.message || 'Direct resolution failed.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDirectLoading(false);
      });

    return () => controller.abort();
  }, [details, type, id, selectedEpisode]);

  // Resume position (seconds) for the direct player, from continue-watching.
  const resumePosition = useMemo(() => {
    const key = details?.id || id;
    const entry = continueWatching.find((x) => x.id === key);
    if (!entry?.positionSec) return 0;
    // For series, only resume if it's the same episode.
    if (type === 'series') {
      const sameEp =
        entry.season === selectedEpisode?.season && entry.episode === selectedEpisode?.episode;
      return sameEp ? entry.positionSec : 0;
    }
    return entry.positionSec;
  }, [details, id, continueWatching, type, selectedEpisode]);

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

  /**
   * Unified server list: FreakyMustard Direct (our ad-free HLS proxy) first,
   * then every existing embed provider — nothing is removed.
   *
   * Each entry carries a stable `key` ("direct:0", "embed:1", …) so the
   * user's selection survives Direct sources loading in asynchronously.
   */
  const servers = useMemo(() => {
    if (!details) return [];
    const backendStreams =
      type === 'movies' ? details.streams || [] : selectedEpisode?.streams || [];

    // Front-load a verified ad-light provider (clean Next.js player, no
    // pop-under networks detected) for movies.
    // Movies only: vidlink's TV routes need TMDB ids, and our backend
    // speaks IMDB — series fall back to the backend's server list.
    const imdbId = details.id || id;
    const embeds =
      type === 'movies'
        ? [{ name: 'VidLink ✦', url: `https://vidlink.pro/movie/${imdbId}` }, ...backendStreams]
        : backendStreams;
    // De-dupe by URL in case the backend adds the same provider later.
    const seen = new Set();
    const dedupedEmbeds = embeds.filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

    const direct = directSources.map((s, i) => ({
      key: `direct:${i}`,
      kind: 'direct',
      name: directSources.length > 1 ? `FreakyMustard ✦ ${i + 1}` : 'FreakyMustard ✦ Direct',
      url: s.url,
    }));
    const embedServers = dedupedEmbeds.map((s, i) => ({
      key: `embed:${i}`,
      kind: 'embed',
      name: s.name || `Server ${i + 1}`,
      url: s.url,
    }));
    return [...direct, ...embedServers];
  }, [details, type, selectedEpisode, id, directSources]);

  // Default server: the user's explicit pick wins. Otherwise, if Direct
  // resolved quickly (directIsDefault) use the first Direct source; else fall
  // back to the first embed so playback starts instantly while Direct loads.
  const activeServer =
    servers.find((s) => s.key === serverKey) ||
    (directIsDefault ? servers.find((s) => s.kind === 'direct') : null) ||
    servers[0] ||
    null;

  // Download via the FreakyMustard proxy. Only Direct sources are
  // downloadable (embed iframes can't be). Uses the active Direct source,
  // falling back to the first one — so the button works even while an embed
  // server is playing.
  const downloadUrl = useMemo(() => {
    const direct =
      activeServer?.kind === 'direct' ? activeServer : servers.find((s) => s.kind === 'direct');
    if (!direct || !details) return null;
    const epSuffix =
      type === 'series' && selectedEpisode
        ? ` S${selectedEpisode.season}E${selectedEpisode.episode}`
        : '';
    return buildDownloadUrl(direct.url, `${cleanTitle(details.title)}${epSuffix}`);
  }, [activeServer, servers, type, selectedEpisode, details]);

  const selectEpisode = (ep) => {
    setSelectedEpisode(ep);
    setServerKey(null);
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

  const handleDownloadStart = () => {
    showToast('Download started — the FreakyMustard server is assembling the video.', 'success');
  };

  // Real progress reporting for the direct player (unlike embeds, we can
  // measure actual playback position here).
  const handleDirectProgress = (seconds, duration) => {
    if (!details) return;
    const isSeries = type === 'series';
    saveProgress({
      id: details.id || id,
      title: details.title,
      type: isSeries ? 'series' : 'movies',
      poster: details.poster || details.backdrop,
      progress: duration > 0 ? Math.min(100, Math.round((seconds / duration) * 100)) : null,
      positionSec: Math.floor(seconds),
      durationSec: duration > 0 ? Math.floor(duration) : undefined,
      season: isSeries ? selectedEpisode?.season : undefined,
      episode: isSeries ? selectedEpisode?.episode : undefined,
      watchLink: `/watch/english/${type}/${details.id || id}`,
    });
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
          {downloadUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // The proxy answers with an attachment, so this never leaves
                // a visible tab behind — the browser just saves the file.
                window.open(downloadUrl, '_blank', 'noopener');
                handleDownloadStart();
              }}
            >
              <Download size={14} /> <span className="hidden sm:inline">Download</span>
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 xl:gap-8 max-w-[1600px] mx-auto">
        {/* Player column */}
        <div className="space-y-5 min-w-0">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-ink-700 shadow-card">
            {activeServer?.kind === 'direct' ? (
              <VideoPlayer
                key={activeServer.url}
                hls
                src={activeServer.url}
                poster={details.backdrop || details.poster}
                title={`${title} — FreakyMustard Direct`}
                initialTime={resumePosition}
                onProgress={handleDirectProgress}
                downloadUrl={downloadUrl}
                onDownload={handleDownloadStart}
              />
            ) : activeServer ? (
              <iframe
                key={activeServer.url}
                src={activeServer.url}
                className="w-full h-full"
                title={`${title} player`}
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                referrerPolicy="no-referrer"
                // NO sandbox attribute: every major provider (VidLink, VidSrc,
                // VidAPI, AutoEmbed) fingerprints sandboxed frames and refuses
                // to play inside them. Pop-up defence is handled by
                // src/lib/popupGuard.js on the parent page instead.
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <AlertTriangle size={28} />
                <p className="text-sm font-semibold">No streams available for this title.</p>
              </div>
            )}
          </div>

          {/* Server picker */}
          {servers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                <Server size={13} /> Servers
              </span>
              {servers.map((s) => {
                const active = activeServer?.key === s.key;
                const isDirect = s.kind === 'direct';
                return (
                  <button
                    key={s.key}
                    onClick={() => setServerKey(s.key)}
                    aria-pressed={active}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-200 cursor-pointer ${
                      active
                        ? isDirect
                          ? 'bg-gradient-to-r from-brand-500 to-accent-500 border-brand-400 text-white shadow-glow'
                          : 'bg-brand-500 border-brand-400 text-white shadow-glow'
                        : isDirect
                          ? 'bg-ink-800 border-brand-500/40 text-brand-300 hover:border-brand-400 hover:text-brand-200'
                          : 'bg-ink-800 border-ink-700 text-slate-300 hover:border-brand-500/40 hover:text-white'
                    }`}
                  >
                    {isDirect && <Zap size={12} className={active ? 'fill-current' : ''} />}
                    {s.name}
                  </button>
                );
              })}
              {activeServer?.kind === 'embed' && (
                <a
                  href={activeServer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Open in new tab <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}

          {/* Direct resolution status (only when it's informative) */}
          {directLoading && (
            <p className="flex items-center gap-2 text-[11px] text-slate-500">
              <Loader2 size={12} className="animate-spin text-brand-400" />
              Resolving ad-free FreakyMustard Direct stream…
            </p>
          )}
          {!directLoading && directError && servers.some((s) => s.kind === 'embed') && (
            <p className="text-[11px] text-slate-500">
              FreakyMustard Direct unavailable ({directError}) — using an embed server instead.
            </p>
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
                <span className="text-brand-300 font-bold">FreakyMustard ✦ Direct</span> is our own
                ad-free player — no pop-ups, no overlays, and it remembers your position. If it's
                unavailable for a title, pick an embed server instead; pop-ups from those are
                blocked automatically.
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
