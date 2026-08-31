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
  HardDrive,
  Filter,
  Play,
  X,
  FlaskConical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getDetails } from '../api/englishApi';
import { resolveDirect, buildDownloadUrl } from '../api/directProxy';
import { resolveBackup } from '../api/backupApi';
import { useApp } from '../context/AppContext';
import { usePageMeta } from '../hooks';
import { cleanTitle } from '../lib/format';
import { installPopupGuard } from '../lib/popupGuard';
import { triggerDownload } from '../lib/download';
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

  // FreakyMustard Backup (freaky-backup sidecar): progressive MP4/MKV sources.
  // A third, IMDB-backed fallback that always sits BESIDE Direct + embeds —
  // it's never auto-selected (Direct/embeds are better default), but it's a
  // rescue source when the title is unavailable everywhere else.
  const [backupSources, setBackupSources] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState(null);

  // Backup working-filter state
  const [workingFilter, setWorkingFilter] = useState(false);
  const [workingMap, setWorkingMap] = useState({}); // key -> 'ok'|'fail'|'checking'
  const [checkingWorking, setCheckingWorking] = useState(false);
  const [backupCollapsed, setBackupCollapsed] = useState(false);

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

  // Resolve FreakyMustard Backup (progressive MP4/MKV) sources. Runs parallel
  // to Direct; never blocks, never auto-selected, degrades silently.
  useEffect(() => {
    if (!details) return undefined;
    const controller = new AbortController();
    const imdbId = details.id || id;
    if (!imdbId || !/^tt\d+/.test(imdbId)) return undefined;

    const isSeries = type === 'series';
    if (isSeries && !selectedEpisode) return undefined;

    /* eslint-disable react-hooks/set-state-in-effect */
    setBackupLoading(true);
    setBackupError(null);
    setBackupSources([]);
    /* eslint-enable react-hooks/set-state-in-effect */

    resolveBackup(
      {
        type: isSeries ? 'series' : 'movie',
        imdbId,
        season: isSeries ? selectedEpisode.season : undefined,
        episode: isSeries ? selectedEpisode.episode : undefined,
        instance: 'english',
      },
      controller.signal
    )
      .then((data) => {
        const sources = data?.sources || [];
        setBackupSources(sources);
        if (sources.length === 0) {
          setBackupError('No backup streams found for this title.');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setBackupError(err?.message || 'Backup resolution failed.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBackupLoading(false);
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
   * Server lists — split into Main (Direct + Embed) and Backup (Beta).
   *
   * Backup is kept strictly separate so it never pollutes the main
   * selection and can be collapsed / filtered independently.
   */
  const mainServers = useMemo(() => {
    if (!details) return [];
    const backendStreams =
      type === 'movies' ? details.streams || [] : selectedEpisode?.streams || [];

    const imdbId = details.id || id;
    const embeds =
      type === 'movies'
        ? [{ name: 'VidLink ✦', url: `https://vidlink.pro/movie/${imdbId}` }, ...backendStreams]
        : backendStreams;
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
      labelDetail: s.label || '',
      url: s.url,
      quality: '',
      format: 'hls',
    }));
    const embedServers = dedupedEmbeds.map((s, i) => ({
      key: `embed:${i}`,
      kind: 'embed',
      name: s.name || `Server ${i + 1}`,
      labelDetail: s.name || '',
      url: s.url,
      quality: '',
      format: '',
    }));
    return [...direct, ...embedServers];
  }, [details, type, selectedEpisode, id, directSources]);

  const backupServers = useMemo(() => {
    return backupSources.map((s, i) => {
      const cleanLabel = s.label || `Backup ${i + 1}`;
      return {
        key: `backup:${i}`,
        kind: 'backup',
        name: cleanLabel,
        labelDetail: cleanLabel,
        url: s.url,
        format: s.format,
        quality: s.quality,
        engine: s.engine,
      };
    });
  }, [backupSources]);

  // Combined list for activeServer lookup / download fallbacks
  const servers = useMemo(() => [...mainServers, ...backupServers], [mainServers, backupServers]);

  // Backup-only filtered view (Beta panel)
  const filteredBackupServers = useMemo(() => {
    if (!workingFilter) return backupServers;
    return backupServers.filter((s) => workingMap[s.key] === 'ok');
  }, [backupServers, workingFilter, workingMap]);

  const workingCounts = useMemo(() => {
    const ok = Object.values(workingMap).filter((v) => v === 'ok').length;
    const total = backupSources.length;
    return { ok, total, hasChecked: Object.keys(workingMap).length > 0 };
  }, [workingMap, backupSources.length]);

  const handleCheckWorking = async () => {
    if (checkingWorking || backupSources.length === 0) return;
    setCheckingWorking(true);
    const nextMap = {};
    let idx = 0;
    const isSameOrigin = (u) => {
      try {
        return new URL(u, window.location.href).origin === window.location.origin;
      } catch {
        return false;
      }
    };
    const checkOne = async (url) => {
      const sameOrigin = isSameOrigin(url);
      // HEAD first, fallback to Range GET for servers that block HEAD
      try {
        let r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
        if (r.ok) return 'ok';
        r = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(6000) });
        if (r.ok || r.status === 206) return 'ok';
        // external CORS-blocked links show as opaque failures – treat as unknown, not dead
        return sameOrigin ? 'fail' : 'ok';
      } catch (e) {
        // TypeError = CORS block on external host – don't hide it
        const isCors = e instanceof TypeError;
        if (isCors && !sameOrigin) return 'ok';
        try {
          const r = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(6000) });
          if (r.ok || r.status === 206) return 'ok';
          return sameOrigin ? 'fail' : 'ok';
        } catch (e2) {
          if (e2 instanceof TypeError && !sameOrigin) return 'ok';
          return 'fail';
        }
      }
    };
    const concurrency = 6;
    const workers = Array(concurrency)
      .fill(0)
      .map(async () => {
        while (idx < backupSources.length) {
          const i = idx++;
          const key = `backup:${i}`;
          const url = backupSources[i].url;
          nextMap[key] = 'checking';
          setWorkingMap({ ...nextMap });
          const res = await checkOne(url);
          nextMap[key] = res;
          setWorkingMap({ ...nextMap });
        }
      });
    await Promise.all(workers);
    setCheckingWorking(false);
    setWorkingFilter(true);
    const ok = Object.values(nextMap).filter((v) => v === 'ok').length;
    showToast(`${ok} of ${backupSources.length} backup links are working`, ok > 0 ? 'success' : 'error');
  };

  const handlePlayAnyWorking = async () => {
    // If we already have working map, pick first ok in quality order (servers is already quality-sorted)
    let candidate = servers.find((s) => s.kind === 'backup' && workingMap[s.key] === 'ok');
    if (candidate) {
      setServerKey(candidate.key);
      showToast(`Playing ${candidate.name.slice(0, 60)}`, 'success');
      return;
    }
    if (backupSources.length === 0) {
      showToast('No backup streams to check', 'error');
      return;
    }
    const isSameOrigin = (u) => {
      try {
        return new URL(u, window.location.href).origin === window.location.origin;
      } catch {
        return false;
      }
    };
    setCheckingWorking(true);
    for (let i = 0; i < backupSources.length; i++) {
      const key = `backup:${i}`;
      const url = backupSources[i].url;
      const s = servers.find((x) => x.key === key);
      if (!s) continue;
      setWorkingMap((prev) => ({ ...prev, [key]: 'checking' }));
      let ok = false;
      const sameOrigin = isSameOrigin(url);
      try {
        let r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
        ok = r.ok;
        if (!ok) {
          r = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(6000) });
          ok = r.ok || r.status === 206;
          if (!ok && !sameOrigin) ok = true; // CORS opaque
        }
      } catch (e) {
        if (e instanceof TypeError && !sameOrigin) ok = true;
        else {
          try {
            const r = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(6000) });
            ok = r.ok || r.status === 206;
            if (!ok && !sameOrigin) ok = true;
          } catch (e2) {
            ok = e2 instanceof TypeError && !sameOrigin ? true : false;
          }
        }
      }
      setWorkingMap((prev) => ({ ...prev, [key]: ok ? 'ok' : 'fail' }));
      if (ok) {
        setServerKey(key);
        setCheckingWorking(false);
        showToast(`Playing ${s.name.slice(0, 60)} (${s.quality || 'unknown'})`, 'success');
        return;
      }
    }
    setCheckingWorking(false);
    showToast('No working backup found — try Filter working first', 'error');
  };

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
  // server is playing. Backup sources are progressive files, so their proxied
  // URL doubles as the download link.
  const downloadUrl = useMemo(() => {
    if (!details) return null;
    const epSuffix =
      type === 'series' && selectedEpisode
        ? ` S${selectedEpisode.season}E${selectedEpisode.episode}`
        : '';
    if (activeServer?.kind === 'direct') {
      return buildDownloadUrl(activeServer.url, `${cleanTitle(details.title)}${epSuffix}`);
    }
    if (activeServer?.kind === 'backup') {
      return activeServer.url;
    }
    const direct = servers.find((s) => s.kind === 'direct');
    if (direct) {
      return buildDownloadUrl(direct.url, `${cleanTitle(details.title)}${epSuffix}`);
    }
    const backup = servers.find((s) => s.kind === 'backup');
    return backup ? backup.url : null;
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
    <div className="min-h-screen pb-16 bg-ink-950">
      {/* Projection rail — sticky title bar */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/75 border-b border-white/[0.06]">
        <div className="absolute inset-0 marquee-track opacity-[0.03] pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-[1600px] mx-auto px-4 md:px-10 py-4 md:py-5 flex items-center gap-3 md:gap-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] flex items-center justify-center transition-colors shrink-0 group cursor-pointer"
          >
            <ArrowLeft size={18} className="text-slate-300 group-hover:text-white transition-colors" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3 min-w-0">
              <h1 className="font-display text-[18px] md:text-[22px] font-bold tracking-[-0.02em] leading-none text-white truncate">
                {title}
              </h1>
              <span className="hidden lg:inline-flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.16em] text-slate-500 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> NOW PLAYING
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px] font-medium text-slate-400">
              {details.year && (
                <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.06] font-mono text-[10px] tracking-wide text-slate-300">
                  {details.year}
                </span>
              )}
              {details.runtime && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{details.runtime}</span>
                </>
              )}
              {details.rating && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="flex items-center gap-1 text-amber-300">
                    <Star size={11} className="fill-amber-400 text-amber-400" /> {details.rating}
                  </span>
                </>
              )}
              {type === 'series' && selectedEpisode && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="font-mono text-[11px] tracking-wide text-projector-300">
                    S{selectedSeason} · E{selectedEpisode.episode}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={toggleWatchlist}
              aria-label={isAdded ? 'Remove from watchlist' : 'Add to watchlist'}
              aria-pressed={isAdded}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                isAdded ? 'bg-brand-500 border-brand-400 text-white shadow-glow' : 'bg-white/[0.06] border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.10]'
              }`}
            >
              {isAdded ? <Check size={16} /> : <Plus size={16} />}
            </button>
            <button
              onClick={handleShare}
              className="h-9 px-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 size={14} /> Share
            </button>
            {downloadUrl && (
              <button
                onClick={() =>
                  triggerDownload(downloadUrl, {
                    onStarted: handleDownloadStart,
                    onError: () => showToast('Download failed — link expired. Reload and try again.', 'error'),
                  })
                }
                className="h-9 px-3.5 rounded-full bg-white text-ink-950 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} /> Download
              </button>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <button
              onClick={toggleWatchlist}
              aria-label={isAdded ? 'Remove from watchlist' : 'Add to watchlist'}
              className={`w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer ${isAdded ? 'bg-brand-500 border-brand-400 text-white' : 'bg-white/[0.06] border-white/[0.08] text-slate-300'}`}
            >
              {isAdded ? <Check size={16} /> : <Plus size={16} />}
            </button>
            <button onClick={handleShare} className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300 cursor-pointer">
              <Share2 size={14} />
            </button>
            {downloadUrl && (
              <button
                onClick={() => triggerDownload(downloadUrl, { onStarted: handleDownloadStart })}
                className="w-9 h-9 rounded-full bg-white text-ink-950 flex items-center justify-center cursor-pointer"
              >
                <Download size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-10 grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-6 xl:gap-7 max-w-[1600px] mx-auto pt-6">
        {/* LEFT — minimal */}
        <div className="order-2 lg:order-1 lg:sticky lg:top-[72px] self-start space-y-4">
          {/* Main servers */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-white">Servers</h3>
                <span className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] font-mono text-[11px] text-slate-400">
                    {mainServers.length}
                  </span>
                  {activeServer?.kind === 'embed' && (
                    <a
                      href={activeServer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">Direct is ad-free and saves progress.</p>
            </div>

            <div className="p-2 space-y-1">
              {mainServers.length === 0 ? (
                <div className="py-8 text-center">
                  <Server size={18} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No servers available.</p>
                  {directLoading && (
                    <p className="mt-1 text-[11px] text-slate-600 flex items-center justify-center gap-1">
                      <Loader2 size={11} className="animate-spin text-slate-400" /> Resolving…
                    </p>
                  )}
                </div>
              ) : (
                mainServers.map((s) => {
                  const active = activeServer?.key === s.key;
                  const isDirect = s.kind === 'direct';
                  return (
                    <button
                      key={s.key}
                      onClick={() => setServerKey(s.key)}
                      aria-pressed={active}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer ${
                        active
                          ? 'bg-white border-white text-ink-950'
                          : isDirect
                            ? 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.07] hover:border-white/10 text-slate-200'
                            : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.06] text-slate-300'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-ink-950 text-white' : isDirect ? 'bg-white/10 text-white' : 'bg-white/[0.06] text-slate-500'}`}>
                        {isDirect ? <Zap size={13} className={active ? 'fill-current' : ''} /> : <Server size={13} />}
                      </span>
                      <span className={`text-[13px] font-medium truncate flex-1 ${active ? 'text-ink-950 font-semibold' : 'text-slate-200'}`} title={s.name}>
                        {s.name}
                      </span>
                      {active && <Check size={14} className="shrink-0 text-ink-950" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Backup — minimal beta */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <button
              onClick={() => setBackupCollapsed((v) => !v)}
              className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
              aria-expanded={!backupCollapsed}
              aria-controls="backup-beta-list"
            >
              <span className="flex items-center gap-2 min-w-0">
                <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-white">Backup</h3>
                <span className="px-1.5 py-0.5 rounded-full border border-white/15 text-[10px] font-medium tracking-wide text-slate-400">BETA</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] font-mono text-[11px] text-slate-400">
                  {workingFilter ? `${filteredBackupServers.length}/${backupServers.length}` : backupServers.length}
                </span>
                {backupLoading && <Loader2 size={12} className="animate-spin text-slate-400" />}
              </span>
              <span className="text-slate-500 ml-2 shrink-0 w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                {backupCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </span>
            </button>

            {!backupCollapsed ? (
              <>
                <div className="p-3 border-t border-white/[0.04] space-y-3">
                  <p className="text-[12px] leading-relaxed text-slate-500">
                    Extra sources. Many may be offline — filter to see what’s reachable.
                  </p>
                  {backupSources.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleCheckWorking}
                        disabled={checkingWorking || backupLoading}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium border transition-colors cursor-pointer ${
                          workingFilter
                            ? 'bg-white text-ink-950 border-white'
                            : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.07] hover:text-white'
                        } ${checkingWorking ? 'opacity-60 cursor-wait' : ''}`}
                        title="Check each backup link"
                      >
                        {checkingWorking ? <Loader2 size={13} className="animate-spin" /> : <Filter size={13} />}
                        {workingFilter ? `Working (${workingCounts.ok})` : 'Filter working'}
                      </button>
                      <button
                        onClick={handlePlayAnyWorking}
                        disabled={checkingWorking || backupSources.length === 0}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium border transition-colors cursor-pointer ${
                          checkingWorking
                            ? 'opacity-60 cursor-wait bg-white/[0.04] border-white/[0.06] text-slate-500'
                            : 'bg-white text-ink-950 border-white hover:bg-slate-100'
                        }`}
                      >
                        {checkingWorking ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} className="fill-current" />}
                        Play any working
                      </button>
                    </div>
                  ) : backupLoading ? (
                    <p className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Loader2 size={12} className="animate-spin text-tungsten-400" /> Searching backup…
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">{backupError || 'No backup links for this title.'}</p>
                  )}
                  {workingFilter && workingCounts.hasChecked && (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">
                        {workingCounts.ok} / {workingCounts.total} working
                      </p>
                      <button
                        onClick={() => setWorkingFilter(false)}
                        className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <X size={11} /> Show all
                      </button>
                    </div>
                  )}
                  {!workingFilter && backupSources.length > 18 && !checkingWorking && (
                    <p className="text-[11px] text-slate-500">Many may be offline — filter first.</p>
                  )}
                </div>

                <div id="backup-beta-list" className="p-2 space-y-1 max-h-[42vh] overflow-y-auto scrollbar-thin">
                  {filteredBackupServers.length === 0 ? (
                    <div className="py-10 text-center">
                      <Server size={18} className="mx-auto text-slate-600 mb-2" />
                      <p className="text-xs text-slate-500">{workingFilter ? 'No working backup streams' : 'No backup streams'}</p>
                      {workingFilter ? (
                        <button
                          onClick={() => setWorkingFilter(false)}
                          className="mt-2 text-xs text-slate-300 hover:text-white cursor-pointer underline underline-offset-4"
                        >
                          Show all {backupServers.length}
                        </button>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-600">Try another title or use main servers.</p>
                      )}
                    </div>
                  ) : (
                    filteredBackupServers.map((s) => {
                      const active = activeServer?.key === s.key;
                      const status = workingMap[s.key];
                      const displayName = s.name.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
                      return (
                        <button
                          key={s.key}
                          onClick={() => setServerKey(s.key)}
                          aria-pressed={active}
                          title={s.name}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer ${
                            active
                              ? 'bg-white border-white text-ink-950'
                              : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.06] text-slate-300'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${active ? 'bg-ink-950 text-white' : 'bg-white/[0.06] text-slate-500'}`}>
                            <HardDrive size={13} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className={`text-[13px] font-medium leading-[1.35] break-all line-clamp-2 ${active ? 'text-ink-950 font-semibold' : 'text-slate-200'}`}>
                              {displayName}
                            </span>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {s.quality && (
                                <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border font-mono ${active ? 'bg-ink-950/10 border-ink-950/15 text-ink-950' : 'bg-white/[0.06] border-white/[0.06] text-slate-400'}`}>
                                  {s.quality}
                                </span>
                              )}
                              {s.format && <span className="shrink-0 text-[10px] font-mono uppercase text-slate-500">{s.format}</span>}
                              {status === 'checking' && <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400"><Loader2 size={10} className="animate-spin" /> checking</span>}
                              {status === 'ok' && <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400"><Check size={10} /> working</span>}
                              {status === 'fail' && <span className="flex items-center gap-1 text-[10px] font-mono text-red-400"><X size={10} /> dead</span>}
                            </div>
                          </div>
                          {active && <Check size={13} className="shrink-0 text-ink-950 mt-1" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="px-4 py-3">
                <p className="text-[11px] text-slate-500">
                  {backupSources.length ? `${backupSources.length} sources hidden — expand to browse` : backupLoading ? 'Loading…' : 'No backup sources for this title.'}
                </p>
              </div>
            )}
          </div>

          {/* Quick stats below servers */}
          <div className="space-y-2">
            {directLoading && (
              <p className="flex items-center gap-2 text-[11px] text-slate-500">
                <Loader2 size={12} className="animate-spin text-brand-400" />
                Resolving Direct…
              </p>
            )}
            {!directLoading && directError && mainServers.length > 0 && (
              <p className="text-[11px] text-slate-500">Direct unavailable ({directError})</p>
            )}
          </div>
        </div>

        {/* Player column — projector */}
        <div className="order-1 lg:order-2 space-y-5 min-w-0">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/[0.06] shadow-card">
            {/* Source rail — minimal */}
            {activeServer && (
              <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  <span className="text-white/90 font-semibold">{activeServer.kind === 'direct' ? 'Direct' : activeServer.kind === 'backup' ? 'Backup • Beta' : 'Embed'}</span>
                  <span className="text-white/50 hidden sm:inline">— {activeServer.name.slice(0, 32)}</span>
                </span>
                {activeServer.quality && <span className="hidden sm:inline font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/20">{activeServer.quality}</span>}
              </div>
            )}
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
            ) : activeServer?.kind === 'backup' ? (
              <VideoPlayer
                key={activeServer.url}
                src={activeServer.url}
                poster={details.backdrop || details.poster}
                title={`${title} — Backup`}
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
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <AlertTriangle size={28} />
                <p className="text-sm font-semibold">No streams available for this title.</p>
              </div>
            )}
          </div>

          {activeServer?.kind === 'embed' && (
            <div className="flex justify-end">
              <a
                href={activeServer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Open in new tab <ExternalLink size={11} />
              </a>
            </div>
          )}

          {/* About — editorial */}
          <div className="relative bg-ink-900/60 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" aria-hidden="true" />
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="font-mono text-[11px] font-bold tracking-[0.14em] text-slate-400">ABOUT</h2>
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[10px] text-slate-500 hidden sm:inline">{details.year} • {details.genres?.[0] || 'Cinema'}</span>
              </div>
              <p className="font-display text-[14px] md:text-[15px] leading-relaxed text-slate-200">
                {details.description || 'No description available.'}
              </p>
              {(details.genres || []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(details.genres || []).map((g) => (
                    <span key={g} className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-[11px] font-medium tracking-wide text-slate-300 capitalize">
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-white/[0.06]">
                {details.rating && (
                  <div>
                    <dt className="font-mono text-[10px] tracking-[0.12em] text-slate-500">RATING</dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-white font-semibold">
                      <span className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                        <Star size={12} className="fill-black text-black" />
                      </span>
                      {details.rating} <span className="text-slate-500 font-normal">/ 10</span>
                    </dd>
                  </div>
                )}
                {details.director?.length > 0 && (
                  <div>
                    <dt className="font-mono text-[10px] tracking-[0.12em] text-slate-500">DIRECTOR</dt>
                    <dd className="mt-1 text-sm text-white">{details.director.join(', ')}</dd>
                  </div>
                )}
                {details.cast?.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="font-mono text-[10px] tracking-[0.12em] text-slate-500">CAST</dt>
                    <dd className="mt-1 text-sm text-slate-300 leading-relaxed">{details.cast.join('  ·  ')}</dd>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side rail */}
        <aside className="min-w-0 order-3 lg:order-3">
          {type === 'series' ? (
            <div className="bg-ink-900/60 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col max-h-[75vh] lg:sticky lg:top-[72px]">
              <div className="p-4 border-b border-white/[0.06] bg-white/[0.02]">
                <label htmlFor="season-select" className="font-mono text-[11px] font-bold tracking-[0.12em] text-slate-400 block mb-2">
                  SEASON
                </label>
                <select
                  id="season-select"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(parseInt(e.target.value, 10))}
                  className="w-full bg-ink-950 border border-white/[0.08] text-white text-sm rounded-xl p-2.5 focus:outline-none focus:border-brand-500/40 cursor-pointer"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      Season {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
                {seasonEpisodes.map((ep) => {
                  const active = selectedEpisode?.id === ep.id || selectedEpisode?.episode === ep.episode;
                  return (
                    <button
                      key={ep.id || ep.episode}
                      onClick={() => selectEpisode(ep)}
                      aria-current={active}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left cursor-pointer border ${
                        active ? 'bg-brand-500 text-white border-brand-400 shadow-glow' : 'bg-ink-800/50 border-white/[0.04] hover:bg-ink-800 hover:border-white/[0.08] text-white'
                      }`}
                    >
                      <div className="w-24 shrink-0 aspect-video bg-ink-950 rounded-lg overflow-hidden relative border border-white/[0.06]">
                        {ep.thumbnail ? (
                          <img src={ep.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-slate-600 font-bold">E{ep.episode}</div>
                        )}
                        {active && <span className="absolute inset-0 ring-2 ring-brand-400 rounded-lg pointer-events-none" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${active ? 'text-white' : 'text-white'}`}>{ep.episode}. {ep.title}</p>
                        <p className={`text-[11px] font-mono truncate ${active ? 'text-white/80' : 'text-slate-500'}`}>{ep.released?.split('T')[0] || ''}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-ink-900/60 backdrop-blur border border-white/[0.06] rounded-2xl p-6 lg:sticky lg:top-[72px] overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-500/10 rounded-full blur-[50px] pointer-events-none" aria-hidden="true" />
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-white text-ink-950 flex items-center justify-center mb-3">
                  <Zap size={14} className="fill-current" />
                </div>
                <h3 className="font-display text-[15px] font-bold tracking-[-0.01em] text-white">Projector, not pop-ups.</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
                  <span className="text-white font-semibold">FreakyMustard Direct</span> is our own beam — no overlays, remembers your position, and never opens a new tab. If it’s dark for a title, drop to an <span className="text-slate-300">Embed</span> — pop-ups are still sandboxed.
                </p>
                <Link to="/english" className="inline-flex items-center gap-1.5 mt-5 text-xs font-bold tracking-wide text-brand-300 hover:text-brand-200 transition-colors">
                  Browse more movies <span aria-hidden="true">→</span>
                </Link>
                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> All embeds sandboxed
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
