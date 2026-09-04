import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TitleCard from '../components/TitleCard';
import { Empty, Failure, Loading } from '../components/Notices';
import { useDebouncedValue, usePageMeta } from '../hooks';
import { useApp } from '../context/AppContext';
import { searchContent } from '../api/englishApi';
import { searchMovies } from '../api/tamilApi';

const SUGGESTIONS = ['Oppenheimer', 'Vikram', 'Breaking Bad', 'Leo', 'Dune', 'Jailer'];

/**
 * The journal index: one search box, three filing trays.
 * Debounced live search + URL sync (?q=) + recent terms.
 */
export default function Search() {
  usePageMeta('Index — FreakyMustard', 'Search English films, series and Tamil cinema.');

  const [searchParams, setSearchParams] = useSearchParams();
  const { recentSearches, addRecentSearch, clearRecentSearches } = useApp();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const debounced = useDebouncedValue(query, 450);

  const [films, setFilms] = useState([]);
  const [series, setSeries] = useState([]);
  const [tamil, setTamil] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [failed, setFailed] = useState(null);

  const abortRef = useRef(null);

  const runSearch = useCallback(
    async (q) => {
      const clean = q.trim();
      if (clean.length < 2) {
        setFilms([]);
        setSeries([]);
        setTamil([]);
        setSearched(false);
        setFailed(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setSearched(true);
      setFailed(null);
      addRecentSearch(clean);

      const [m, s, t] = await Promise.allSettled([
        searchContent('movies', clean, controller.signal),
        searchContent('series', clean, controller.signal),
        searchMovies(clean, controller.signal),
      ]);

      if (controller.signal.aborted) return;

      if (m.status === 'rejected' && s.status === 'rejected' && t.status === 'rejected') {
        setFailed(m.reason?.message || 'Search failed.');
      }
      setFilms(m.status === 'fulfilled' ? m.value?.results || [] : []);
      setSeries(s.status === 'fulfilled' ? s.value?.results || [] : []);
      setTamil(t.status === 'fulfilled' ? t.value || [] : []);
      setLoading(false);
    },
    [addRecentSearch]
  );

  // Effect-driven search is intentional: debounce + abort orchestration.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- debounce + abort orchestration */
    setSearchParams(debounced.trim() ? { q: debounced.trim() } : {}, { replace: true });
    runSearch(debounced);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [debounced]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => () => abortRef.current?.abort(), []);

  const total = films.length + series.length + tamil.length;

  const tray = (no, heading, items, type) => {
    if (items.length === 0) return null;
    return (
      <section aria-label={heading}>
        <h2 className="fm-rule-head">
          {heading}{' '}
          <span style={{ fontFamily: 'var(--fm-mono)', fontSize: 12, color: 'var(--fm-muted)' }}>
            — {items.length} result{items.length === 1 ? '' : 's'}
          </span>
        </h2>
        <ul className="fm-grid">
          {items.map((item, i) => (
            <li key={item.id || item.link || i}>
              <TitleCard item={item} type={type} />
            </li>
          ))}
        </ul>
        <p className="fm-search-meta">
          <span style={{ color: 'var(--fm-accent)' }}>{no}</span>
        </p>
      </section>
    );
  };

  return (
    <div className="fm-main">
      <div className="fm-search-head">
        <p className="fm-kicker">The index</p>
        <h1>What are you looking for?</h1>
        <form
          className="fm-searchbox"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
        >
          <input
            type="search"
            aria-label="Search films, series and Tamil cinema"
            placeholder="A title, e.g. Vikram, Dune, Breaking Bad…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="fm-btn">
            Search
          </button>
        </form>
      </div>

      {loading && <Loading label="Searching the stacks" />}

      {failed && !loading && <Failure message={failed} onRetry={() => runSearch(debounced)} />}

      {!loading && !failed && searched && total === 0 && (
        <Empty
          title={`Nothing filed under “${debounced.trim()}”`}
          message="Check the spelling, or try a shorter keyword. Tamil search works best with film names."
        />
      )}

      {!loading && !failed && searched && total > 0 && (
        <>
          {tray('A.', 'English films', films, 'movies')}
          {tray('B.', 'Series', series, 'series')}
          {tray('C.', 'Tamil cinema', tamil, 'movies')}
        </>
      )}

      {!searched && !loading && (
        <>
          {recentSearches.length > 0 && (
            <section aria-label="Recent searches">
              <h2 className="fm-rule-head">Recently looked up</h2>
              <ul className="fm-terms">
                {recentSearches.map((q) => (
                  <li key={q}>
                    <button type="button" className="fm-filter" onClick={() => setQuery(q)}>
                      {q}
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" className="fm-remove" onClick={clearRecentSearches}>
                    Clear
                  </button>
                </li>
              </ul>
            </section>
          )}
          <section aria-label="Suggested searches">
            <h2 className="fm-rule-head">From the editors’ desk</h2>
            <ul className="fm-terms">
              {SUGGESTIONS.map((q) => (
                <li key={q}>
                  <button type="button" className="fm-filter" onClick={() => setQuery(q)}>
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
