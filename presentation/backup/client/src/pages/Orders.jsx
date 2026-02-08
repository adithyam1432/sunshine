import React, { useEffect, useState } from 'react';
import { useDB } from '../db/DatabaseContext';

const Orders = () => {
    const [transactions, setTransactions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const { runQuery } = useDB();

    useEffect(() => {
        const load = async () => {
            try {
                // Join to get item details
                const sql = `
                    SELECT t.id, stu.name as student_name, stu.class as student_class, 
                           t.quantity, t.date, 
                           p.name as item_name, s.size
                    FROM transactions t
                    JOIN students stu ON t.student_id = stu.id
                    JOIN stock s ON t.stock_id = s.id
                    JOIN products p ON s.product_id = p.id
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

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.student_class.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMonth = t.date.startsWith(selectedMonth);
        return matchesSearch && matchesMonth;
    });

    const handleShare = async () => {
        try {
            const escape = (str) => typeof str === 'string' ? str.replace(/"/g, '""') : str;
            const headers = 'Date,Student Name,Class,Item,Size,Quantity';
            const rows = filteredTransactions.map(t =>
                `"${new Date(t.date).toLocaleString()}","${escape(t.student_name)}","${escape(t.student_class)}","${escape(t.item_name)}","${escape(t.size || '')}",${t.quantity}`
            );
            const csvContent = [headers, ...rows].join("\n");

            const fileName = `orders_${selectedMonth}.csv`;

            // Mobile Implementation
            if (window.Capacitor) {
                const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
                const { Share } = await import('@capacitor/share');

                // Write file to cache
                await Filesystem.writeFile({
                    path: fileName,
                    data: csvContent,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8
                });

                // Get full path (uri)
                const fileUri = await Filesystem.getUri({
                    directory: Directory.Cache,
                    path: fileName
                });

                // Share it
                await Share.share({
                    title: 'Export Orders',
                    text: `Order History for ${selectedMonth}`,
                    url: fileUri.uri,
                    dialogTitle: 'Share CSV'
                });
            } else {
                // Web Fallback
                const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", fileName);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error("Share failed:", err);
            alert("Share failed: " + err.message);
        }
    };

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1>Completed Orders</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        style={{ width: 'auto' }}
                    />
                    <button onClick={handleShare} className="btn btn-primary" style={{ width: 'auto' }}>📤 Share History</button>
                    <input
                        placeholder="Search Student..."
                        style={{ maxWidth: '200px' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem' }}>Date</th>
                            <th style={{ padding: '1rem' }}>Student Name</th>
                            <th style={{ padding: '1rem' }}>Class</th>
                            <th style={{ padding: '1rem' }}>Item</th>
                            <th style={{ padding: '1rem' }}>Size</th>
                            <th style={{ padding: '1rem' }}>Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem' }}>{new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString()}</td>
                                <td style={{ padding: '1rem', fontWeight: '500' }}>{t.student_name}</td>
                                <td style={{ padding: '1rem' }}>{t.student_class}</td>
                                <td style={{ padding: '1rem' }}>{t.item_name}</td>
                                <td style={{ padding: '1rem' }}>{t.size || '-'}</td>
                                <td style={{ padding: '1rem' }}>{t.quantity}</td>
                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-dim)' }}>No orders found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Orders;
