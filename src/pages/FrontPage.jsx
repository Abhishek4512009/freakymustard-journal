import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CoverStory from '../components/CoverStory';
import { ContinueLedger, Section, Shelf } from '../components/Shelf';
import { Failure, Loading } from '../components/Notices';
import { usePageMeta } from '../hooks';
import { useApp } from '../context/AppContext';
import { getPopular, getByGenre } from '../api/englishApi';
import { getYears, getMovies } from '../api/tamilApi';

/**
 * Front page: one cover story, a continue-reading ledger,
 * and four numbered shelves. Each shelf loads independently.
 */
export default function FrontPage() {
  usePageMeta(
    'FreakyMustard — An Editorial Streaming Journal',
    'English films, series and Tamil cinema, set like a printed film journal.'
  );

  const { continueWatching } = useApp();

  const [cover, setCover] = useState(null);
  const [films, setFilms] = useState([]);
  const [series, setSeries] = useState([]);
  const [tamil, setTamil] = useState([]);
  const [action, setAction] = useState([]);
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      setPhase('loading');
      try {
        const [engPopular, seriesPopular, years] = await Promise.all([
          getPopular('movies', 0, signal),
          getPopular('series', 0, signal),
          getYears(signal),
        ]);

        const eng = engPopular?.results || [];
        const ser = seriesPopular?.results || [];
        setFilms(eng.slice(0, 12));
        setSeries(ser.slice(0, 12));

        const withStill = [...eng.slice(0, 4), ...ser.slice(0, 3)].find((m) => m.backdrop);
        setCover(withStill || eng[0] || ser[0] || null);

        if (years?.length > 0) {
          try {
            const latest = await getMovies(years[0].link, 1, signal);
            setTamil(latest.slice(0, 12));
          } catch {
            /* shelf stays empty */
          }
        }
        setPhase('ready');

        try {
          const act = await getByGenre('movies', 'action', 0, signal);
          setAction((act?.results || []).slice(0, 12));
        } catch {
          /* nice-to-have shelf */
        }
      } catch {
        if (!signal.aborted) setPhase('error');
      }
    };

    load();
    return () => controller.abort();
  }, []);

  if (phase === 'error') {
    return (
      <div className="fm-main">
        <Failure onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="fm-main">
        <Loading label="Setting the front page" />
      </div>
    );
  }

  return (
    <div className="fm-main">
      <CoverStory item={cover} type="movies" />

      {continueWatching.length > 0 && (
        <Section no="00" title="Continue reading" to="/saved" count={continueWatching.length}>
          <ContinueLedger items={continueWatching.slice(0, 6)} />
        </Section>
      )}

      <Section no="01" title="English films" to="/films" count={films.length}>
        <Shelf items={films} type="movies" strip />
      </Section>

      <Section no="02" title="Tamil cinema" to="/tamil" count={tamil.length}>
        <Shelf items={tamil} type="movies" strip />
      </Section>

      <Section no="03" title="Series, long-form" to="/series" count={series.length}>
        <Shelf items={series} type="series" strip />
      </Section>

      {action.length > 0 && (
        <Section no="04" title="Action, for the back row" to="/films" count={action.length}>
          <Shelf items={action} type="movies" strip />
        </Section>
      )}

      <section className="fm-section" aria-label="About this journal">
        <div className="fm-section-head">
          <h2 className="fm-section-title">
            <span className="fm-section-no">05</span>Colophon
          </h2>
        </div>
        <p className="fm-standfirst" style={{ fontSize: 16 }}>
          Three cinemas, one index. Films and series resolve through our own ad-free projection
          booth; Tamil prints come straight from the archive. Save anything to your list — it never
          leaves your browser.
        </p>
        <div className="fm-cover-actions">
          <Link to="/films" className="fm-btn">
            Open the film index
          </Link>
          <Link to="/tamil" className="fm-textlink">
            Tamil archive →
          </Link>
        </div>
      </section>
    </div>
  );
}
