import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Share2, Film, Download, Loader2, ListVideo } from 'lucide-react';
import { getSeasons, getEpisodes, getEpisodeStream } from '../api/tamilApi';
import { useApp } from '../context/AppContext';
import { usePageMeta } from '../hooks';
import { cleanTitle } from '../lib/format';
import { triggerDownload } from '../lib/download';
import VideoPlayer from '../components/VideoPlayer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { ErrorState } from '../components/ui/States';

/**
 * Tamil web series watch page.
 *
 * Series -> seasons -> episodes (backend scrapes the site's structure);
 * each episode resolves to a direct stream played in the custom player,
 * with the same download relay and real progress tracking as movies.
 */
export default function WatchTamilSeries() {
  const { encodedUrl } = useParams();
  const [searchParams] = useSearchParams();
  const rawTitle = searchParams.get('title') || 'Tamil Series';
  const navigate = useNavigate();
  const { saveProgress, showToast, continueWatching } = useApp();

  const seriesUrl = decodeURIComponent(encodedUrl);
  const itemId = encodeURIComponent(seriesUrl);
  const watchLink = `/watch/tamil-series/${itemId}?title=${encodeURIComponent(rawTitle)}`;
  const title = cleanTitle(rawTitle);

  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null); // {name, link, number}
  const [episodes, setEpisodes] = useState([]);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [poster, setPoster] = useState(null);
  const [desc, setDesc] = useState('');
  const [error, setError] = useState(null);

  usePageMeta(`${title} — FreakyMustard`);

  const seasonNumber = (name = '') => {
    const m = /season\s*0?(\d+)/i.exec(name);
    return m ? parseInt(m[1], 10) : null;
  };

  // Load seasons + metadata for the series.
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setError(null);
      try {
        const data = await getSeasons(seriesUrl, controller.signal);
        setPoster(data?.meta?.poster || null);
        setDesc(data?.meta?.desc || '');
        const list = data?.seasons || [];
        setSeasons(list);
        if (list.length > 0) setSelectedSeason({ ...list[0], number: seasonNumber(list[0].name) });
        else if ((data?.episodes || []).length > 0) {
          // Single-season series: episodes listed on the series page itself.
          setSeasons([{ name: 'Season 1', link: seriesUrl, number: 1, direct: true }]);
          setSelectedSeason({ name: 'Season 1', link: seriesUrl, number: 1, direct: true });
        } else setError('No seasons or episodes found for this series.');
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      }
    };
    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedUrl]);

  // Load episodes whenever the selected season changes.
  useEffect(() => {
    if (!selectedSeason) return undefined;
    const controller = new AbortController();
    const load = async () => {
      setLoadingSeason(true);
      setEpisodes([]);
      setSelectedEpisode(null);
      setStreamUrl(null);
      setDownloadUrl(null);
      try {
        const list = await getEpisodes(selectedSeason.link, controller.signal);
        if (!controller.signal.aborted) setEpisodes(list);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoadingSeason(false);
      }
    };
    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason?.link]);

  // Resolve an episode to a playable stream.
  const selectEpisode = async (ep) => {
    setSelectedEpisode(ep);
    setStreamUrl(null);
    setDownloadUrl(null);
    setResolving(true);
    setError(null);
    try {
      const result = await getEpisodeStream(ep.link);
      if (!result?.stream_url) throw new Error('Could not resolve this episode.');
      setStreamUrl(result.stream_url);
      setDownloadUrl(result.download_url || null);

      saveProgress({
        id: itemId,
        title: rawTitle,
        type: 'tamil',
        poster,
        progress: null,
        season: selectedSeason?.number ?? undefined,
        episode: ep.episode ?? undefined,
        watchLink,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  };

  // Real per-episode progress.
  const handleProgress = useCallback(
    (seconds, duration) => {
      if (!duration || !selectedEpisode) return;
      saveProgress({
        id: itemId,
        title: rawTitle,
        type: 'tamil',
        poster,
        progress: Math.round((seconds / duration) * 100),
        positionSec: Math.floor(seconds),
        durationSec: Math.floor(duration),
        season: selectedSeason?.number ?? undefined,
        episode: selectedEpisode.episode ?? undefined,
        watchLink,
      });
    },
    [itemId, rawTitle, poster, selectedEpisode, selectedSeason, watchLink, saveProgress]
  );

  // Resume position for the selected episode.
  const resumeAt = (() => {
    const entry = continueWatching.find(
      (x) =>
        x.id === itemId &&
        (selectedEpisode?.episode == null ||
          (x.season === (selectedSeason?.number ?? undefined) &&
            x.episode === selectedEpisode.episode))
    );
    return entry?.positionSec || 0;
  })();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Watch link copied to clipboard', 'success');
    } catch {
      showToast('Could not copy the link', 'error');
    }
  };

  const handleDownloadStart = () => {
    showToast('Download started — the FreakyMustard server is fetching the episode.', 'success');
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="px-4 md:px-10 pt-6 md:pt-8 pb-4 flex items-start justify-between gap-4">
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
            <div className="flex items-center gap-2 mt-0.5">
              {selectedSeason?.number != null && (
                <Badge tone="brand">Season {selectedSeason.number}</Badge>
              )}
              <Badge tone="neutral">Web Series</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={handleShare}>
            <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
          </Button>
          {downloadUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                triggerDownload(downloadUrl, {
                  onStarted: handleDownloadStart,
                  onError: () =>
                    showToast(
                      'Download failed — the episode link may have expired. Pick the episode again.',
                      'error'
                    ),
                })
              }
            >
              <Download size={14} /> <span className="hidden sm:inline">Download</span>
            </Button>
          )}
        </div>
      </div>

      {/* Season picker */}
      {seasons.length > 1 && (
        <div className="px-4 md:px-10 pb-4 flex gap-2 overflow-x-auto hide-scrollbar">
          {seasons.map((s) => {
            const active = selectedSeason?.link === s.link;
            return (
              <button
                key={s.link}
                onClick={() => setSelectedSeason({ ...s, number: seasonNumber(s.name) })}
                aria-pressed={active}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                  active
                    ? 'bg-brand-500 border-brand-400 text-white shadow-glow'
                    : 'bg-ink-800/80 border-ink-700 text-slate-300 hover:border-brand-500/40 hover:text-white'
                }`}
              >
                {s.name.replace(title, '').trim() || s.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="px-4 md:px-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 xl:gap-8 max-w-[1600px] mx-auto">
        {/* Player column */}
        <div className="min-w-0 space-y-5">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-ink-700 shadow-card">
            {resolving ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-brand-500/15 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-brand-500 rounded-full animate-spin" />
                  <Film
                    className="absolute inset-0 m-auto text-brand-400 animate-pulse-soft"
                    size={22}
                  />
                </div>
                <div>
                  <p className="text-white font-bold mb-1">
                    Resolving episode {selectedEpisode?.episode ?? ''}…
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    The backend walks the download mirrors for a direct stream. This can take up to
                    a minute.
                  </p>
                </div>
              </div>
            ) : error && !streamUrl ? (
              <div className="absolute inset-0 overflow-y-auto flex items-center justify-center">
                <ErrorState
                  compact
                  message={error}
                  onRetry={() => selectEpisode(selectedEpisode)}
                />
              </div>
            ) : streamUrl ? (
              <VideoPlayer
                key={streamUrl}
                src={streamUrl}
                poster={poster}
                title={`${title} E${selectedEpisode?.episode ?? ''}`}
                initialTime={resumeAt}
                onProgress={handleProgress}
                downloadUrl={downloadUrl}
                onDownload={handleDownloadStart}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <ListVideo size={28} />
                <p className="text-sm font-semibold">Pick an episode to start watching.</p>
              </div>
            )}
          </div>

          {/* Synopsis */}
          {desc && (
            <div className="bg-ink-900/70 border border-ink-700/60 rounded-2xl p-5 md:p-6">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                Synopsis
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
            </div>
          )}
        </div>

        {/* Episodes sidebar */}
        <aside className="min-w-0">
          <div className="bg-ink-900/70 border border-ink-700/60 rounded-2xl overflow-hidden flex flex-col max-h-[75vh] lg:sticky lg:top-6">
            <div className="p-4 border-b border-ink-700/60 bg-ink-800/60 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Episodes
              </span>
              {loadingSeason && <Loader2 size={14} className="animate-spin text-brand-400" />}
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {loadingSeason && episodes.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-ink-800/60 animate-pulse" />
                  ))
                : episodes.map((ep) => {
                    const active =
                      selectedEpisode?.link === ep.link ||
                      (!selectedEpisode && false) ||
                      selectedEpisode?.episode === ep.episode;
                    return (
                      <button
                        key={ep.link}
                        onClick={() => selectEpisode(ep)}
                        aria-current={active}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left cursor-pointer border ${
                          active
                            ? 'bg-brand-500/15 border-brand-500/40'
                            : 'hover:bg-ink-800 border-transparent'
                        }`}
                      >
                        <span
                          className={`w-10 shrink-0 text-center text-sm font-black font-mono ${
                            active ? 'text-brand-300' : 'text-slate-500'
                          }`}
                        >
                          {ep.episode ?? '•'}
                        </span>
                        <span
                          className={`flex-1 min-w-0 text-sm font-bold truncate ${
                            active ? 'text-brand-300' : 'text-white'
                          }`}
                        >
                          {ep.title}
                        </span>
                      </button>
                    );
                  })}
              {!loadingSeason && episodes.length === 0 && !error && (
                <p className="text-xs text-slate-500 p-4 text-center">
                  No episodes found for this season.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
