import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getDetails } from '../api/englishApi';
import { resolveDirect, buildDownloadUrl } from '../api/directProxy';
import { resolveBackup } from '../api/backupApi';
import { getAutoStream, getSeasons, getEpisodes, getEpisodeStream } from '../api/tamilApi';
import { useApp } from '../context/AppContext';
import { usePageMeta } from '../hooks';
import { cleanTitle } from '../lib/format';
import { installPopupGuard } from '../lib/popupGuard';
import { triggerDownload } from '../lib/download';
import VideoPlayer from '../components/VideoPlayer';
import { Empty, Failure, Loading } from '../components/Notices';

const seasonNumber = (name = '') => {
  const m = /season\s*0?(\d+)/i.exec(name);
  return m ? parseInt(m[1], 10) : null;
};

/**
 * The screening room: one page for every kind of print.
 *  /watch/movie/:imdb        English film (Direct + embeds + further prints)
 *  /watch/series/:imdb       English series (per-episode sources + episode index)
 *  /watch/tamil/:encodedUrl  Tamil film (single archive print)
 *  /watch/tamil-series/:encodedUrl  Tamil series (season/episode index)
 */
export default function UnifiedWatch() {
  const { kind, id } = useParams();
  const [searchParams] = useSearchParams();
  const {
    saveProgress,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    showToast,
    continueWatching,
  } = useApp();

  const isEnglish = kind === 'movie' || kind === 'series';
  const isSeries = kind === 'series';
  const isTamilFilm = kind === 'tamil';
  const isTamilSeries = kind === 'tamil-series';
  const knownKind = isEnglish || isTamilFilm || isTamilSeries;

  useEffect(() => installPopupGuard(), []);

  /* ================= English (movie + series) ================= */

  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(isEnglish);
  const [detailsError, setDetailsError] = useState(null);

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  const [directSources, setDirectSources] = useState([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [directDefault, setDirectDefault] = useState(false);

  const [backupSources, setBackupSources] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);

  const [serverKey, setServerKey] = useState(null);

  useEffect(() => {
    if (!isEnglish) return undefined;
    const controller = new AbortController();
    const type = isSeries ? 'series' : 'movies';
    /* eslint-disable react-hooks/set-state-in-effect -- fetch-cycle reset */
    setLoadingDetails(true);
    setDetailsError(null);
    setDetails(null);
    setServerKey(null);
    setDirectSources([]);
    setBackupSources([]);
    /* eslint-enable react-hooks/set-state-in-effect */

    getDetails(type, id, controller.signal)
      .then((data) => {
        if (!data) throw new Error('Empty response from the press.');
        setDetails(data);
        if (isSeries && data.episodes?.length > 0) {
          setSelectedSeason(data.episodes[0].season);
          setSelectedEpisode(data.episodes[0]);
        }
        saveProgress({
          id: data.id || id,
          title: data.title,
          type: isSeries ? 'series' : 'movies',
          poster: data.poster || data.backdrop,
          progress: null,
          watchLink: `/watch/${kind}/${data.id || id}`,
        });
      })
      .catch((err) => {
        if (!controller.signal.aborted) setDetailsError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDetails(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id]);

  // Resolve Direct + Backup whenever the English title/episode changes.
  useEffect(() => {
    if (!isEnglish || !details) return undefined;
    const controller = new AbortController();
    const imdbId = details.id || id;
    if (!imdbId || !/^tt\d+/.test(imdbId)) return undefined;
    if (isSeries && !selectedEpisode) return undefined;

    /* eslint-disable react-hooks/set-state-in-effect -- fetch-cycle reset */
    setDirectSources([]);
    setDirectLoading(true);
    setDirectDefault(false);
    setBackupSources([]);
    setBackupLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    const startedAt = Date.now();
    const season = isSeries ? selectedEpisode.season : undefined;
    const episode = isSeries ? selectedEpisode.episode : undefined;

    resolveDirect(
      { type: isSeries ? 'series' : 'movies', imdbId, season, episode },
      controller.signal
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        const sources = data?.sources || [];
        setDirectSources(sources);
        if (sources.length > 0 && Date.now() - startedAt < 4000) setDirectDefault(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setDirectLoading(false);
      });

    resolveBackup(
      { type: isSeries ? 'series' : 'movie', imdbId, season, episode, instance: 'english' },
      controller.signal
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setBackupSources(data?.sources || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setBackupLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details, selectedEpisode]);

  const seasons = useMemo(
    () =>
      isSeries && details?.episodes
        ? [...new Set(details.episodes.map((ep) => ep.season))].sort((a, b) => a - b)
        : [],
    [isSeries, details]
  );

  const seasonEpisodes = useMemo(
    () =>
      isSeries && details?.episodes
        ? details.episodes
            .filter((ep) => ep.season === selectedSeason)
            .sort((a, b) => a.episode - b.episode)
        : [],
    [isSeries, details, selectedSeason]
  );

  const englishServers = useMemo(() => {
    if (!details) return { main: [], backup: [], all: [] };
    const backendStreams = isSeries ? selectedEpisode?.streams || [] : details.streams || [];
    const imdbId = details.id || id;
    const embeds = isSeries
      ? backendStreams
      : [{ name: 'VidLink', url: `https://vidlink.pro/movie/${imdbId}` }, ...backendStreams];
    const seen = new Set();
    const deduped = embeds.filter((s) => {
      if (!s?.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
    const main = [
      ...directSources.map((s, i) => ({
        key: `direct:${i}`,
        kind: 'direct',
        name: directSources.length > 1 ? `House print ${i + 1}` : 'House print',
        url: s.url,
      })),
      ...deduped.map((s, i) => ({
        key: `embed:${i}`,
        kind: 'embed',
        name: s.name || `Embed ${i + 1}`,
        url: s.url,
      })),
    ];
    const backup = backupSources.map((s, i) => ({
      key: `backup:${i}`,
      kind: 'backup',
      name: s.label || `Further print ${i + 1}`,
      url: s.url,
      quality: s.quality,
      format: s.format,
    }));
    return { main, backup, all: [...main, ...backup] };
  }, [details, isSeries, selectedEpisode, id, directSources, backupSources]);

  const englishActive =
    englishServers.all.find((s) => s.key === serverKey) ||
    (directDefault ? englishServers.all.find((s) => s.kind === 'direct') : null) ||
    englishServers.all[0] ||
    null;

  const englishDownload = useMemo(() => {
    if (!details) return null;
    const epSuffix =
      isSeries && selectedEpisode ? ` S${selectedEpisode.season}E${selectedEpisode.episode}` : '';
    const name = `${cleanTitle(details.title)}${epSuffix}`;
    if (englishActive?.kind === 'direct') return buildDownloadUrl(englishActive.url, name);
    if (englishActive?.kind === 'backup') return englishActive.url;
    const direct = englishServers.all.find((s) => s.kind === 'direct');
    if (direct) return buildDownloadUrl(direct.url, name);
    return englishServers.all.find((s) => s.kind === 'backup')?.url || null;
  }, [details, isSeries, selectedEpisode, englishActive, englishServers]);

  const englishResume = useMemo(() => {
    const key = details?.id || id;
    const entry = continueWatching.find((x) => x.id === key);
    if (!entry?.positionSec) return 0;
    if (isSeries) {
      const same =
        entry.season === selectedEpisode?.season && entry.episode === selectedEpisode?.episode;
      return same ? entry.positionSec : 0;
    }
    return entry.positionSec;
  }, [details, id, continueWatching, isSeries, selectedEpisode]);

  const handleEnglishProgress = useCallback(
    (seconds, duration) => {
      if (!details) return;
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
        watchLink: `/watch/${kind}/${details.id || id}`,
      });
    },
    [details, id, isSeries, selectedEpisode, saveProgress, kind]
  );

  /* ================= Tamil film ================= */

  const rawTamilTitle = searchParams.get('title') || 'Tamil feature';
  const tamilUrl = !isEnglish ? decodeURIComponent(id || '') : '';
  const tamilItemId = !isEnglish ? encodeURIComponent(tamilUrl) : '';

  const [tamilStream, setTamilStream] = useState(null);
  const [tamilDownload, setTamilDownload] = useState(null);
  const [tamilMeta, setTamilMeta] = useState({ quality: '', poster: null, desc: '' });
  const [tamilLoading, setTamilLoading] = useState(isTamilFilm);
  const [tamilError, setTamilError] = useState(null);
  const [tamilResume, setTamilResume] = useState(0);

  useEffect(() => {
    const existing = continueWatching.find((x) => x.id === tamilItemId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time resume restore
    if (existing?.positionSec) setTamilResume(existing.positionSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTamilFilm) return undefined;
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect -- fetch-cycle reset */
    setTamilLoading(true);
    setTamilError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    getAutoStream(tamilUrl, controller.signal)
      .then((result) => {
        if (!result?.stream_url) throw new Error('No print could be pulled from the archive.');
        setTamilStream(result.stream_url);
        setTamilDownload(result.download_url || null);
        setTamilMeta({
          quality: result.quality || '',
          poster: result.poster || null,
          desc: result.desc || '',
        });
        saveProgress({
          id: tamilItemId,
          title: rawTamilTitle,
          type: 'tamil',
          poster: result.poster,
          progress: null,
          watchLink: `/watch/tamil/${tamilItemId}?title=${encodeURIComponent(rawTamilTitle)}`,
        });
      })
      .catch((err) => {
        if (!controller.signal.aborted) setTamilError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTamilLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTamilFilm, id]);

  const handleTamilProgress = useCallback(
    (seconds, duration) => {
      if (!duration || duration <= 0) return;
      saveProgress({
        id: tamilItemId,
        title: rawTamilTitle,
        type: 'tamil',
        poster: tamilMeta.poster,
        progress: Math.round((seconds / duration) * 100),
        positionSec: Math.floor(seconds),
        durationSec: Math.floor(duration),
        watchLink: `/watch/tamil/${tamilItemId}?title=${encodeURIComponent(rawTamilTitle)}`,
      });
    },
    [tamilItemId, rawTamilTitle, tamilMeta.poster, saveProgress]
  );

  /* ================= Tamil series ================= */

  const [tsSeasons, setTsSeasons] = useState([]);
  const [tsSeason, setTsSeason] = useState(null);
  const [tsEpisodes, setTsEpisodes] = useState([]);
  const [tsLoadingSeasons, setTsLoadingSeasons] = useState(isTamilSeries);
  const [tsEpisode, setTsEpisode] = useState(null);
  const [tsStream, setTsStream] = useState(null);
  const [tsDownload, setTsDownload] = useState(null);
  const [tsResolving, setTsResolving] = useState(false);
  const [tsMeta, setTsMeta] = useState({ poster: null, desc: '' });
  const [tsError, setTsError] = useState(null);

  useEffect(() => {
    if (!isTamilSeries) return undefined;
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect -- fetch-cycle reset */
    setTsLoadingSeasons(true);
    setTsError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    getSeasons(tamilUrl, controller.signal)
      .then((data) => {
        setTsMeta({ poster: data?.meta?.poster || null, desc: data?.meta?.desc || '' });
        const list = data?.seasons || [];
        setTsSeasons(list);
        if (list.length > 0) setTsSeason({ ...list[0], number: seasonNumber(list[0].name) });
        else if ((data?.episodes || []).length > 0) {
          setTsSeasons([{ name: 'Season 1', link: tamilUrl, number: 1 }]);
          setTsSeason({ name: 'Season 1', link: tamilUrl, number: 1 });
        } else setTsError('No seasons or episodes filed for this series.');
      })
      .catch((err) => {
        if (!controller.signal.aborted) setTsError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTsLoadingSeasons(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTamilSeries, id]);

  useEffect(() => {
    if (!isTamilSeries || !tsSeason) return undefined;
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect -- fetch-cycle reset */
    setTsEpisodes([]);
    setTsEpisode(null);
    setTsStream(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    getEpisodes(tsSeason.link, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setTsEpisodes(list || []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setTsError(err.message);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tsSeason?.link]);

  const selectTsEpisode = async (ep) => {
    setTsEpisode(ep);
    setTsStream(null);
    setTsDownload(null);
    setTsResolving(true);
    setTsError(null);
    try {
      const result = await getEpisodeStream(ep.link);
      if (!result?.stream_url) throw new Error('Could not pull this episode from the archive.');
      setTsStream(result.stream_url);
      setTsDownload(result.download_url || null);
      saveProgress({
        id: tamilItemId,
        title: rawTamilTitle,
        type: 'tamil',
        poster: tsMeta.poster,
        progress: null,
        season: tsSeason?.number ?? undefined,
        episode: ep.episode ?? undefined,
        watchLink: `/watch/tamil-series/${tamilItemId}?title=${encodeURIComponent(rawTamilTitle)}`,
      });
    } catch (err) {
      setTsError(err.message);
    } finally {
      setTsResolving(false);
    }
  };

  const handleTsProgress = useCallback(
    (seconds, duration) => {
      if (!duration || !tsEpisode) return;
      saveProgress({
        id: tamilItemId,
        title: rawTamilTitle,
        type: 'tamil',
        poster: tsMeta.poster,
        progress: Math.round((seconds / duration) * 100),
        positionSec: Math.floor(seconds),
        durationSec: Math.floor(duration),
        season: tsSeason?.number ?? undefined,
        episode: tsEpisode.episode ?? undefined,
        watchLink: `/watch/tamil-series/${tamilItemId}?title=${encodeURIComponent(rawTamilTitle)}`,
      });
    },
    [tamilItemId, rawTamilTitle, tsMeta.poster, tsEpisode, tsSeason, saveProgress]
  );

  const tsResume = (() => {
    const entry = continueWatching.find((x) => x.id === tamilItemId);
    if (!entry?.positionSec || !tsEpisode) return 0;
    const same =
      entry.season === (tsSeason?.number ?? undefined) && entry.episode === tsEpisode.episode;
    return same ? entry.positionSec : 0;
  })();

  /* ================= Shared chrome ================= */

  const folio = isEnglish
    ? {
        kicker: isSeries ? 'Series · Screening room' : 'Film · Screening room',
        title: details ? cleanTitle(details.title) : '…',
        sub: details
          ? [details.year, details.rating ? `Rated ${details.rating}` : null, details.runtime]
              .filter(Boolean)
              .join(' · ')
          : '',
        desc: details?.description || '',
      }
    : isTamilFilm
      ? {
          kicker: 'Tamil cinema · Screening room',
          title: cleanTitle(rawTamilTitle),
          sub: tamilMeta.quality ? `Archive print · ${tamilMeta.quality}` : 'Archive print',
          desc: tamilMeta.desc,
        }
      : {
          kicker: 'Tamil series · Screening room',
          title: cleanTitle(rawTamilTitle),
          sub: tsSeason?.number != null ? `Season ${tsSeason.number}` : 'Web series',
          desc: tsMeta.desc,
        };

  usePageMeta(`${folio.title} — FreakyMustard`);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Programme link copied', 'success');
    } catch {
      showToast('Could not copy the link', 'error');
    }
  };

  const download = (url, startedMsg) => {
    triggerDownload(url, {
      onStarted: () => showToast(startedMsg, 'success'),
      onError: () =>
        showToast('Download failed — the print may have expired. Reload and try again.', 'error'),
    });
  };

  const savedId = isEnglish ? details?.id || id : tamilItemId;
  const saved = savedId ? isInWatchlist(savedId) : false;
  const toggleSaved = () => {
    if (!savedId) return;
    const title = folio.title;
    if (saved) {
      removeFromWatchlist(savedId);
      showToast(`Removed “${title}”`, 'info');
    } else {
      addToWatchlist({
        id: savedId,
        title: isEnglish ? details.title : rawTamilTitle,
        type: isEnglish ? (isSeries ? 'series' : 'movies') : 'tamil',
        poster: isEnglish
          ? details?.poster || details?.backdrop
          : isTamilFilm
            ? tamilMeta.poster
            : tsMeta.poster,
        year: details?.year,
        rating: details?.rating,
        link: isEnglish ? undefined : tamilUrl,
      });
      showToast(`Saved “${title}”`, 'success');
    }
  };

  const loading =
    loadingDetails || (isTamilFilm && tamilLoading) || (isTamilSeries && tsLoadingSeasons);
  const fatal =
    detailsError ||
    (isTamilFilm && tamilError && !tamilStream) ||
    (isTamilSeries && tsError && !tsStream && tsEpisodes.length === 0 && !tsResolving);

  if (!knownKind) {
    return (
      <div className="fm-main">
        <Empty
          title="No such screening room."
          message="This print was never filed. Try the front page."
          action={
            <Link to="/" className="fm-btn">
              Back to the front page
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="fm-main fm-folio">
      <Link
        to={isEnglish ? (isSeries ? '/series' : '/films') : '/tamil'}
        className="fm-textlink fm-back"
      >
        ← Back to the index
      </Link>
      <p className="fm-folio-kicker">
        <span>{folio.kicker}</span>
      </p>
      <h1 className="fm-folio-title">{folio.title}</h1>
      {folio.sub && <p className="fm-folio-sub">{folio.sub}</p>}

      {loading && !details && !tamilStream && tsEpisodes.length === 0 && (
        <Loading label="Threading the projector" />
      )}
      {fatal && (
        <Failure
          message={detailsError || tamilError || tsError}
          onRetry={() => window.location.reload()}
        />
      )}

      {!fatal && (
        <div className="fm-watch-cols">
          <div>
            <div className="fm-frame">
              <div className="fm-frame-screen">
                {isEnglish && englishActive?.kind === 'direct' && (
                  <VideoPlayer
                    key={englishActive.url}
                    hls
                    src={englishActive.url}
                    poster={details.backdrop || details.poster}
                    title={`${folio.title} — house print`}
                    initialTime={englishResume}
                    onProgress={handleEnglishProgress}
                    downloadUrl={englishDownload}
                    onDownload={() =>
                      showToast('Download started — the press is assembling the reel.', 'success')
                    }
                  />
                )}
                {isEnglish && englishActive?.kind === 'backup' && (
                  <VideoPlayer
                    key={englishActive.url}
                    src={englishActive.url}
                    poster={details.backdrop || details.poster}
                    title={`${folio.title} — further print`}
                    initialTime={englishResume}
                    onProgress={handleEnglishProgress}
                    downloadUrl={englishDownload}
                    onDownload={() => showToast('Download started.', 'success')}
                  />
                )}
                {isEnglish && englishActive?.kind === 'embed' && (
                  <iframe
                    key={englishActive.url}
                    src={englishActive.url}
                    title={`${folio.title} player`}
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    referrerPolicy="no-referrer"
                  />
                )}
                {isEnglish && !englishActive && !directLoading && (
                  <div className="fm-center-note">
                    <p>No prints filed for this title yet.</p>
                  </div>
                )}
                {isTamilFilm && tamilStream && (
                  <VideoPlayer
                    src={tamilStream}
                    poster={tamilMeta.poster}
                    title={folio.title}
                    initialTime={tamilResume}
                    onProgress={handleTamilProgress}
                    downloadUrl={tamilDownload}
                    onDownload={() =>
                      showToast('Download started — the archive is fetching the reel.', 'success')
                    }
                  />
                )}
                {isTamilSeries && tsStream && (
                  <VideoPlayer
                    key={tsStream}
                    src={tsStream}
                    poster={tsMeta.poster}
                    title={`${folio.title} E${tsEpisode?.episode ?? ''}`}
                    initialTime={tsResume}
                    onProgress={handleTsProgress}
                    downloadUrl={tsDownload}
                    onDownload={() => showToast('Download started.', 'success')}
                  />
                )}
                {isTamilSeries && !tsStream && (
                  <div className="fm-center-note">
                    <p>
                      {tsResolving
                        ? `Pulling episode ${tsEpisode?.episode ?? ''} from the archive…`
                        : 'Choose an episode from the index.'}
                    </p>
                  </div>
                )}
              </div>
              <div className="fm-frame-caption">
                <span>
                  {isEnglish
                    ? englishActive
                      ? englishActive.kind === 'direct'
                        ? 'House print · ad-free'
                        : englishActive.kind === 'backup'
                          ? 'Further print · as-is'
                          : 'Exchange print · hosted elsewhere'
                      : directLoading
                        ? 'Threading…'
                        : 'No print'
                    : isTamilFilm
                      ? 'Archive print'
                      : tsStream
                        ? `Episode ${tsEpisode?.episode ?? ''}`
                        : 'Choose an episode'}
                </span>
                <span>{isEnglish ? englishServers.all.length : '—'} prints</span>
              </div>
            </div>

            <div className="fm-watch-actions">
              <button
                type="button"
                className="fm-btn fm-btn--plain"
                onClick={toggleSaved}
                aria-pressed={saved}
              >
                {saved ? 'Saved ✓' : 'Save'}
              </button>
              <button type="button" className="fm-btn fm-btn--plain" onClick={share}>
                Copy link
              </button>
              {(isEnglish ? englishDownload : isTamilFilm ? tamilDownload : tsDownload) && (
                <button
                  type="button"
                  className="fm-btn"
                  onClick={() =>
                    download(
                      isEnglish ? englishDownload : isTamilFilm ? tamilDownload : tsDownload,
                      'Download started.'
                    )
                  }
                >
                  Download
                </button>
              )}
            </div>

            {folio.desc && (
              <div className="fm-synopsis">
                <h2>Programme notes</h2>
                <p>{folio.desc}</p>
              </div>
            )}
          </div>

          <aside className="fm-sources" aria-label="Prints and episodes">
            {isSeries && (
              <>
                <h2>Episodes</h2>
                <p>
                  Season {selectedSeason} · {seasonEpisodes.length} filed
                </p>
                <nav className="fm-filters" aria-label="Seasons">
                  {seasons.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="fm-filter"
                      aria-pressed={selectedSeason === s}
                      onClick={() => {
                        const first = details.episodes.find((ep) => ep.season === s);
                        setSelectedSeason(s);
                        setSelectedEpisode(first || null);
                        setServerKey(null);
                      }}
                    >
                      S{s}
                    </button>
                  ))}
                </nav>
                <ol className="fm-episodes">
                  {seasonEpisodes.map((ep) => {
                    const active = selectedEpisode?.episode === ep.episode;
                    return (
                      <li key={ep.id || ep.episode}>
                        <button
                          type="button"
                          aria-current={active}
                          onClick={() => {
                            setSelectedEpisode(ep);
                            setServerKey(null);
                          }}
                        >
                          <span className="fm-source-num">
                            {String(ep.episode).padStart(2, '0')}
                          </span>
                          <span className="fm-source-name">{ep.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {isTamilSeries && (
              <>
                <h2>Episodes</h2>
                <p>
                  {tsSeason ? tsSeason.name : '…'} · {tsEpisodes.length} filed
                </p>
                {tsSeasons.length > 1 && (
                  <nav className="fm-filters" aria-label="Seasons">
                    {tsSeasons.map((s) => (
                      <button
                        key={s.link}
                        type="button"
                        className="fm-filter"
                        aria-pressed={tsSeason?.link === s.link}
                        onClick={() => setTsSeason({ ...s, number: seasonNumber(s.name) })}
                      >
                        {(s.name || '').replace(cleanTitle(rawTamilTitle), '').trim() || s.name}
                      </button>
                    ))}
                  </nav>
                )}
                <ol className="fm-episodes">
                  {tsEpisodes.map((ep) => {
                    const active = tsEpisode?.link === ep.link;
                    return (
                      <li key={ep.link}>
                        <button
                          type="button"
                          aria-current={active}
                          onClick={() => selectTsEpisode(ep)}
                        >
                          <span className="fm-source-num">
                            {ep.episode != null ? String(ep.episode).padStart(2, '0') : '•'}
                          </span>
                          <span className="fm-source-name">{ep.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {tsError && <p className="fm-status">{tsError}</p>}
              </>
            )}

            {isEnglish && (
              <>
                <h2>Prints</h2>
                <p>The house print first; exchange prints below.</p>
                {directLoading && <p className="fm-status">Threading the house print…</p>}
                <ul className="fm-source-list">
                  {englishServers.main.map((s, i) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        aria-pressed={englishActive?.key === s.key}
                        onClick={() => setServerKey(s.key)}
                      >
                        <span className="fm-source-num">{String(i + 1).padStart(2, '0')}</span>
                        <span className="fm-source-name">{s.name}</span>
                        <span className="fm-source-tag">
                          {s.kind === 'direct' ? 'House' : 'Exchange'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <details className="fm-more">
                  <summary>
                    Further prints ({englishServers.backup.length})
                    {backupLoading ? ' — threading…' : ''}
                  </summary>
                  {englishServers.backup.length === 0 && !backupLoading ? (
                    <p className="fm-status" style={{ padding: '4px 12px 12px' }}>
                      No further prints filed for this title.
                    </p>
                  ) : (
                    <ul className="fm-source-list" style={{ padding: '0 12px 12px' }}>
                      {englishServers.backup.map((s, i) => (
                        <li key={s.key}>
                          <button
                            type="button"
                            aria-pressed={englishActive?.key === s.key}
                            onClick={() => setServerKey(s.key)}
                          >
                            <span className="fm-source-num">{String(i + 1).padStart(2, '0')}</span>
                            <span className="fm-source-name">{s.name}</span>
                            <span className="fm-source-tag">{s.quality || s.format || 'File'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
                {englishActive?.kind === 'embed' && (
                  <p className="fm-status">
                    <a
                      className="fm-textlink"
                      href={englishActive.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open exchange print in a new tab →
                    </a>
                  </p>
                )}
              </>
            )}

            {!isEnglish && (
              <>
                <h2>About this print</h2>
                <p>
                  Pulled from the archive at the best available quality. Downloads arrive as a
                  single file; links expire, so reload the page if one goes stale.
                </p>
              </>
            )}
          </aside>
        </div>
      )}

      {isEnglish && details && null}
    </div>
  );
}
