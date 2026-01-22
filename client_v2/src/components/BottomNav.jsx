import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// Import Icons
import homeIcon from '../assets/icons/home.png';
import addIcon from '../assets/icons/add.png';
import distributeIcon from '../assets/icons/distribute.png';
import historyIcon from '../assets/icons/history.png';
import logoutIcon from '../assets/icons/logout.png';

const BottomNav = () => {
    const location = useLocation();

    // Hide on Login page
    if (location.pathname === '/login') return null;

    const navItems = [
        { path: '/add-inventory', label: 'Stocks', icon: addIcon },
        { path: '/distribute', label: 'Give', icon: distributeIcon },
        { path: '/', label: 'Home', icon: homeIcon, isHome: true },
        { path: '/orders', label: 'History', icon: historyIcon },
        { path: '/profile', label: 'Profile', icon: logoutIcon },
    ];
    // Wait, I should import logout icon if I want to use it as Profile

    return (
        <div className="bottom-nav-container">
            {/* SVG Background with Curve */}
            <svg className="bottom-nav-bg" viewBox="0 0 375 80" preserveAspectRatio="none">
                <path
                    className="nav-curve-path"
                    d="M0,25 L135,25 Q155,25 165,15 Q187.5,-15 210,15 Q220,25 240,25 L375,25 L375,80 L0,80 Z"
                />
            </svg>
            <div className="bottom-nav-items">
                {navItems.map((item, index) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`bottom-nav-item ${index === 2 ? 'nav-item-center' : ''} ${isActive ? 'active' : ''}`}
                        >
                            <div className="icon-wrapper">
                                <img src={item.icon} alt={item.label} className="nav-icon-img" />
                            </div>
                            <span className="bottom-nav-label">{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
