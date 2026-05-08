import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Film, Tv, PlaySquare, Search, User } from 'lucide-react';

const Sidebar = () => {
    const [isHovered, setIsHovered] = useState(false);

    const navItems = [
        { icon: <User size={24} />, label: 'My Space', path: '/profile' },
        { icon: <Search size={24} />, label: 'Search', path: '/search' },
        { icon: <Home size={24} />, label: 'Home', path: '/' },
        { icon: <Tv size={24} />, label: 'English Series', path: '/english/series' },
        { icon: <Film size={24} />, label: 'English Movies', path: '/english' },
        { icon: <PlaySquare size={24} />, label: 'Tamil Movies', path: '/tamil' },
    ];

    return (
        <div 
            className={`fixed top-0 left-0 h-full z-50 bg-gradient-to-r from-black/90 to-transparent transition-all duration-300 flex flex-col justify-center ${isHovered ? 'w-64 bg-black/95' : 'w-24'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex flex-col gap-8 px-6">
                {/* JioHotstar typically has a logo at the top, but we'll center items for now */}
                {navItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.path}
                        className={({ isActive }) => 
                            `flex items-center gap-6 text-gray-400 hover:text-white hover:scale-110 transition-all duration-300 origin-left ${isActive ? 'text-white font-bold scale-110' : ''}`
                        }
                    >
                        <div className="shrink-0">{item.icon}</div>
                        {isHovered && (
                            <span className="text-lg tracking-wide animate-in fade-in slide-in-from-left-4 duration-300 whitespace-nowrap">
                                {item.label}
                            </span>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
