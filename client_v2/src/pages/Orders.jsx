import React, { useEffect, useState } from 'react';
import { useDB } from '../db/DatabaseContext';
import { handleExport } from '../utils/exportHelper.js';
import { formatDate } from '../utils/dateHelper.js';
import PreviewModal from '../components/PreviewModal';
import EditTransactionModal from '../components/EditTransactionModal';
import shareIcon from '../assets/icons/share.png';
import editIcon from '../assets/icons/edit_item.png';
import deleteIcon from '../assets/icons/delete_item.png';

const Orders = () => {
    const [transactions, setTransactions] = useState([]); // Raw flat data
    const [groupedTransactions, setGroupedTransactions] = useState([]); // Display data
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeTab, setActiveTab] = useState('Uniform'); // 'Uniform' | 'Kit'

    const { runQuery } = useDB();

    // Reload Trigger
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const load = async () => {
            try {
                // Join to get item details AND category
                const sql = `
                    SELECT t.id, stu.id as student_id, stu.name as student_name, stu.class as student_class, 
                           t.quantity, t.stock_id, t.date, 
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
    }, [reloadKey]);

    // Grouping Logic
    useEffect(() => {
        if (!transactions.length) {
            setGroupedTransactions([]);
            return;
        }

        const groups = {};

        transactions.forEach(t => {
            // Create a unique key for the "Order" (same student, same time)
            const key = `${t.student_id}_${t.date}`;

            if (!groups[key]) {
                groups[key] = {
                    id: key, // unique key for React
                    date: t.date,
                    student_name: t.student_name,
                    student_class: t.student_class,
                    category_name: t.category_name,
                    items: [] // List of items in this order
                };
            }

            // Add item detail
            groups[key].items.push({
                id: t.id,
                stock_id: t.stock_id,
                name: t.item_name,
                size: t.size,
                quantity: t.quantity,
                category: t.category_name
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

    // Modal State
    const [previewModal, setPreviewModal] = useState({ show: false, title: '', fileName: '', data: [], columns: [] });
    const [editingTx, setEditingTx] = useState(null);

    const openPreviewModal = (title, fileName, data, columns) => {
        setPreviewModal({ show: true, title, fileName, data, columns });
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
                date: formatDate(t.date),
                student_name: t.student_name,
                student_class: t.student_class,
                item_names: relevantItems.map(i => `${i.name}${i.size ? ` (${i.size})` : ''}`).join(', '),
                item_qtys: relevantItems.map(i => i.quantity).join(', ')
            };
        }).filter(r => r !== null);

        openPreviewModal(`${activeTab} Orders`, `orders_${activeTab}_${startDate || 'all'}_to_${endDate || 'all'}`, data, columns);
    };

    // --- Action Handlers ---

    const handleDelete = async (txId, stockId, qty) => {
        if (!window.confirm("Are you sure you want to delete this record?\nStock will be returned to inventory.")) return;

        try {
            // 1. Return Stock
            await runQuery(`UPDATE stock SET quantity = quantity + ? WHERE id = ?`, [qty, stockId]);

            // 2. Delete Transaction
            await runQuery(`DELETE FROM transactions WHERE id = ?`, [txId]);

            // 3. Keep Log (Optional, maybe log the reversal? For now, no log specified, just cleanup)
            // Ideally we insert a "restock" log in stock_logs, but let's keep it simple.

            setReloadKey(prev => prev + 1);
        } catch (err) {
            console.error(err);
            alert("Delete failed: " + err.message);
        }
    };

    const handleUpdate = async (txId, newQty, oldQty, stockId) => {
        const diff = newQty - oldQty;
        if (diff === 0) {
            setEditingTx(null);
            return;
        }

        try {
            // Check stock availability if taking MORE
            if (diff > 0) {
                const stock = await runQuery("SELECT quantity FROM stock WHERE id = ?", [stockId]);
                if (stock.length === 0) throw new Error("Stock item not found");
                if (stock[0].quantity < diff) {
                    alert(`Not enough stock to increase quantity. Available: ${stock[0].quantity}`);
                    return;
                }
            }

            // 1. Adjust Stock (Inverse of diff: if diff is +2 (took 2 more), stock should be -2)
            await runQuery(`UPDATE stock SET quantity = quantity - ? WHERE id = ?`, [diff, stockId]);

            // 2. Update Transaction
            await runQuery(`UPDATE transactions SET quantity = ? WHERE id = ?`, [newQty, txId]);

            setEditingTx(null);
            setReloadKey(prev => prev + 1);
        } catch (err) {
            console.error(err);
            alert("Update failed: " + err.message);
        }
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
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Items & Actions</th>
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
                                        {formatDate(t.date).split(' ').map((part, i) => <div key={i}>{part}</div>)}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: '600' }}>{t.student_name}</td>
                                    <td style={{ padding: '1rem' }}>{t.student_class}</td>
                                    <td style={{ padding: '1rem' }}>
                                        {relevantItems.map((item, i) => (
                                            <div key={i} style={{ marginBottom: relevantItems.length > 1 ? '10px' : '0', borderBottom: relevantItems.length > 1 && i !== relevantItems.length - 1 ? '1px dashed var(--border)' : 'none', paddingBottom: '5px' }}>
                                                <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                                    {item.name} {item.size ? `(${item.size})` : ''}
                                                    <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>x{item.quantity}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => setEditingTx(item)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }} title="Edit">
                                                        <img src={editIcon} alt="Edit" style={{ width: '14px', height: '14px' }} /> Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id, item.stock_id, item.quantity)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#ef4444' }} title="Delete">
                                                        <img src={deleteIcon} alt="Delete" style={{ width: '14px', height: '14px' }} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No {activeTab} orders found for this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Preview Modal */}
            <PreviewModal
                show={previewModal.show}
                title={previewModal.title}
                data={previewModal.data}
                columns={previewModal.columns}
                onCancel={() => setPreviewModal({ ...previewModal, show: false })}
                onConfirm={() => {
                    handleExport(previewModal.data, previewModal.columns, previewModal.fileName, previewModal.title);
                    setPreviewModal({ ...previewModal, show: false });
                }}
            />

            {/* Edit Transaction Modal */}
            {editingTx && (
                <EditTransactionModal
                    transaction={editingTx}
                    onClose={() => setEditingTx(null)}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    );
};

export default Orders;
