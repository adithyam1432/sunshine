import React, { useState, useEffect } from 'react';
import { useDB } from '../db/DatabaseContext';
import CustomAlert from '../components/CustomAlert';

const Distribute = () => {
    const { runQuery } = useDB();

    // Alert State
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', type: 'error' });

    const showAlert = (message, type = 'error') => {
        setAlertConfig({ isOpen: true, message, type });
    };

    const handleCloseAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };


    // --- Data Sources ---
    const [categories, setCategories] = useState([]);
    const [students, setStudents] = useState([]); // All existing students for autocomplete

    // --- Form State: Student ---
    const [studentName, setStudentName] = useState('');
    const [studentClass, setStudentClass] = useState('LKG');
    const [studentSchool, setStudentSchool] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(null); // If existing selected

    // --- Form State: Item ---
    const [selectedCategory, setSelectedCategory] = useState('');
    const [availableTypes, setAvailableTypes] = useState([]); // Product Names map
    const [selectedType, setSelectedType] = useState('');
    const [availableSizes, setAvailableSizes] = useState([]); // Stock objects map
    const [selectedStockId, setSelectedStockId] = useState('');

    // --- Form State: Transaction ---
    const [quantity, setQuantity] = useState(1);
    const [maxQty, setMaxQty] = useState(0);

    // --- Multi-Item Cart State ---
    const [cart, setCart] = useState([]);

    // Load Initial Data
    useEffect(() => {
        const loadInit = async () => {
            const cats = await runQuery("SELECT * FROM categories");
            setCategories(cats);
            if (cats.length > 0) setSelectedCategory(cats[0].id);

            const studs = await runQuery("SELECT * FROM students");
            setStudents(studs);
        };
        loadInit();
    }, []);

    // Load Items based on Category
    useEffect(() => {
        if (!selectedCategory) return;
        const loadInventory = async () => {
            // Get Products that HAVE stock
            const query = `
                SELECT DISTINCT p.name, p.id 
                FROM stock s 
                JOIN products p ON s.product_id = p.id 
                WHERE p.category_id = ? AND s.quantity > 0
            `;
            const types = await runQuery(query, [selectedCategory]);
            setAvailableTypes(types);
            setSelectedType('');
            setAvailableSizes([]);
        };
        loadInventory();
    }, [selectedCategory]);

    // Load Sizes based on Type
    useEffect(() => {
        if (!selectedType) return;
        const loadSizes = async () => {
            const typeObj = availableTypes.find(t => t.name === selectedType);
            if (!typeObj) return;

            const stocks = await runQuery(
                "SELECT * FROM stock WHERE product_id = ? AND quantity > 0",
                [typeObj.id]
            );
            setAvailableSizes(stocks);
            if (stocks.length > 0) {
                setSelectedStockId(stocks[0].id);
                setMaxQty(stocks[0].quantity);
            }
        };
        loadSizes();
    }, [selectedType, availableTypes]);

    // Update Max Qty when Stock Selection Changes
    useEffect(() => {
        const stock = availableSizes.find(s => s.id == selectedStockId);
        if (stock) {
            // Subtract already carted quantity from max
            const inCart = cart.filter(i => i.stockId == selectedStockId).reduce((sum, i) => sum + i.quantity, 0);
            setMaxQty(Math.max(0, stock.quantity - inCart));
        }
    }, [selectedStockId, availableSizes, cart]);


    // Student Autocomplete Logic
    const handleStudentNameChange = (val) => {
        setStudentName(val.toUpperCase());
        // Reset ID if user types something new
        setSelectedStudentId(null);
    };

    // Simple Autocomplete Render
    const filteredStudents = studentName && !selectedStudentId
        ? students.filter(s => s.name.toLowerCase().includes(studentName.toLowerCase()))
        : [];

    const selectStudent = (s) => {
        setStudentName(s.name);
        setStudentClass(s.class);
        setStudentSchool(s.previous_school || '');
        setSelectedStudentId(s.id);
    };

    // ADD TO LIST (Cart)
    const handleAddToCart = (e) => {
        e.preventDefault();

        if (quantity <= 0) {
            showAlert("Quantity must be greater than 0");
            return;
        }
        if (quantity > maxQty) {
            showAlert("Not enough stock available!");
            return;
        }

        // Validate Item Selections
        if (!selectedCategory || !selectedType || !selectedStockId) {
            showAlert("Please select all item details (Type & Variant)");
            return;
        }

        const typeObj = availableTypes.find(t => t.name === selectedType);
        const stockObj = availableSizes.find(s => s.id == selectedStockId);
        const categoryObj = categories.find(c => c.id == selectedCategory);

        const newItem = {
            id: Date.now(), // temp id
            category: categoryObj?.name,
            name: typeObj?.name,
            size: stockObj?.size,
            stockId: selectedStockId,
            quantity: parseInt(quantity),
            maxAvailable: stockObj?.quantity // snapshot for basic validation
        };

        setCart([...cart, newItem]);

        // Reset Selection but keep category
        setSelectedType('');
        setAvailableSizes([]);
        setSelectedStockId('');
        setQuantity(1);
    };

    const handleRemoveFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const handleConfirmDistribute = async () => {
        if (cart.length === 0) {
            showAlert("No items in list!");
            return;
        }
        if (!studentName) {
            showAlert("Student Name required!");
            return;
        }
        if (!studentClass) {
            showAlert("Class is required!");
            return;
        }
        // If School field is visible (non-Uniform), it is mandatory
        if (!isUniform && !studentSchool) {
            showAlert("Previous School is required!");
            return;
        }

        try {
            // 1. Get or Create Student
            let finalStudentId = selectedStudentId;

            if (!finalStudentId) {
                const check = await runQuery("SELECT id FROM students WHERE name = ? AND class = ?", [studentName, studentClass]);
                if (check.length > 0) {
                    finalStudentId = check[0].id;
                } else {
                    await runQuery(
                        "INSERT INTO students (name, class, previous_school) VALUES (?, ?, ?)",
                        [studentName, studentClass, studentSchool]
                    );
                    const newIds = await runQuery("SELECT id FROM students WHERE name = ? AND class = ?", [studentName, studentClass]);
                    finalStudentId = newIds[0].id;
                }
            }

            // 2. Process Cart Items
            const nowIso = new Date().toISOString();

            for (const item of cart) {
                // Insert Transaction
                await runQuery(
                    "INSERT INTO transactions (student_id, stock_id, quantity, date) VALUES (?, ?, ?, ?)",
                    [finalStudentId, item.stockId, item.quantity, nowIso]
                );

                // Deduct Stock (Fetch fresh to be safe, though cart logic usually holds)
                const currentStock = await runQuery("SELECT quantity FROM stock WHERE id = ?", [item.stockId]);
                const newQty = currentStock[0].quantity - item.quantity;
                await runQuery("UPDATE stock SET quantity = ? WHERE id = ?", [newQty, item.stockId]);

                // Low Stock Notify
                if (newQty <= 15) {
                    const displayName = `${item.name}${item.size ? ` (${item.size})` : ''}`;
                    import('../services/notificationService').then(({ NotificationService }) => {
                        NotificationService.triggerLowStockAlert(displayName, newQty);
                    });
                }
            }

            showAlert("Distribution Successful!", 'success');

            // Cleanup
            setCart([]);
            setStudentName('');
            setStudentClass('LKG');
            setStudentSchool('');
            setSelectedStudentId(null);

            // Refresh Student List
            const studs = await runQuery("SELECT * FROM students");
            setStudents(studs);

        } catch (err) {
            console.error(err);
            showAlert("Error: " + err.message);
        }
    };

    const selectedCatName = categories.find(c => c.id == selectedCategory)?.name || '';
    const isUniform = selectedCatName === 'Uniform';

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <CustomAlert
                isOpen={alertConfig.isOpen}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={handleCloseAlert}
            />

            <div className="card">
                <h2>Distribute Items</h2>
                {/* message was removed */}

                {/* --- Student Selection Section (Moved to Top for better flow when adding multi items) --- */}
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>1. Student Details</h3>

                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>Student Name</label>
                        <input
                            value={studentName}
                            onChange={e => handleStudentNameChange(e.target.value)}
                            placeholder="Start typing to search..."
                            autoComplete="off"
                        />
                        {filteredStudents.length > 0 && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                background: '#1e293b',
                                border: '1px solid var(--border)',
                                zIndex: 100, maxHeight: '200px', overflowY: 'auto',
                                borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                            }}>
                                {filteredStudents.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => selectStudent(s)}
                                        style={{
                                            padding: '12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                                            color: '#fff'
                                        }}
                                    >
                                        <strong>{s.name}</strong> <small style={{ opacity: 0.7 }}>({s.class})</small>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Class</label>
                        <select value={studentClass} onChange={e => setStudentClass(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                            {(isUniform
                                ? ['LKG', 'UKG']
                                : ['LKG', 'UKG', ...Array.from({ length: 10 }, (_, i) => i + 1)]
                            ).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {!isUniform && (
                        <div className="form-group">
                            <label>Previous School</label>
                            <input
                                value={studentSchool}
                                onChange={e => setStudentSchool(e.target.value.toUpperCase())}
                                placeholder="Enter School Name"
                            />
                        </div>
                    )}
                </div>

                {/* --- Item Selection Section --- */}
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>2. Select Items to Distribute</h3>

                    <div className="form-group">
                        <label>Category</label>
                        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Item Type</label>
                        <select value={selectedType} onChange={e => setSelectedType(e.target.value)} disabled={availableTypes.length === 0} style={{ width: '100%', padding: '10px' }}>
                            <option value="">-- Select Type --</option>
                            {availableTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                    </div>

                    {selectedType && (
                        <div className="form-group">
                            <label>Size / Variant</label>
                            <select value={selectedStockId} onChange={e => setSelectedStockId(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                                {availableSizes.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.size ? `Size: ${s.size}` : 'Standard'} (Available: {s.quantity})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Quantity (Max: {maxQty})</label>
                        <input type="number" min="1" max={maxQty} value={quantity} onChange={e => setQuantity(e.target.value)} />
                    </div>

                    <button
                        className="btn"
                        onClick={handleAddToCart}
                        disabled={!selectedStockId || quantity <= 0 || quantity > maxQty}
                        style={{ border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent' }}
                    >
                        + Add to List
                    </button>
                </div>

                {/* --- Cart Preview --- */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Selected Items ({cart.length})</h3>
                    {cart.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No items selected yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {cart.map(item => (
                                <div key={item.id} style={{
                                    background: 'var(--bg-input)', padding: '10px', borderRadius: '8px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{item.name} <small style={{ fontWeight: 'normal' }}>({item.category})</small></div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {item.size ? `Size: ${item.size} |` : ''} Qty: {item.quantity}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveFromCart(item.id)}
                                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleConfirmDistribute}
                    disabled={cart.length === 0 || !studentName}
                >
                    Confirm Distribution
                </button>
            </div>
        </div>
    );
};

export default Distribute;
