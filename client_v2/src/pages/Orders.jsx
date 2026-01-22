import React, { useEffect, useState } from 'react';
import { useDB } from '../db/DatabaseContext';
import { handleExport } from '../utils/exportHelper';
import shareIcon from '../assets/icons/share.png';

const Orders = () => {
    const [transactions, setTransactions] = useState([]); // Raw flat data
    const [groupedTransactions, setGroupedTransactions] = useState([]); // Display data
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeTab, setActiveTab] = useState('Uniform'); // 'Uniform' | 'Kit'

    const { runQuery } = useDB();

    useEffect(() => {
        const load = async () => {
            try {
                // Join to get item details AND category
                const sql = `
                    SELECT t.id, stu.id as student_id, stu.name as student_name, stu.class as student_class, 
                           t.quantity, t.date, 
                           p.name as item_name, s.size,
                           c.name as category_name
                    FROM transactions t
                    JOIN students stu ON t.student_id = stu.id
                    JOIN stock s ON t.stock_id = s.id
                    JOIN products p ON s.product_id = p.id
                    JOIN categories c ON p.category_id = c.id
                    ORDER BY t.date DESC
                `;
                const data = await runQuery(sql);
                setTransactions(data);
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, []);

    // Grouping Logic
    useEffect(() => {
        if (!transactions.length) {
            setGroupedTransactions([]);
            return;
        }

        const groups = {};

        transactions.forEach(t => {
            // Create a unique key for the "Order" (same student, same time)
            // Using ISO string up to seconds to be safe, or just the raw date string if it comes from our new Batch Distribute
            const key = `${t.student_id}_${t.date}`;

            if (!groups[key]) {
                groups[key] = {
                    id: key, // unique key for React
                    date: t.date,
                    student_name: t.student_name,
                    student_class: t.student_class,
                    category_name: t.category_name, // Assuming mixed categories don't happen often in batch, or we just take the first one
                    items: [] // List of items in this order
                };
            }

            // Add item detail
            groups[key].items.push({
                name: t.item_name,
                size: t.size,
                quantity: t.quantity,
                category: t.category_name // track category per item if needed
            });
        });

        // Convert back to array and sort
        const groupedArray = Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
        setGroupedTransactions(groupedArray);

    }, [transactions]);

    const filteredTransactions = groupedTransactions.filter(t => {
        // Search
        const matchesSearch = t.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.student_class.toLowerCase().includes(searchTerm.toLowerCase());

        // Date Range
        let matchesDate = true;
        if (startDate) {
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            matchesDate = matchesDate && new Date(t.date).setHours(0, 0, 0, 0) >= start;
        }
        if (endDate) {
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            matchesDate = matchesDate && new Date(t.date).setHours(0, 0, 0, 0) <= end;
        }

        // Tab Filter: Check if ANY item in the order matches the Active Tab
        const matchesTab = t.items.some(item => item.category === activeTab);

        return matchesSearch && matchesDate && matchesTab;
    });

    const setMonthRange = (monthsBack) => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - monthsBack);
        start.setDate(1); // Start of that month

        setEndDate(new Date().toISOString().split('T')[0]); // End is today
        setStartDate(start.toISOString().split('T')[0]);
    };

    const formatDateTime = (isoString) => {
        const date = new Date(isoString);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${time} of ${day}-${month}-${year}`;
    };

    const [exportModal, setExportModal] = useState({ show: false, title: '', fileName: '', data: [], columns: [] });

    const openExportModal = (title, fileName, data, columns) => {
        setExportModal({ show: true, title, fileName, data, columns });
    };

    const triggerExport = (type) => {
        const { title, fileName, data, columns } = exportModal;
        handleExport(type, data, columns, fileName, title);
        setExportModal({ ...exportModal, show: false });
    };

    const handleShare = () => {
        const columns = [
            { header: 'Date', key: 'date' },
            { header: 'Student', key: 'student_name' },
            { header: 'Class', key: 'student_class' },
            { header: 'Items', key: 'item_names' },
            { header: 'Quantities', key: 'item_qtys' }
        ];

        const data = filteredTransactions.map(t => {
            const relevantItems = t.items.filter(i => i.category === activeTab);
            if (relevantItems.length === 0) return null;

            return {
                date: formatDateTime(t.date),
                student_name: t.student_name,
                student_class: t.student_class,
                item_names: relevantItems.map(i => `${i.name}${i.size ? ` (${i.size})` : ''}`).join(', '),
                item_qtys: relevantItems.map(i => i.quantity).join(', ')
            };
        }).filter(r => r !== null);

        openExportModal(`${activeTab} Orders`, `orders_${activeTab}_${startDate || 'all'}_to_${endDate || 'all'}`, data, columns);
    };

    return (
        <div className="container" style={{ paddingBottom: '90px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1>History</h1>

                {/* Tabs */}
                <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                    {['Uniform', 'Kit'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                                color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: '1rem', width: '100%', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>📅 Date Filter</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="date"
                        lang="en-GB"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #000', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    />
                    <span>to</span>
                    <input
                        type="date"
                        lang="en-GB"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #000', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    />

                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
                    <button onClick={() => setMonthRange(0)} className="btn" style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border)', width: 'auto', color: 'var(--text-primary)' }}>This Month</button>
                    <button onClick={() => setMonthRange(1)} className="btn" style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border)', width: 'auto', color: 'var(--text-primary)' }}>Last Month</button>
                    <button onClick={() => setMonthRange(3)} className="btn" style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border)', width: 'auto', color: 'var(--text-primary)' }}>Last 3 Months</button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '10px' }}>
                    <button
                        onClick={handleShare}
                        className="btn btn-primary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <img src={shareIcon} alt="share" style={{ width: '20px', height: '20px' }} />
                        Export {activeTab}
                    </button>
                    <input
                        placeholder="Search Student..."
                        style={{ flex: 1 }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Date</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Student</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Class</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Items</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(t => {
                            // Only show items relevant to the tab
                            const relevantItems = t.items.filter(i => i.category === activeTab);
                            // If a multi-category order happens, but this tab has no items, skip row
                            if (relevantItems.length === 0) return null;

                            return (
                                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {formatDateTime(t.date).split(' of ').map((part, i) => <div key={i}>{part}</div>)}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: '600' }}>{t.student_name}</td>
                                    <td style={{ padding: '1rem' }}>{t.student_class}</td>
                                    <td style={{ padding: '1rem' }}>
                                        {relevantItems.map((item, i) => (
                                            <div key={i}>{item.name} {item.size ? `(${item.size})` : ''}</div>
                                        ))}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {relevantItems.map((item, i) => (
                                            <div key={i}>{item.quantity}</div>
                                        ))}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No {activeTab} orders found for this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
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
        </div >
    );
};

export default Orders;
