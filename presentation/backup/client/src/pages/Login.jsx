import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDB } from '../db/DatabaseContext';
import bcrypt from 'bcryptjs';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { runQuery } = useDB();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Local Database Logic
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
        <div className="auth-container">
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Login</h2>
                {error && <p style={{ color: 'var(--secondary)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                        />
                    </div>
                    <button type="submit" className="btn btn-primary">Sign In</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
