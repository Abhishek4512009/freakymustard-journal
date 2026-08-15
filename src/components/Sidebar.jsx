import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Film, Tv, Clapperboard, Search, UserCircle2, Bookmark } from 'lucide-react';
import { useApp } from '../context/AppContext';

const navItems = [
  { icon: Home, label: 'Home', path: '/', end: true },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Film, label: 'English Movies', path: '/english', end: true },
  { icon: Tv, label: 'English Series', path: '/english/series' },
  { icon: Clapperboard, label: 'Tamil', path: '/tamil' },
  { icon: Bookmark, label: 'Watchlist', path: '/watchlist' },
  { icon: UserCircle2, label: 'My Space', path: '/profile' },
];

function Logo({ expanded }) {
  return (
    <div className="flex items-center gap-3 px-5 overflow-hidden shrink-0">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5-11-6.5z" />
        </svg>
      </div>
      <span
        className={`text-lg font-black tracking-wide font-display whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0'}`}
      >
        STREAM<span className="text-gradient-brand">DA</span>
      </span>
    </div>
  );
}

/** Desktop rail (expands on hover/focus) + mobile bottom bar. */
export default function Sidebar() {
  const { activeProfile } = useApp();
  const [expanded, setExpanded] = React.useState(false);

  return (
    <>
      {/* ---------- Desktop rail ---------- */}
      <nav
        aria-label="Primary"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={() => setExpanded(false)}
        className={`fixed top-0 left-0 h-full z-50 hidden md:flex flex-col justify-between py-8 glass border-r border-white/5 transition-[width] duration-300 ${expanded ? 'w-60 shadow-card' : 'w-[88px]'}`}
      >
        <Logo expanded={expanded} />

        <div className="flex-1 flex flex-col gap-1.5 justify-center px-3.5">
          {navItems.map(({ icon: Icon, label, path, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              title={label}
              className={({ isActive }) =>
                `relative flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all duration-200 group/nav ${
                  isActive
                    ? 'bg-brand-500/12 text-brand-300 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-brand-400 to-accent-500 rounded-r-full shadow-glow"
                    />
                  )}
                  <Icon
                    size={21}
                    className="shrink-0 transition-transform duration-200 group-hover/nav:scale-110"
                  />
                  <span
                    className={`text-sm font-semibold whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'}`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Profile chip */}
        <NavLink
          to="/profile"
          className="px-5 flex items-center gap-3 overflow-hidden"
          title="My Space"
        >
          <div
            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${activeProfile.gradient} flex items-center justify-center text-lg border border-white/10 shrink-0`}
          >
            {activeProfile.emoji}
          </div>
          <div
            className={`flex flex-col leading-tight transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0'}`}
          >
            <span className="text-xs font-bold text-white whitespace-nowrap">
              {activeProfile.name}
            </span>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Switch profile</span>
          </div>
        </NavLink>
      </nav>

      {/* ---------- Mobile bottom bar ---------- */}
      <nav
        aria-label="Primary mobile"
        className="fixed bottom-0 inset-x-0 z-50 md:hidden glass border-t border-white/5 safe-bottom"
      >
        <div className="flex items-center justify-around h-16">
          {navItems.slice(0, 5).map(({ icon: Icon, label, path, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 w-16 py-1.5 transition-colors ${
                  isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-px w-8 h-0.5 bg-gradient-to-r from-brand-400 to-accent-500 rounded-full"
                    />
                  )}
                  <Icon size={21} />
                  <span className="text-[9px] font-bold tracking-wide">{label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
