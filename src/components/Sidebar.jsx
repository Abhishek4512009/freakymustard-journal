import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Film, Tv, PlaySquare, Search, User } from 'lucide-react';

const Sidebar = () => {
    const [isHovered, setIsHovered] = useState(false);

    const navItems = [
        { icon: <User size={22} />, label: 'My Space', path: '/profile' },
        { icon: <Search size={22} />, label: 'Search', path: '/search' },
        { icon: <Home size={22} />, label: 'Home', path: '/' },
        { icon: <Tv size={22} />, label: 'Series', path: '/english/series' },
        { icon: <Film size={22} />, label: 'Movies', path: '/english' },
        { icon: <PlaySquare size={22} />, label: 'Tamil', path: '/tamil' },
    ];

    return (
        <>
            {/* Desktop Left Sidebar */}
            <div 
                className={`fixed top-0 left-0 h-full z-50 bg-gradient-to-b from-slate-950/90 to-slate-900/90 backdrop-blur-xl border-r border-slate-900/50 transition-all duration-300 flex-col justify-between py-10 hidden md:flex ${isHovered ? 'w-64 shadow-[5px_0_30px_rgba(0,0,0,0.8)]' : 'w-24'}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Logo / Header Branding */}
                <div className="flex items-center gap-4 px-6 mb-8 overflow-hidden shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white tracking-tighter shadow-lg shadow-blue-500/20">
                        S
                    </div>
                    {isHovered && (
                        <span className="text-xl font-black text-white tracking-wide animate-in fade-in slide-in-from-left-4 duration-300">
                            STREAM<span className="text-blue-500 font-medium">DA</span>
                        </span>
                    )}
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 flex flex-col gap-6 justify-center px-4">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={index}
                            to={item.path}
                            className={({ isActive }) => 
                                `relative flex items-center gap-5 px-3 py-3.5 rounded-xl transition-all duration-300 group/nav ${isActive ? 'bg-blue-600/10 text-blue-400 font-bold border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active Left Indicator Pill */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                    )}
                                    
                                    <div className={`shrink-0 transition-transform duration-300 group-hover/nav:scale-110 ${isActive ? 'text-blue-400 shadow-blue-500/20' : 'text-slate-400 group-hover/nav:text-white'}`}>
                                        {item.icon}
                                    </div>
                                    
                                    {isHovered && (
                                        <span className="text-[15px] font-semibold tracking-wide animate-in fade-in slide-in-from-left-3 duration-300 whitespace-nowrap">
                                            {item.label}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>

                {/* Footer Account Profile */}
                <div className="px-6 overflow-hidden shrink-0 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                        AD
                    </div>
                    {isHovered && (
                        <div className="flex flex-col text-xs leading-none">
                            <span className="font-bold text-white">Guest Room</span>
                            <span className="text-[10px] text-slate-500 mt-0.5">Developer</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile/Tablet Glassmorphic Bottom Navigation Bar */}
            <div className="fixed bottom-0 inset-x-0 h-16 bg-slate-950/80 backdrop-blur-lg border-t border-slate-900/60 z-50 flex items-center justify-around px-2 pb-safe md:hidden">
                {navItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.path}
                        className={({ isActive }) => 
                            `flex flex-col items-center justify-center gap-1 w-14 py-1.5 transition-all duration-300 relative ${isActive ? 'text-blue-500 font-bold scale-105' : 'text-slate-500 hover:text-slate-350'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {/* Active Top Bar Indicator */}
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                )}
                                <div className={`shrink-0 transition-transform ${isActive ? 'text-blue-500' : 'text-slate-500'}`}>
                                    {React.cloneElement(item.icon, { size: 20 })}
                                </div>
                                <span className="text-[9px] tracking-wide font-medium truncate uppercase">
                                    {item.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </>
    );
};

export default Sidebar;
