import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import ToastStack from './components/ui/ToastStack';
import { PageLoader } from './components/ui/Skeleton';
import { AppProvider } from './context/AppContext';

// Route-level code splitting: each page is its own chunk.
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const Profile = lazy(() => import('./pages/Profile'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const EnglishPortal = lazy(() => import('./pages/EnglishPortal'));
const TamilPortal = lazy(() => import('./pages/TamilPortal'));
const WatchEnglish = lazy(() => import('./pages/WatchEnglish'));
const WatchTamil = lazy(() => import('./pages/WatchTamil'));
const WatchTamilSeries = lazy(() => import('./pages/WatchTamilSeries'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** Reset scroll on navigation. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function Shell() {
  return (
    <div className="flex min-h-screen bg-ink-950 text-white">
      <Sidebar />
      <main className="flex-1 md:ml-[88px] min-w-0 pb-16 md:pb-0">
        <Suspense fallback={<PageLoader label="Loading" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/english" element={<EnglishPortal type="movies" />} />
            <Route path="/english/series" element={<EnglishPortal type="series" key="series" />} />
            <Route path="/tamil" element={<TamilPortal />} />
            <Route path="/watch/english/:type/:id" element={<WatchEnglish />} />
            <Route path="/watch/tamil/:encodedUrl" element={<WatchTamil />} />
            <Route path="/watch/tamil-series/:encodedUrl" element={<WatchTamilSeries />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <ToastStack />
    </div>
  );
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
