import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logoutIcon from '../assets/icons/logout.png';

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

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const onLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage'));
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
                    <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Sun☀️Shine</h3>
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

                    <button onClick={onLogoutClick} className="btn" style={{ padding: '0.5rem 1rem', width: 'auto', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>Logout</button>
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
                    {/* Logout moved to Profile Page */}
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
                    padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1.5rem', color: 'var(--text-primary)' }}>
                        <h3 style={{ margin: '0 0 1rem' }}>Log Out?</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Are you sure you want to log out?</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowLogoutConfirm(false)} className="btn" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>Cancel</button>
                            <button onClick={confirmLogout} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none' }}>Log Out</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Menu Removed (Replaced by BottomNav) */}
        </nav>
    );
};

export default Navbar;
