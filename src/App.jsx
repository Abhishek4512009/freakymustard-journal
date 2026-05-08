import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import EnglishPortal from './pages/EnglishPortal';
import TamilPortal from './pages/TamilPortal';
import WatchEnglish from './pages/WatchEnglish';
import WatchTamil from './pages/WatchTamil';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-900 text-white font-sans overflow-x-hidden">
        {/* Navigation */}
        <Sidebar />
        
        {/* Main Content Area - margin left to account for collapsed sidebar (w-24 = 6rem = 96px) */}
        <div className="flex-1 ml-0 md:ml-24 transition-all duration-300 relative min-w-0">
          <Routes>
            <Route path="/" element={<Home />} />
            
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
    </Router>
  );
}

export default App;
