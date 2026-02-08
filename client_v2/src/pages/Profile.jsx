import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChangePasswordModal from '../components/ChangePasswordModal';
import SecuritySettingsModal from '../components/SecuritySettingsModal';
import { useDB } from '../db/DatabaseContext';
import logoutIcon from '../assets/icons/logout.png';
import exportIcon from '../assets/icons/export.png';
import changePasswordIcon from '../assets/icons/change_password.png';


import DataExportPreview from '../components/DataExportPreview';

const Profile = () => {
    const navigate = useNavigate();
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isSecuritySettingsOpen, setIsSecuritySettingsOpen] = useState(false);
    const [showExportPreview, setShowExportPreview] = useState(false); // New state
    const user = JSON.parse(localStorage.getItem('user'));

    // Use the context to run queries
    const { runQuery, beginTransaction, commitTransaction, rollbackTransaction } = useDB();

    // Logout Confirmation State
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const onLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage')); // Notify app
        navigate('/login');
    };

    // ... (Export Data Logic remains the same)
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

    // Implement Import Data
    const handleImportData = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Validation: Check for key tables
                if (!data.users || !data.stock || !data.transactions) {
                    alert("Invalid Backup File format.");
                    return;
                }

                if (!window.confirm("This will REPLACE all current data with the backup. Are you sure?")) {
                    return;
                }

                // Restore Data
                await beginTransaction();
                try {
                    const tables = ['stock_logs', 'transactions', 'stock', 'products', 'categories', 'students', 'users'];

                    // 1. Clear Tables (Order matters for Foreign Keys)
                    for (const table of tables) {
                        // Check if table exists to avoid errors if schema changed
                        await runQuery(`DELETE FROM ${table}`);
                        // Note: In strict FK mode, order is crucial. Delete detail first (logs, trans) then master (stock, prod).
                    }

                    // 2. Insert Data (Reverse order: Master first)
                    // Users
                    if (data.users) {
                        for (const u of data.users) {
                            await runQuery("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)", [u.id, u.username, u.password, u.role]);
                        }
                    }
                    // Categories
                    if (data.categories) {
                        for (const c of data.categories) {
                            await runQuery("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", [c.id, c.name, c.type]);
                        }
                    }
                    // Students
                    if (data.students) {
                        for (const s of data.students) {
                            await runQuery("INSERT INTO students (id, name, class, section, contact) VALUES (?, ?, ?, ?, ?)", [s.id, s.name, s.class, s.section, s.contact]);
                        }
                    }
                    // Products
                    if (data.products) {
                        for (const p of data.products) {
                            await runQuery("INSERT INTO products (id, category_id, name, description, image) VALUES (?, ?, ?, ?, ?)", [p.id, p.category_id, p.name, p.description, p.image]);
                        }
                    }
                    // Stock
                    if (data.stock) {
                        for (const s of data.stock) {
                            await runQuery("INSERT INTO stock (id, product_id, size, quantity, min_quantity) VALUES (?, ?, ?, ?, ?)", [s.id, s.product_id, s.size, s.quantity, s.min_quantity]);
                        }
                    }
                    // Transactions
                    if (data.transactions) {
                        for (const t of data.transactions) {
                            await runQuery("INSERT INTO transactions (id, student_id, stock_id, quantity, date, type, note) VALUES (?, ?, ?, ?, ?, ?, ?)", [t.id, t.student_id, t.stock_id, t.quantity, t.date, t.type, t.note]);
                        }
                    }
                    // Logs (if present)
                    if (data.stock_logs) {
                        for (const l of data.stock_logs) {
                            // Handle schema diffs if necessary
                            await runQuery("INSERT INTO stock_logs (id, category_name, item_name, size, quantity, action, date) VALUES (?, ?, ?, ?, ?, ?, ?)", [l.id, l.category_name, l.item_name, l.size, l.quantity, l.action, l.date]);
                        }
                    }

                    await commitTransaction();
                    alert("Data Imported Successfully! Restarting app...");
                    window.location.reload();

                } catch (err) {
                    await rollbackTransaction();
                    console.error(err);
                    alert("Import Failed during DB Write: " + err.message);
                }

            } catch (err) {
                console.error(err);
                alert("Failed to parse file: " + err.message);
            }
        };
        reader.readAsText(file);
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
                        style={{ border: '1px solid var(--input-border)', background: 'var(--bg-input)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={() => setShowExportPreview(true)}
                    >
                        <img src={exportIcon} alt="export" style={{ width: '20px', height: '20px' }} />
                        Export Data (Backup)
                    </button>

                    {/* Import Data */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImportData}
                            style={{
                                position: 'absolute', opacity: 0, width: '100%', height: '100%',
                                left: 0, top: 0, cursor: 'pointer', zIndex: 10
                            }}
                        />
                        <button
                            className="btn"
                            style={{ width: '100%', border: '1px solid var(--input-border)', background: 'var(--bg-input)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>📥</span> Import Data (Restore)
                        </button>
                    </div>

                    <button
                        className="btn"
                        style={{ border: '1px solid var(--input-border)', background: 'var(--bg-input)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={() => setIsSecuritySettingsOpen(true)}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🛡️</span> Manage Security Questions
                    </button>

                    <button
                        className="btn"
                        style={{ border: '1px solid var(--input-border)', background: 'var(--bg-input)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={() => setIsChangePasswordOpen(true)}
                    >
                        <img src={changePasswordIcon} alt="change password" style={{ width: '20px', height: '20px' }} />
                        Change Password
                    </button>

                    <button
                        className="btn"
                        style={{ background: '#ef4444', color: 'white', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onClick={onLogoutClick}
                    >
                        <img src={logoutIcon} alt="logout" style={{ width: '20px', height: '20px', filter: 'brightness(0) invert(1)' }} />
                        Logout
                    </button>
                </div>
            </div>

            {showExportPreview && (
                <DataExportPreview
                    onClose={() => setShowExportPreview(false)}
                    onConfirm={() => {
                        handleExportData();
                        setShowExportPreview(false);
                    }}
                />
            )}

            {isChangePasswordOpen && (
                <ChangePasswordModal
                    user={user}
                    onClose={() => setIsChangePasswordOpen(false)}
                />
            )}

            {isSecuritySettingsOpen && (
                <SecuritySettingsModal
                    user={user}
                    onClose={() => setIsSecuritySettingsOpen(false)}
                />
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
                    padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem' }}>Log Out?</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Are you sure you want to log out?</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowLogoutConfirm(false)} className="btn" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>Cancel</button>
                            <button onClick={confirmLogout} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none' }}>Log Out</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
