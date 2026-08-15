import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Share2, Film, BadgeCheck } from 'lucide-react';
import { getAutoStream } from '../api/tamilApi';
import { useApp } from '../context/AppContext';
import { usePageMeta } from '../hooks';
import { cleanTitle } from '../lib/format';
import VideoPlayer from '../components/VideoPlayer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { ErrorState } from '../components/ui/States';

/**
 * Tamil watch page.
 * Resolves the best-quality direct stream from the backend, plays it in
 * the custom player, and saves REAL progress (seconds watched / duration)
 * so Continue Watching can resume from the right position.
 */
export default function WatchTamil() {
  const { encodedUrl } = useParams();
  const [searchParams] = useSearchParams();
  const rawTitle = searchParams.get('title') || 'Tamil Movie';
  const navigate = useNavigate();
  const { saveProgress, showToast, continueWatching } = useApp();

  const [streamUrl, setStreamUrl] = useState(null);
  const [quality, setQuality] = useState('');
  const [poster, setPoster] = useState(null);
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const itemId = encodeURIComponent(decodeURIComponent(encodedUrl));
  const watchLink = `/watch/tamil/${itemId}?title=${encodeURIComponent(rawTitle)}`;
  const title = cleanTitle(rawTitle);

  usePageMeta(`${title} — Streamda`);

  // Resume position from Continue Watching (seconds, if we stored them).
  const [resumeAt, setResumeAt] = useState(0);
  useEffect(() => {
    const existing = continueWatching.find((x) => x.id === itemId);
    if (existing?.positionSec && existing?.durationSec) {
      // One-time resume restore on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResumeAt(existing.positionSec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const link = decodeURIComponent(encodedUrl);

    const resolve = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getAutoStream(link, controller.signal);
        if (!result?.stream_url) throw new Error('No stream could be resolved for this movie.');
        setStreamUrl(result.stream_url);
        setQuality(result.quality || '');
        setPoster(result.poster || null);
        setDesc(result.desc || '');

        // Mark as started (progress filled in as the user actually watches).
        saveProgress({
          id: itemId,
          title: rawTitle,
          type: 'tamil',
          poster: result.poster,
          progress: null,
          watchLink,
        });
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    resolve();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedUrl]);

  // Real progress: throttled by the player (~5s), saved with position.
  const handleProgress = useCallback(
    (seconds, duration) => {
      if (!duration || duration <= 0) return;
      const pct = Math.round((seconds / duration) * 100);
      saveProgress({
        id: itemId,
        title: rawTitle,
        type: 'tamil',
        poster,
        progress: pct,
        positionSec: Math.floor(seconds),
        durationSec: Math.floor(duration),
        watchLink,
      });
    },
    [itemId, rawTitle, poster, watchLink, saveProgress]
  );

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Watch link copied to clipboard', 'success');
    } catch {
      showToast('Could not copy the link', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-10 pt-6 md:pt-8 pb-4 flex items-center justify-between gap-4">
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
              {quality && (
                <Badge tone="success">
                  <BadgeCheck size={11} /> {quality}
                </Badge>
              )}
              <Badge tone="neutral">Direct stream</Badge>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleShare}>
          <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
        </Button>
      </div>

      {/* Player */}
      <div className="px-4 md:px-10 max-w-[1400px] w-full mx-auto">
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-ink-700 shadow-card">
          {loading ? (
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
                <p className="text-white font-bold mb-1">Resolving best quality stream…</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  The backend scans mirrors for the highest-quality file. Cold starts can take up to
                  a minute.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 overflow-y-auto flex items-center justify-center">
              <ErrorState compact message={error} onRetry={() => window.location.reload()} />
            </div>
          ) : streamUrl ? (
            <VideoPlayer
              src={streamUrl}
              poster={poster}
              title={title}
              initialTime={resumeAt}
              onProgress={handleProgress}
            />
          ) : null}
        </div>

        {/* Description */}
        {desc && (
          <div className="mt-6 bg-ink-900/70 border border-ink-700/60 rounded-2xl p-5 md:p-6 mb-10">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
              Synopsis
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
          </div>
        )}

        {/* Player tips */}
        {!loading && !error && (
          <div className="mt-4 mb-10 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
            <span>
              <kbd className="px-1.5 py-0.5 bg-ink-800 rounded border border-ink-700 font-mono">
                Space
              </kbd>{' '}
              play/pause
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-ink-800 rounded border border-ink-700 font-mono">
                ←
              </kbd>
              /
              <kbd className="px-1.5 py-0.5 bg-ink-800 rounded border border-ink-700 font-mono">
                →
              </kbd>{' '}
              seek 10s
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-ink-800 rounded border border-ink-700 font-mono">
                F
              </kbd>{' '}
              fullscreen
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-ink-800 rounded border border-ink-700 font-mono">
                M
              </kbd>{' '}
              mute
            </span>
            <span>Double-tap sides to seek</span>
          </div>
        )}
      </div>
    </div>
  );
}
