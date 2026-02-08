import React, { useState, useEffect } from 'react';
import { useDB } from '../db/DatabaseContext';

const DataExportPreview = ({ onClose, onConfirm }) => {
    const { runQuery } = useDB();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const tables = ['users', 'students', 'categories', 'products', 'stock', 'transactions'];
                const counts = {};
                for (const t of tables) {
                    const res = await runQuery(`SELECT count(*) as count FROM ${t}`);
                    counts[t] = res[0].count;
                }
                setStats(counts);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [runQuery]);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
            padding: '20px'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <h3 style={{ marginTop: 0 }}>Ready to Export?</h3>
                <p style={{ color: 'var(--text-secondary)' }}>You are about to backup the following data:</p>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>Loading stats...</div>
                ) : (
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                        marginBottom: '1.5rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: '12px'
                    }}>
                        <div style={{ fontWeight: 'bold' }}>📦 Stock Items:</div><div>{stats?.stock}</div>
                        <div style={{ fontWeight: 'bold' }}>🔄 Transactions:</div><div>{stats?.transactions}</div>
                        <div style={{ fontWeight: 'bold' }}>🎒 Products:</div><div>{stats?.products}</div>
                        <div style={{ fontWeight: 'bold' }}>👨‍🎓 Students:</div><div>{stats?.students}</div>
                        <div style={{ fontWeight: 'bold' }}>🔐 Users:</div><div>{stats?.users}</div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onClose} className="btn" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>Cancel</button>
                    <button onClick={onConfirm} className="btn btn-primary" disabled={loading}>
                        Generate Backup File
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataExportPreview;
