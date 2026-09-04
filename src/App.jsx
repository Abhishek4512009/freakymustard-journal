import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import Masthead from './components/Masthead';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { Loading, Toasts } from './components/Notices';
import { AppProvider } from './context/AppContext';

// One chunk per section.
const FrontPage = lazy(() => import('./pages/FrontPage'));
const Catalogue = lazy(() => import('./pages/Catalogue'));
const Search = lazy(() => import('./pages/Search'));
const Saved = lazy(() => import('./pages/Saved'));
const UnifiedWatch = lazy(() => import('./pages/UnifiedWatch'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** Reset scroll on navigation. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

/** Legacy English watch links (/watch/english/movies|series/:id) → new scheme. */
function EnglishWatchRedirect() {
  const { type, id } = useParams();
  const kind = type === 'series' ? 'series' : 'movie';
  return <Navigate to={`/watch/${kind}/${id}`} replace />;
}

function Shell() {
  return (
    <div className="fm-page">
      <Masthead />
      <main>
        <Suspense fallback={<Loading label="Turning the page" />}>
          <Routes>
            <Route path="/" element={<FrontPage />} />
            <Route path="/films" element={<Catalogue kind="films" />} />
            <Route path="/series" element={<Catalogue kind="series" />} />
            <Route path="/tamil" element={<Catalogue kind="tamil" />} />
            <Route path="/search" element={<Search />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/watch/:kind/:id" element={<UnifiedWatch />} />

            {/* Legacy routes from the previous edition */}
            <Route path="/english" element={<Navigate to="/films" replace />} />
            <Route path="/english/series" element={<Navigate to="/series" replace />} />
            <Route path="/watch/english/:type/:id" element={<EnglishWatchRedirect />} />
            <Route path="/watch/tamil/:encodedUrl" element={<TamilRedirect kind="tamil" />} />
            <Route
              path="/watch/tamil-series/:encodedUrl"
              element={<TamilRedirect kind="tamil-series" />}
            />
            <Route path="/watchlist" element={<Navigate to="/saved" replace />} />
            <Route path="/profile" element={<Navigate to="/saved" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <Toasts />
    </div>
  );
}

/** Legacy Tamil links keep their encoded print URL, only the prefix changes. */
function TamilRedirect({ kind }) {
  const { encodedUrl } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/watch/${kind}/${encodedUrl}${search}`} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Shell />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
