import React, { useState, useEffect } from 'react';
import { useDB } from '../db/DatabaseContext';
import { Capacitor } from '@capacitor/core';
import { handleExport } from '../utils/exportHelper';

import uniformIcon from '../assets/icons/uniform_tab.png';
import kitIcon from '../assets/icons/kit_tab.png';
import lowStockIcon from '../assets/icons/low_stock.png';
import shareIcon from '../assets/icons/share.png';

const Dashboard = () => {
    const { runQuery } = useDB();
    const [stats, setStats] = useState({ lowStockCount: 0 });
    const [groupedInventory, setGroupedInventory] = useState([]);
    const [fullInventory, setFullInventory] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [notification, setNotification] = useState('');

    // Export Modal State
    const [exportModal, setExportModal] = useState({ show: false, title: '', fileName: '', data: [], columns: [] });

    // Tabs: 'uniform', 'kit', 'lowstock'
    const [activeTab, setActiveTab] = useState('uniform');
    // Drill-down for Uniform
    const [selectedUniformItem, setSelectedUniformItem] = useState(null);

    useEffect(() => {
        const loadDashboard = async () => {
            // 1. Grouped Inventory
            const inventoryQuery = `
                SELECT p.name, c.name as category, s.size, SUM(s.quantity) as total 
                FROM stock s
                JOIN products p ON s.product_id = p.id
                JOIN categories c ON p.category_id = c.id
                GROUP BY p.name, s.size
             `;
            const inventory = await runQuery(inventoryQuery);
            setGroupedInventory(inventory);
            setFullInventory(inventory);

            // 2. Stats
            const low = inventory.filter(i => i.total <= 15);
            setStats({ lowStockCount: low.length });

            // Notification
            if (low.length > 0) {
                setNotification(`⚠️ Warning: ${low.length} items are running low!`);
            } else {
                setNotification('');
            }

            // 3. Recent Activity (Grouped)
            const actQuery = `
                SELECT t.id, t.student_id, t.quantity, t.date, s.name as student_name, s.class, p.name as item_name, st.size
                FROM transactions t
                JOIN students s ON t.student_id = s.id
                JOIN stock st ON t.stock_id = st.id
                JOIN products p ON st.product_id = p.id
                ORDER BY t.date DESC
                LIMIT 50 
             `;
            const rawActivity = await runQuery(actQuery);

            // Grouping Logic (Same as Orders.jsx)
            const activityGroups = {};
            rawActivity.forEach(t => {
                const key = `${t.student_id}_${t.date}`;
                if (!activityGroups[key]) {
                    activityGroups[key] = {
                        id: key,
                        date: t.date,
                        student_name: t.student_name,
                        class: t.class,
                        items: []
                    };
                }
                activityGroups[key].items.push({
                    name: t.item_name,
                    size: t.size,
                    quantity: t.quantity
                });
            });
            // Convert to array, sort desc, take top 10
            setRecentActivity(Object.values(activityGroups).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10));
        };

        loadDashboard();
        const interval = setInterval(loadDashboard, 5000);
        return () => clearInterval(interval);
    }, []);

    const openExportModal = (title, fileName, data, columns) => {
        setExportModal({ show: true, title, fileName, data, columns });
    };

    const triggerExport = (type) => {
        const { title, fileName, data, columns } = exportModal;
        handleExport(type, data, columns, fileName, title);
        setExportModal({ ...exportModal, show: false });
    };

    const prepareInventoryReport = () => {
        const columns = [
            { header: 'Category', key: 'category' },
            { header: 'Item Name', key: 'name' },
            { header: 'Size', key: 'size' },
            { header: 'Total Quantity', key: 'total' }
        ];
        // Prepare flat data with nice values
        const data = fullInventory.map(i => ({
            category: i.category,
            name: i.name,
            size: i.size || '-',
            total: i.total
        }));

        openExportModal('Inventory Report', `inventory_report_${Date.now()}`, data, columns);
    };

    // Helper to get unique uniform types
    const getUniformTypes = () => {
        const uniforms = groupedInventory.filter(i => i.category === 'Uniform');
        return [...new Set(uniforms.map(i => i.name))];
    };

    // Get sorted low stock items
    const getLowStockItems = () => {
        return groupedInventory
            .filter(i => i.total <= 15)
            .sort((a, b) => a.name.localeCompare(b.name));
    };

    // --- Stock History Logic ---
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyTab, setHistoryTab] = useState('Uniform'); // 'Uniform' | 'Kit'

    const openHistory = async () => {
        const logs = await runQuery("SELECT * FROM stock_logs ORDER BY date DESC LIMIT 50");
        setHistoryLogs(logs);
        setShowHistoryModal(true);
    };

    const filteredHistory = historyLogs.filter(log => log.category_name === historyTab);

    const handleShareHistory = () => {
        const columns = [
            { header: 'Date', key: 'date' },
            { header: 'Category', key: 'category_name' },
            { header: 'Item', key: 'item_name' },
            { header: 'Size', key: 'size' },
            { header: 'Quantity', key: 'quantity' },
            { header: 'Action', key: 'action' }
        ];

        const data = filteredHistory.map(log => ({
            ...log,
            date: new Date(log.date).toLocaleString(),
            size: log.size || '-'
        }));

        openExportModal(`Stock History - ${historyTab}`, `stock_history_${historyTab}_${Date.now()}`, data, columns);
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            {/* Header / Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                <h1>Overview</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={openHistory} className="btn" style={{ width: 'auto', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        📜 Add Stock History
                    </button>
                    <button onClick={prepareInventoryReport} className="btn btn-primary" style={{ width: 'auto', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={shareIcon} alt="share" style={{ width: '20px', height: '20px' }} />
                        Share Report
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {notification && (
                <div style={{
                    background: '#fee2e2', color: '#b91c1c', padding: '1rem',
                    borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fecaca',
                    fontSize: '0.9rem', fontWeight: '500'
                }}>
                    {notification}
                </div>
            )}

            {/* TABS */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '5px' }}>
                {['uniform', 'kit', 'lowstock'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setSelectedUniformItem(null); }}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '25px',
                            border: 'none',
                            background: activeTab === tab ? 'var(--primary-gradient)' : 'var(--bg-card)',
                            color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            boxShadow: activeTab === tab ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {tab === 'uniform' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src={uniformIcon} alt="uniform" style={{ width: '24px', height: '24px' }} />
                                Uniform
                            </div>
                        )}
                        {tab === 'kit' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src={kitIcon} alt="kit" style={{ width: '24px', height: '24px' }} />
                                Kit
                            </div>
                        )}
                        {tab === 'lowstock' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src={lowStockIcon} alt="low stock" style={{ width: '24px', height: '24px' }} />
                                Low Stock
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            <div style={{ marginBottom: '2rem' }}>

                {/* 1. UNIFORM TAB */}
                {activeTab === 'uniform' && (
                    <>
                        {!selectedUniformItem ? (
                            // LEVEL 1: Item Types buttons
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                                {getUniformTypes().map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedUniformItem(type)}
                                        className="card"
                                        style={{
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.1rem',
                                            fontWeight: '600',
                                            padding: '1.5rem',
                                            cursor: 'pointer',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
                                        }}
                                    >
                                        {/* REMOVED ICON AS REQUESTED */}
                                        {type}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            // LEVEL 2: Drill Down
                            <div>
                                <button
                                    onClick={() => setSelectedUniformItem(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginBottom: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    ⬅ Back to Types
                                </button>
                                <h2 style={{ marginBottom: '1rem' }}>{selectedUniformItem} Inventory</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                                    {groupedInventory
                                        .filter(i => i.name === selectedUniformItem)
                                        .map((item, idx) => (
                                            <div key={idx} className="card" style={{ padding: '1rem', border: item.total === 0 ? '1px dashed var(--text-secondary)' : 'var(--glass-border)' }}>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Size: {item.size}</div>
                                                <div style={{
                                                    fontSize: '1.5rem',
                                                    fontWeight: 'bold',
                                                    color: item.total === 0 ? 'var(--text-secondary)' : (item.total <= 15 ? '#ef4444' : 'var(--text-primary)')
                                                }}>
                                                    {item.total === 0 ? 'Out of Stock' : item.total}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* 2. KIT TAB */}
                {activeTab === 'kit' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                        {groupedInventory.filter(i => i.category === 'Kit').map((item, idx) => (
                            <div key={idx} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎒</div>
                                <h3 style={{ margin: '0 0 0.5rem' }}>{item.name}</h3>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: item.total <= 15 ? '#ef4444' : 'var(--primary)' }}>
                                    {item.total}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. LOW STOCK TAB */}
                {activeTab === 'lowstock' && (
                    <div className="card" style={{ padding: 0 }}>
                        {getLowStockItems().length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>All Good! No low stock items.</div>
                        ) : (
                            getLowStockItems().map((item, idx) => (
                                <div key={idx} style={{
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            {item.category} {item.size ? `- Size ${item.size}` : ''}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '1.1rem' }}>
                                        {item.total}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>

            {/* Recent Activity (Same as before) */}
            <h2 style={{ marginBottom: '1rem' }}>Recent Activity</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {recentActivity.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions yet.</div>
                ) : (
                    recentActivity.map((group, idx) => (
                        <div key={group.id} style={{
                            padding: '1rem',
                            borderBottom: idx !== recentActivity.length - 1 ? '1px solid var(--border)' : 'none',
                            display: 'flex', alignItems: 'center', gap: '1rem'
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-input)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                            }}>
                                📦
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600' }}>{group.student_name} <span style={{ fontWeight: 'normal', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({group.class})</span></div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Received {group.items.map(i => `${i.quantity}x ${i.name}${i.size ? ` (${i.size})` : ''}`).join(', ')}
                                </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                {new Date(group.date).toLocaleDateString()}
                                <br />
                                {new Date(group.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Stock History Modal */}
            {showHistoryModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Add Stock History</h2>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button onClick={handleShareHistory} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }} title="Export CSV">
                                    📤
                                </button>
                                <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>✖</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                            <button onClick={() => setHistoryTab('Uniform')} className="btn" style={{ flex: 1, background: historyTab === 'Uniform' ? 'var(--primary)' : 'var(--bg-input)', color: historyTab === 'Uniform' ? 'white' : 'var(--text-primary)' }}>Uniform</button>
                            <button onClick={() => setHistoryTab('Kit')} className="btn" style={{ flex: 1, background: historyTab === 'Kit' ? 'var(--primary)' : 'var(--bg-input)', color: historyTab === 'Kit' ? 'white' : 'var(--text-primary)' }}>Kit</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {filteredHistory.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No history found for {historyTab}</p>
                            ) : (
                                filteredHistory.map(log => (
                                    <div key={log.id} style={{ padding: '10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{log.item_name} {log.size && log.size !== '-' ? `(${log.size})` : ''}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(log.date).toLocaleString()}</div>
                                        </div>
                                        <div style={{ color: 'green', fontWeight: 'bold' }}>+{log.quantity}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Export Choice Modal */}
            {exportModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
                    padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
                        <h3 style={{ margin: 0, textAlign: 'center' }}>Choose Format</h3>
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Export {exportModal.title}</p>

                        <button onClick={() => triggerExport('csv')} className="btn" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px' }}>
                            📄 Export as CSV
                        </button>
                        <button onClick={() => triggerExport('pdf')} className="btn" style={{ background: 'var(--primary)', color: 'white', padding: '12px', border: 'none' }}>
                            📑 Export as PDF
                        </button>

                        <button onClick={() => setExportModal({ ...exportModal, show: false })} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '5px' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
