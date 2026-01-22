import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useDB } from '../db/DatabaseContext';
import logoutIcon from '../assets/icons/logout.png';
import exportIcon from '../assets/icons/export.png';

const Profile = () => {
    const navigate = useNavigate();
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const user = JSON.parse(localStorage.getItem('user'));

    // Use the context to run queries
    const { runQuery } = useDB();

    const handleLogout = () => {
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage')); // Notify app
        navigate('/login');
    };

    const handleExportData = async () => {
        try {
            // 1. Fetch all data
            const tables = ['users', 'students', 'categories', 'products', 'stock', 'transactions'];
            const exportData = {};

            for (const table of tables) {
                const rows = await runQuery(`SELECT * FROM ${table}`);
                exportData[table] = rows;
            }

            // 2. Prepare File
            const fileName = `sunshine_backup_${new Date().toISOString().slice(0, 10)}.json`;
            const fileContent = JSON.stringify(exportData, null, 2);

            // 3. Save & Share (Mobile)
            if (window.Capacitor) {
                const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
                const { Share } = await import('@capacitor/share');

                // Write
                await Filesystem.writeFile({
                    path: fileName,
                    data: fileContent,
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8
                });

                // Get URI
                const fileUri = await Filesystem.getUri({
                    directory: Directory.Documents,
                    path: fileName
                });

                // Share
                await Share.share({
                    title: 'Backup Data',
                    text: 'Here is your Sunshine Inventory Data',
                    url: fileUri.uri,
                    dialogTitle: 'Export Database'
                });
            } else {
                // Web Fallback
                const blob = new Blob([fileContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
            }

        } catch (err) {
            console.error("Export Failed:", err);
            alert("Export Failed: " + err.message);
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <h1>My Profile</h1>

            <div className="card" style={{ marginTop: '1rem', textAlign: 'center' }}>
                {/* Updated Avatar: Sun Icon with Glow */}
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: '#fff', margin: '0 auto 1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(255, 165, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.4)',
                    border: '2px solid #fff'
                }}>
                    <span style={{ fontSize: '3rem', lineHeight: '1' }}>☀️</span>
                </div>
                <h2>{user?.username}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Role: {user?.role}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        className="btn"
                        style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={handleExportData}
                    >
                        <img src={exportIcon} alt="export" style={{ width: '20px', height: '20px' }} />
                        Export Data (Backup)
                    </button>

                    <button
                        className="btn"
                        style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                        onClick={() => setIsChangePasswordOpen(true)}
                    >
                        🔒 Change Password
                    </button>

                    <button
                        className="btn"
                        style={{ background: '#ef4444', color: 'white', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onClick={handleLogout}
                    >
                        <img src={logoutIcon} alt="logout" style={{ width: '20px', height: '20px', filter: 'brightness(0) invert(1)' }} />
                        Logout
                    </button>
                </div>
            </div>

            {isChangePasswordOpen && <ChangePasswordModal onClose={() => setIsChangePasswordOpen(false)} />}
        </div>
    );
};

export default Profile;
