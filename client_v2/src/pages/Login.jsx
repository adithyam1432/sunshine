import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDB } from '../db/DatabaseContext';
import bcrypt from 'bcryptjs';

import userIcon from '../assets/icons/user.png';
import passwordIcon from '../assets/icons/password.png';
import eyeIcon from '../assets/icons/eye.png';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { runQuery } = useDB();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Local Database Logic
            const rows = await runQuery("SELECT * FROM users WHERE username = ?", [username]);

            if (!rows || rows.length === 0) {
                setError('Invalid username or password');
                return;
            }

            const user = rows[0];
            // Compare password (offline)
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                const userData = { id: user.id, username: user.username, role: user.role };
                localStorage.setItem('user', JSON.stringify(userData));

                // Trigger event for Navbar to update
                window.dispatchEvent(new Event('storage'));

                navigate('/');
            } else {
                setError('Invalid username or password');
            }
        } catch (err) {
            console.error(err);
            setError('Login failed: ' + err.message);
        }
    };

    return (
        <div className="auth-container" style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '2rem', fontWeight: '800', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sun☀️Shine</h2>
                {error && <p style={{ color: 'var(--secondary)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
                <form onSubmit={handleLogin}>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>Username</label>
                        <div style={{ position: 'relative' }}>
                            <img
                                src={userIcon}
                                alt="user"
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '20px',
                                    height: '20px',
                                    opacity: 0.7
                                }}
                            />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <img
                                src={passwordIcon}
                                alt="password"
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '20px',
                                    height: '20px',
                                    opacity: 0.7
                                }}
                            />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                            />
                            <img
                                src={eyeIcon}
                                alt="toggle password"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '20px',
                                    height: '20px',
                                    opacity: 0.7,
                                    cursor: 'pointer'
                                }}
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary">Sign In</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
