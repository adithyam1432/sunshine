import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDB } from '../db/DatabaseContext';

const Distribute = () => {
    const navigate = useNavigate();
    const { runQuery } = useDB();

    // Data State
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [stockVariants, setStockVariants] = useState([]);
    const [students, setStudents] = useState([]); // Search results

    // Selection State
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedStockId, setSelectedStockId] = useState(''); // The specific physical item

    // Student State
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [newStudentClass, setNewStudentClass] = useState('1st Standard'); // For creating new
    const [showStudentForm, setShowStudentForm] = useState(false);

    // Transaction State
    const [quantity, setQuantity] = useState(1);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Initial Load (Categories)
    useEffect(() => {
        const load = async () => {
            try {
                const cats = await runQuery("SELECT * FROM categories");
                setCategories(cats);
                if (cats.length > 0) setSelectedCategory(cats[0].id);
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, []);

    // Load Products when Category changes
    useEffect(() => {
        const loadProducts = async () => {
            if (!selectedCategory) return;
            try {
                const prods = await runQuery("SELECT * FROM products WHERE category_id = ?", [selectedCategory]);
                setProducts(prods);
                setStockVariants([]);
                setSelectedProduct('');
                setSelectedStockId('');
            } catch (err) { console.error(err); }
        };
        loadProducts();
    }, [selectedCategory]);

    // Load Stock when Product changes
    useEffect(() => {
        const loadStock = async () => {
            if (!selectedProduct) return;
            try {
                const stock = await runQuery("SELECT * FROM stock WHERE product_id = ?", [selectedProduct]);
                setStockVariants(stock);
                setSelectedStockId('');
            } catch (err) { console.error(err); }
        };
        loadStock();
    }, [selectedProduct]);

    // Search Students Debounce
    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (studentSearch.length > 1 && !selectedStudentId) {
                try {
                    const res = await runQuery(
                        `SELECT * FROM students WHERE name LIKE ? LIMIT 5`,
                        [`%${studentSearch}%`]
                    );
                    setStudents(res);
                } catch (err) { console.error(err); }
            } else {
                setStudents([]);
            }
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [studentSearch, selectedStudentId]);

    // Handlers
    const handleStudentSelect = (student) => {
        setStudentSearch(`${student.name} (${student.class})`);
        setSelectedStudentId(student.id);
        setStudents([]); // Hide list
        setShowStudentForm(false);
    };

    const handleCreateStudent = async () => {
        if (!studentSearch || !newStudentClass) return;
        try {
            // Check duplicate
            const exists = await runQuery("SELECT id FROM students WHERE name = ? AND class = ?", [studentSearch, newStudentClass]);
            if (exists.length > 0) {
                handleStudentSelect({ id: exists[0].id, name: studentSearch, class: newStudentClass });
                return;
            }

            const res = await runQuery(
                "INSERT INTO students (name, class) VALUES (?, ?) RETURNING id",
                [studentSearch, newStudentClass]
            );
            // Fallback for returning id logic if needed
            const newId = res.length > 0 ? res[0].id : (await runQuery("SELECT id FROM students WHERE name = ?", [studentSearch]))[0].id;

            handleStudentSelect({ id: newId, name: studentSearch, class: newStudentClass });
            setMessage("New Student Created!");
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            console.error(err);
            setMessage("Error creating student");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStudentId || !selectedStockId) {
            setMessage("Please select a valid Student and Item");
            return;
        }

        const selectedStockItem = stockVariants.find(s => s.id == selectedStockId);
        if (!selectedStockItem || quantity > selectedStockItem.quantity) {
            setMessage(`Insufficient Stock (Available: ${selectedStockItem?.quantity || 0})`);
            return;
        }

        try {
            setLoading(true);
            const qty = parseInt(quantity);

            // 1. Deduct Stock
            await runQuery("UPDATE stock SET quantity = quantity - ? WHERE id = ?", [qty, selectedStockId]);

            // 2. Add Transaction
            await runQuery(
                "INSERT INTO transactions (student_id, stock_id, quantity) VALUES (?, ?, ?)",
                [selectedStudentId, selectedStockId, qty]
            );

            // 3. Refresh Local Stock State
            const updatedStock = await runQuery("SELECT * FROM stock WHERE product_id = ?", [selectedProduct]);
            setStockVariants(updatedStock);

            setMessage("Distribution Successful!");
            setQuantity(1);
            setLoading(false);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error(err);
            setMessage("Transaction Failed: " + err.message);
            setLoading(false);
        }
    };

    // Calculate dynamic helper text
    const currentStock = stockVariants.find(s => s.id == selectedStockId)?.quantity || 0;

    return (
        <div className="container">
            <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Distribute Item</h2>
                {message && <p style={{ color: message.includes('Failed') || message.includes('Error') ? 'red' : 'green', background: '#f0fdf4', padding: '1rem', borderRadius: '8px' }}>{message}</p>}

                <div className="form-group" style={{ position: 'relative' }}>
                    <label>Student Search</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            value={studentSearch}
                            onChange={(e) => {
                                setStudentSearch(e.target.value);
                                setSelectedStudentId(null); // Reset selection on edit
                                setShowStudentForm(false);
                            }}
                            placeholder="Start typing name..."
                            style={{ flex: 1 }}
                        />
                        {/* Clear button if selected */}
                        {selectedStudentId && <button onClick={() => { setStudentSearch(''); setSelectedStudentId(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>❌</button>}
                    </div>

                    {/* Dropdown Results */}
                    {students.length > 0 && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, width: '100%',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            zIndex: 10, borderRadius: '8px', maxHeight: '200px', overflowY: 'auto',
                            boxShadow: 'var(--shadow)'
                        }}>
                            {students.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => handleStudentSelect(s)}
                                    style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                    className="hover-bg"
                                >
                                    <strong>{s.name}</strong> <span style={{ color: 'var(--text-secondary)' }}>({s.class})</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Not Found / Add New */}
                    {studentSearch.length > 2 && students.length === 0 && !selectedStudentId && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                onClick={() => setShowStudentForm(true)}
                            >
                                + Add New Student "{studentSearch}"
                            </button>
                        </div>
                    )}

                    {/* New Student Form */}
                    {showStudentForm && (
                        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-input)' }}>
                            <label style={{ fontSize: '0.8rem' }}>Select Class for {studentSearch}</label>
                            <select
                                value={newStudentClass}
                                onChange={e => setNewStudentClass(e.target.value)}
                                style={{ marginTop: '0.5rem' }}
                            >
                                {[
                                    'LKG', 'UKG',
                                    '1st Standard', '2nd Standard', '3rd Standard', '4th Standard', '5th Standard',
                                    '6th Standard', '7th Standard', '8th Standard', '9th Standard', '10th Standard'
                                ].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ marginTop: '0.5rem' }}
                                onClick={handleCreateStudent}
                            >
                                Create Student & Select
                            </button>
                        </div>
                    )}
                </div>

                <hr style={{ margin: '2rem 0', borderColor: 'var(--border)' }} />

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Category</label>
                        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Product</label>
                        <select
                            value={selectedProduct}
                            onChange={e => setSelectedProduct(e.target.value)}
                            disabled={!selectedCategory}
                        >
                            <option value="">-- Select Item --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Size / Variant</label>
                        <select
                            value={selectedStockId}
                            onChange={e => setSelectedStockId(e.target.value)}
                            disabled={!selectedProduct}
                        >
                            <option value="">-- Select Size --</option>
                            {stockVariants.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.size || 'Standard'} (Stock: {s.quantity})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedStockId && (
                        <div style={{ textAlign: 'right', marginBottom: '1rem', fontWeight: 'bold', color: currentStock < 5 ? 'red' : 'green' }}>
                            Available: {currentStock}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Quantity</label>
                        <input
                            type="number"
                            min="1"
                            max={currentStock}
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !selectedStudentId || !selectedStockId || currentStock < 1}
                        style={{ opacity: (loading || !selectedStudentId || !selectedStockId || currentStock < 1) ? 0.6 : 1 }}
                    >
                        {loading ? 'Processing...' : 'Confirm Distribution'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Distribute;
