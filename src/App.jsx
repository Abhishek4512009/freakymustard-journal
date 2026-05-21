import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import EnglishPortal from './pages/EnglishPortal';
import TamilPortal from './pages/TamilPortal';
import WatchEnglish from './pages/WatchEnglish';
import WatchTamil from './pages/WatchTamil';
import Search from './pages/Search';
import Profile from './pages/Profile';
import { AppProvider, useApp } from './context/AppContext';

// Helper component to smoothly reset scroll position on page navigation
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

// Global Toast Banner overlay
function ToastNotification() {
  const { toast, hideToast } = useApp();

  if (!toast.visible) return null;

  const typeClasses = {
    success: 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20',
    info: 'bg-blue-950/90 border-blue-500/30 text-blue-300 shadow-blue-950/20',
    warning: 'bg-amber-950/90 border-amber-500/30 text-amber-305 shadow-amber-950/20',
    error: 'bg-red-950/90 border-red-500/30 text-red-300 shadow-red-950/20'
  };

  return (
    <div 
      className={`fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[100] flex items-center gap-4 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-350 animate-in slide-in-from-bottom-4 fade-in ${typeClasses[toast.type] || typeClasses.success}`}
    >
      <div className="w-2 h-2 rounded-full bg-current animate-ping"></div>
      <span className="text-sm font-bold tracking-wide">{toast.message}</span>
      <button 
        onClick={hideToast} 
        className="text-slate-400 hover:text-white text-xs font-black transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

function AppContent() {
  return (
    <Router>
      <ScrollToTop />
      <div className="flex min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
        {/* Navigation Controls */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 ml-0 md:ml-24 transition-all duration-300 relative min-w-0">
          <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Search and Profile Routes */}
            <Route path="/search" element={<Search />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* English Portal Routes */}
            <Route path="/english" element={<EnglishPortal type="movies" />} />
            <Route path="/english/series" element={<EnglishPortal type="series" />} />
            
            {/* Tamil Portal Route */}
            <Route path="/tamil" element={<TamilPortal />} />
            
            {/* Watch Routes */}
            <Route path="/watch/english/:type/:id" element={<WatchEnglish />} />
            <Route path="/watch/tamil/:encodedUrl" element={<WatchTamil />} />
          </Routes>
        </div>
      </div>
      <ToastNotification />
    </Router>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
