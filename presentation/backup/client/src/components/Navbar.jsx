import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    // Initialize Theme: Check localStorage or default to 'dark'
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));

    // Apply theme on mount and change
    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user) return null;

    const navItems = [
        { label: 'Dashboard', path: '/' },
        { label: 'Add Stock', path: '/add-inventory' },
        { label: 'Distribute', path: '/distribute' },
        { label: 'Orders', path: '/orders' },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ color: 'var(--primary)', margin: 0 }}>Sunshine Inventory</h3>
                </div>

                {/* Desktop Menu */}
                <div className="nav-links">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            {item.label}
                        </Link>
                    ))}

                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className="btn"
                        style={{
                            padding: '0.5rem',
                            width: 'auto',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            fontSize: '1.2rem'
                        }}
                        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>

                    <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem 1rem', width: 'auto', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>Logout</button>
                </div>

                {/* Mobile Controls (Theme + Logout) */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="mobile-controls">
                    {/* Mobile Theme Toggle */}
                    <button
                        className="btn-icon"
                        onClick={toggleTheme}
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>

                    {/* Mobile Logout */}
                    <button
                        className="btn-icon"
                        onClick={handleLogout}
                        title="Logout"
                        style={{ padding: '8px' }}
                    >
                        <img src={logoutIcon} alt="Logout" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </button>
                </div>
            </div>
            {/* Mobile Menu Removed (Replaced by BottomNav) */}
        </nav>
    );
};

export default Navbar;
