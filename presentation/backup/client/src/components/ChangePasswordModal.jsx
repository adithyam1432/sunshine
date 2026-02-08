import React, { useState } from 'react';
import bcrypt from 'bcryptjs';
import { useDB } from '../db/DatabaseContext';

const ChangePasswordModal = ({ onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const { runQuery } = useDB();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        try {
            setLoading(true);
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                setError("No user logged in");
                setLoading(false);
                return;
            }
            const user = JSON.parse(userStr);

            // 1. Verify Current Password
            const rows = await runQuery("SELECT * FROM users WHERE id = ?", [user.id]);
            if (rows.length === 0) {
                setError("User not found");
                setLoading(false);
                return;
            }

            const dbUser = rows[0];
            const isMatch = await bcrypt.compare(currentPassword, dbUser.password);

            if (!isMatch) {
                setError("Incorrect current password");
                setLoading(false);
                return;
            }

            // 2. Hash New Password
            const hash = await bcrypt.hash(newPassword, 10);

            // 3. Update DB
            await runQuery("UPDATE users SET password = ? WHERE id = ?", [hash, user.id]);

            setMessage("Password updated successfully!");
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (err) {
            console.error(err);
            setError("Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '400px', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >✕</button>

                <h3 style={{ marginBottom: '1.5rem' }}>Change Password</h3>

                {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
                {message && <div style={{ color: '#10b981', marginBottom: '1rem', fontSize: '0.9rem' }}>{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
