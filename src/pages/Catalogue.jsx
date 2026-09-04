import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TitleCard from '../components/TitleCard';
import { Failure, Loading } from '../components/Notices';
import { usePageMeta } from '../hooks';
import { getPopular, getTop, getGenres, getByGenre } from '../api/englishApi';
import { getYears, getMovies, getSeries } from '../api/tamilApi';

const META = {
  films: {
    title: 'Films',
    dek: 'English features, popular and top-rated, filed by genre.',
    type: 'movies',
  },
  series: {
    title: 'Series',
    dek: 'Long-form television, popular and top-rated, filed by genre.',
    type: 'series',
  },
  tamil: {
    title: 'Tamil cinema',
    dek: 'The archive by year — newest prints first, series at the back.',
    type: 'movies',
  },
};

/**
 * Shared catalogue index for /films, /series and /tamil.
 * One header, one filter row, one grid — no portal duplication.
 */
export default function Catalogue({ kind = 'films' }) {
  const meta = META[kind] || META.films;
  usePageMeta(`${meta.title} — FreakyMustard`, meta.dek);

  const [popular, setPopular] = useState([]);
  const [extra, setExtra] = useState([]); // top-rated (en) or older years (tamil)
  const [terms, setTerms] = useState([]); // genres (en) or years (tamil)
  const [activeTerm, setActiveTerm] = useState(null);
  const [termResults, setTermResults] = useState([]);
  const [termPages, setTermPages] = useState(1);
  const [termMore, setTermMore] = useState(false);
  const [loadingTerm, setLoadingTerm] = useState(false);
  const [seriesShelf, setSeriesShelf] = useState([]); // tamil web series
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      setPhase('loading');
      setError(null);
      setActiveTerm(null);
      setTermResults([]);
      try {
        if (kind === 'tamil') {
          const years = await getYears(signal);
          if (!years?.length) throw new Error('No years available.');
          setTerms(years);
          const first = years.slice(0, 2);
          const settled = await Promise.allSettled(first.map((y) => getMovies(y.link, 1, signal)));
          const lists = settled
            .map((r, i) =>
              r.status === 'fulfilled' && r.value.length > 0
                ? { name: first[i].name, movies: r.value }
                : null
            )
            .filter(Boolean);
          setPopular(lists[0]?.movies || []);
          setExtra(lists.slice(1).flatMap((l) => l.movies));
          try {
            const s = await getSeries(1, signal);
            setSeriesShelf(s?.results || []);
          } catch {
            /* shelf stays hidden */
          }
        } else {
          const [pop, top, genres] = await Promise.all([
            getPopular(meta.type, 0, signal),
            getTop(meta.type, 0, signal).catch(() => null),
            getGenres(signal).catch(() => null),
          ]);
          setPopular(pop?.results || []);
          setExtra(top?.results || []);
          setTerms((genres?.genres || []).map((g) => ({ name: g, link: g })));
        }
        setPhase('ready');
      } catch (err) {
        if (!signal.aborted) {
          setError(err.message);
          setPhase('error');
        }
      }
    };

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const openTerm = async (term, pages = 1, append = false) => {
    setLoadingTerm(true);
    try {
      if (kind === 'tamil') {
        const movies = await getMovies(term.link, pages);
        setTermResults((prev) => (append ? [...prev, ...movies] : movies));
        setTermPages(pages);
        setTermMore(movies.length > 0);
      } else {
        const data = await getByGenre(meta.type, term.link, append ? termResults.length : 0);
        const results = data?.results || [];
        setTermResults((prev) => (append ? [...prev, ...results] : results));
        setTermMore(Boolean(data?.has_more) && results.length > 0);
      }
      if (!append) setActiveTerm(term);
    } catch {
      /* keep previous results */
    } finally {
      setLoadingTerm(false);
    }
  };

  if (phase === 'error') {
    return (
      <div className="fm-main">
        <Failure message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="fm-main">
        <div className="fm-index-head">
          <h1 className="fm-index-title">{meta.title}</h1>
        </div>
        <Loading label={`Indexing ${meta.title.toLowerCase()}`} />
      </div>
    );
  }

  const termLabel = (t) =>
    kind === 'tamil' ? t.name.replace('Moviesda ', '').replace(' Movies', '') : t.name;

  return (
    <div className="fm-main">
      <div className="fm-index-head">
        <p className="fm-kicker">{kind === 'tamil' ? 'The archive' : 'The index'}</p>
        <h1 className="fm-index-title">{meta.title}</h1>
        <p className="fm-index-dek">{meta.dek}</p>
      </div>

      {terms.length > 0 && (
        <nav className="fm-filters" aria-label={kind === 'tamil' ? 'Years' : 'Genres'}>
          {terms.map((t) => {
            const active = activeTerm?.name === t.name;
            return (
              <button
                key={t.name}
                type="button"
                className="fm-filter"
                aria-pressed={active}
                onClick={() => (active ? setActiveTerm(null) : openTerm(t))}
              >
                {termLabel(t)}
              </button>
            );
          })}
        </nav>
      )}

      {activeTerm && (
        <section aria-label={`${termLabel(activeTerm)} titles`}>
          <h2 className="fm-rule-head">
            {termLabel(activeTerm)}{' '}
            <span style={{ fontFamily: 'var(--fm-mono)', fontSize: 12, color: 'var(--fm-muted)' }}>
              {loadingTerm && termResults.length === 0
                ? '— fetching'
                : `— ${termResults.length} titles`}
            </span>
          </h2>
          <ul className="fm-grid">
            {termResults.map((m, i) => (
              <li key={m.id || m.link || i}>
                <TitleCard item={m} type={meta.type} />
              </li>
            ))}
          </ul>
          {termMore && (
            <div className="fm-loadrow">
              <button
                type="button"
                className="fm-btn fm-btn--plain"
                disabled={loadingTerm}
                onClick={() => openTerm(activeTerm, kind === 'tamil' ? termPages + 1 : 0, true)}
              >
                {loadingTerm ? 'Fetching…' : 'Older entries'}
              </button>
            </div>
          )}
        </section>
      )}

      <section aria-label="Popular titles">
        <h2 className="fm-rule-head">Popular</h2>
        <ul className="fm-grid">
          {popular.slice(0, 18).map((m, i) => (
            <li key={m.id || m.link || i}>
              <TitleCard item={m} type={meta.type} />
            </li>
          ))}
        </ul>
      </section>

      {extra.length > 0 && (
        <section aria-label={kind === 'tamil' ? 'From the stacks' : 'Top rated'}>
          <h2 className="fm-rule-head">{kind === 'tamil' ? 'From the stacks' : 'Top rated'}</h2>
          <ul className="fm-grid">
            {extra.slice(0, 18).map((m, i) => (
              <li key={m.id || m.link || i}>
                <TitleCard item={m} type={meta.type} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {kind === 'tamil' && seriesShelf.length > 0 && (
        <section aria-label="Tamil web series">
          <h2 className="fm-rule-head">Web series</h2>
          <ul className="fm-grid">
            {seriesShelf.slice(0, 12).map((s, i) => (
              <li key={s.link || i}>
                <TitleCard item={{ ...s, kind: 'series' }} type="tamil-series" />
              </li>
            ))}
          </ul>
          <p className="fm-search-meta">
            Series open in the Tamil series screening room.{' '}
            <Link to="/search">Or search the whole journal →</Link>
          </p>
        </section>
      )}
    </div>
  );
}
