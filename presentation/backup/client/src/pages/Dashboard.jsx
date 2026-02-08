import React, { useEffect, useState } from 'react';
import { useDB } from '../db/DatabaseContext';
import EditItemModal from '../components/EditItemModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const Dashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const { runQuery, isReady } = useDB();

    useEffect(() => {
        if (isReady) {
            fetchInventory();
            fetchTransactions();
        }
    }, [isReady]);

    const fetchInventory = async () => {
        try {
            // Join Stock -> Products -> Categories
            const sql = `
                SELECT s.id, p.name, c.name as category, s.size, s.quantity, s.price 
                FROM stock s 
                JOIN products p ON s.product_id = p.id 
                JOIN categories c ON p.category_id = c.id
            `;
            const data = await runQuery(sql);
            setInventory(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTransactions = async () => {
        try {
            // Join Transactions -> Students, Stock -> Products
            const sql = `
                SELECT t.id, stu.name as student_name, stu.class as student_class, 
                       t.quantity, t.date, p.name as item_name
                FROM transactions t
                JOIN students stu ON t.student_id = stu.id
                JOIN stock s ON t.stock_id = s.id
                JOIN products p ON s.product_id = p.id
                ORDER BY t.date DESC
                LIMIT 50
            `;
            const data = await runQuery(sql);
            setTransactions(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveItem = async (id, quantity, price) => {
        try {
            await runQuery("UPDATE stock SET quantity = ?, price = ? WHERE id = ?", [quantity, price, id]);
            fetchInventory();
            setEditingItem(null);
        } catch (err) {
            console.error(err);
            alert("Failed to update item");
        }
    };

    const handleDeleteItem = async (id) => {
        try {
            await runQuery("DELETE FROM stock WHERE id = ?", [id]);
            fetchInventory();
            setEditingItem(null);
        } catch (err) {
            console.error(err);
            alert("Failed to delete item");
        }
    };

    const handleShareCSV = async () => {
        const escape = (str) => typeof str === 'string' ? str.replace(/"/g, '""') : str;
        const headers = 'ID,Name,Category,Size,Quantity,Price';
        const rows = inventory.map(item =>
            `${item.id},"${escape(item.name)}","${escape(item.category)}","${escape(item.size || '')}",${item.quantity},${item.price}`
        );
        const csvContent = [headers, ...rows].join("\n");
        const fileName = 'inventory_stock.csv';

        try {
            // Write file to cache
            await Filesystem.writeFile({
                path: fileName,
                data: csvContent,
                directory: Directory.Cache,
                encoding: Encoding.UTF8,
            });

            // Get URI
            const uriResult = await Filesystem.getUri({
                directory: Directory.Cache,
                path: fileName,
            });

            // Share
            await Share.share({
                title: 'Inventory Stock Export',
                text: 'Here is the current inventory stock list.',
                url: uriResult.uri,
                dialogTitle: 'Share Inventory CSV',
            });
        } catch (err) {
            console.error("Share failed:", err);
            // Fallback for browser testing (if needed)
            alert("Sharing is supported on mobile. " + err.message);
        }
    };

    const filteredInventory = showLowStockOnly
        ? inventory.filter(i => i.quantity <= 15)
        : inventory;

    return (
        <div className="container" style={{ paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1>Inventory Status</h1>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                        className={`btn ${showLowStockOnly ? 'btn-primary' : ''}`}
                        style={{ width: 'auto', background: showLowStockOnly ? 'var(--primary)' : 'var(--bg-card)', border: '1px solid var(--border)', color: showLowStockOnly ? 'white' : 'var(--text-primary)' }}
                    >
                        {showLowStockOnly ? 'Show All' : '⚠️ Low Stock'}
                    </button>
                    <button onClick={handleShareCSV} className="btn btn-primary" style={{ width: 'auto' }}>📤 Share</button>
                    <button onClick={() => setShowPasswordModal(true)} className="btn" style={{ width: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>🔑 Password</button>
                </div>
            </div>

            <div className="dashboard-grid">
                {filteredInventory.map(item => {
                    const isLowStock = item.quantity <= 15;
                    return (
                        <div key={item.id} className="dashboard-card" onClick={() => setEditingItem(item)} style={{ cursor: 'pointer' }}>
                            {/* Low Stock Dot */}
                            {isLowStock && (
                                <div style={{
                                    position: 'absolute', top: '12px', right: '12px',
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    backgroundColor: '#ef4444', boxShadow: '0 0 8px #ef4444'
                                }} title="Low Stock (<= 15)"></div>
                            )}

                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '600' }}>{item.name}</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    {item.category} {item.size ? `- ${item.size}` : ''}
                                </p>
                            </div>

                            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--primary)', lineHeight: 1 }}>
                                {item.quantity}
                            </div>
                        </div>
                    );
                })}
            </div>

            {editingItem && (
                <EditItemModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSaveItem}
                    onDelete={handleDeleteItem}
                />
            )}

            {showPasswordModal && (
                <ChangePasswordModal
                    onClose={() => setShowPasswordModal(false)}
                />
            )}

            <h2 style={{ margin: '3rem 0 1rem' }}>Recent Activity</h2>
            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem' }}>Date</th>
                            <th style={{ padding: '1rem' }}>Student</th>
                            <th style={{ padding: '1rem' }}>Class</th>
                            <th style={{ padding: '1rem' }}>Item</th>
                            <th style={{ padding: '1rem' }}>Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem' }}>{new Date(t.date).toLocaleDateString()}</td>
                                <td style={{ padding: '1rem' }}>{t.student_name}</td>
                                <td style={{ padding: '1rem' }}>{t.student_class}</td>
                                <td style={{ padding: '1rem' }}>{t.item_name}</td>
                                <td style={{ padding: '1rem' }}>{t.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard;
