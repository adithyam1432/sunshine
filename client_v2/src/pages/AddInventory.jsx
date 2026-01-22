import React, { useState, useEffect } from 'react';
import { useDB } from '../db/DatabaseContext';

const AddInventory = () => {
    // Data
    const [categories, setCategories] = useState([]);
    const [existingProducts, setExistingProducts] = useState([]); // Products in selected category
    const [existingSizes, setExistingSizes] = useState([]); // Sizes for selected product

    // Form
    const [selectedCategory, setSelectedCategory] = useState('');
    const [productName, setProductName] = useState(''); // "Item Type"
    const [size, setSize] = useState('');
    const [quantity, setQuantity] = useState('');
    const [message, setMessage] = useState('');

    // UI Helpers
    const [isCustomProduct, setIsCustomProduct] = useState(false);

    const { runQuery } = useDB();

    // 1. Fetch Categories
    useEffect(() => {
        const loadCats = async () => {
            const cats = await runQuery("SELECT * FROM categories");
            setCategories(cats);
            if (cats.length > 0) setSelectedCategory(cats[0].id);
        };
        loadCats();
    }, []);

    // 2. Fetch Products for Category (Suggestions + Dropdown)
    useEffect(() => {
        if (!selectedCategory) return;
        const loadProds = async () => {
            const prods = await runQuery("SELECT * FROM products WHERE category_id = ?", [selectedCategory]);
            setExistingProducts(prods);
            setProductName('');
            setIsCustomProduct(false);
            setSize('');
        };
        loadProds();
    }, [selectedCategory]);

    // 3. Fetch Sizes for Selected Product (For suggestions)
    useEffect(() => {
        if (!productName || isCustomProduct) return;
        const prod = existingProducts.find(p => p.name === productName);
        if (!prod) return;

        const loadSizes = async () => {
            const sizes = await runQuery(
                "SELECT size, SUM(quantity) as count FROM stock WHERE product_id = ? AND size IS NOT NULL GROUP BY size",
                [prod.id]
            );
            setExistingSizes(sizes); // Now array of objects {size, count}
        };
        loadSizes();
    }, [productName, existingProducts, isCustomProduct]);


    const handleAdd = async (e) => {
        e.preventDefault();
        setMessage('');

        const finalName = productName.trim();
        const finalSize = size.trim() || null;
        const qty = parseInt(quantity);

        if (!finalName || isNaN(qty) || qty <= 0) {
            setMessage("Error: Invalid Input");
            return;
        }

        try {
            // A. Find or Create Product
            let productId;
            const existing = existingProducts.find(p => p.name.toLowerCase() === finalName.toLowerCase());

            if (existing) {
                productId = existing.id;
            } else {
                // Insert New Product
                await runQuery("INSERT INTO products (category_id, name) VALUES (?, ?)", [selectedCategory, finalName]);
                const newIds = await runQuery("SELECT id FROM products WHERE name = ? AND category_id = ?", [finalName, selectedCategory]);
                productId = newIds[0].id;
            }

            // B. Find or Create Stock (Grouping Logic)
            // Check if this size exists for this product
            let stockCheckQuery = "SELECT * FROM stock WHERE product_id = ?";
            let stockCheckParams = [productId];

            if (finalSize) {
                stockCheckQuery += " AND size = ?";
                stockCheckParams.push(finalSize);
            } else {
                stockCheckQuery += " AND size IS NULL";
            }

            const existingStock = await runQuery(stockCheckQuery, stockCheckParams);

            let finalQtyForNotify = 0;

            if (existingStock.length > 0) {
                // Update
                const newTotal = existingStock[0].quantity + qty;
                await runQuery("UPDATE stock SET quantity = ? WHERE id = ?", [newTotal, existingStock[0].id]);
                setMessage(`Updated Stock! Total Count: ${newTotal}`);
                finalQtyForNotify = newTotal;
            } else {
                // Insert
                await runQuery(
                    "INSERT INTO stock (product_id, size, quantity) VALUES (?, ?, ?)",
                    [productId, finalSize, qty]
                );
                setMessage("New Item Added to Inventory!");
                finalQtyForNotify = qty;
            }

            // --- LOG HISTORY ---
            const catName = categories.find(c => c.id == selectedCategory)?.name || 'Unknown';
            const logAction = existingStock.length > 0 ? 'UPDATE' : 'CREATE';

            await runQuery(
                "INSERT INTO stock_logs (category_name, item_name, size, quantity, action, date) VALUES (?, ?, ?, ?, ?, ?)",
                [catName, finalName, finalSize || '-', qty, logAction, new Date().toISOString()]
            );

            // Low Stock Notification Logic (Native)
            if (finalQtyForNotify <= 15) {
                const displayName = finalSize ? `${finalName} (${finalSize})` : finalName;
                import('../services/notificationService').then(({ NotificationService }) => {
                    NotificationService.triggerLowStockAlert(displayName, finalQtyForNotify);
                });
            }

            // Full Reset Logic
            setQuantity('');
            setSize('');
            setProductName('');
            setIsCustomProduct(false);

            // Don't reset Category to allow rapid entry in same category

            // Refetch products for the list
            if (!existing) {
                const prods = await runQuery("SELECT * FROM products WHERE category_id = ?", [selectedCategory]);
                setExistingProducts(prods);
            }

            // As we cleared product name, existing sizes will naturally clear via effect dependency
            setExistingSizes([]);

        } catch (err) {
            console.error(err);
            setMessage("Error: " + err.message);
        }
    };

    const selectedCatName = categories.find(c => c.id == selectedCategory)?.name || '';
    const isKit = selectedCatName === 'Kit';

    // Defaults for Dropdowns
    const kitDefaults = ["Abacus Kit", "K-Math Kit"];
    const uniformDefaults = ["T-Shirt", "Skirt", "Half Pant"];

    return (
        <div className="container" style={{ paddingBottom: '80px' }}>
            <div className="card">
                <h2>Add Stock</h2>
                {message && <p style={{ color: message.startsWith('Error') ? 'red' : 'green', margin: '1rem 0' }}>{message}</p>}

                <form onSubmit={handleAdd}>
                    {/* Category */}
                    <div className="form-group">
                        <label>Category</label>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            style={{ width: '100%', padding: '12px' }}
                        >
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Item Type (Product Name) */}
                    <div className="form-group">
                        <label>Item Type</label>
                        {/* Logic: Show Dropdown with Defaults + Existing + Custom Option */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={isCustomProduct ? '__custom__' : productName}
                                onChange={e => {
                                    if (e.target.value === '__custom__') {
                                        setIsCustomProduct(true);
                                        setProductName('');
                                    } else {
                                        setIsCustomProduct(false);
                                        setProductName(e.target.value);
                                    }
                                }}
                                style={{ flex: 1, padding: '12px' }}
                            >
                                <option value="">-- Select Type --</option>
                                {/* Default Suggestions specific to Category */}
                                {(isKit ? kitDefaults : uniformDefaults).map(def => (
                                    <option key={def} value={def}>{def}</option>
                                ))}
                                {/* Existing Items in DB not in defaults */}
                                {existingProducts
                                    .filter(p => !(isKit ? kitDefaults : uniformDefaults).includes(p.name))
                                    .map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))
                                }
                                <option value="__custom__" style={{ fontWeight: 'bold' }}>+ Add New Type</option>
                            </select>
                        </div>
                        {isCustomProduct && (
                            <input
                                placeholder="Enter New Item Name"
                                value={productName}
                                onChange={e => setProductName(e.target.value)}
                                style={{ marginTop: '0.5rem' }}
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Size (Hidden for Kit) */}
                    {!isKit && (
                        <div className="form-group">
                            <label>Size</label>
                            {/* Suggest Existing Sizes if available */}
                            {existingSizes.length > 0 && (
                                <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Existing: </span>
                                    {existingSizes.map((s, idx) => ( // s is object {size, count}
                                        <span
                                            key={idx}
                                            onClick={() => setSize(s.size)}
                                            style={{
                                                background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '12px',
                                                fontSize: '0.8rem', cursor: 'pointer', border: '1px solid var(--border)',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}
                                        >
                                            <strong>{s.size}</strong>
                                            <span style={{ fontSize: '0.7em', color: 'var(--text-inverse)', background: 'var(--primary)', padding: '1px 6px', borderRadius: '10px' }}>
                                                {s.count}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <input
                                placeholder="Size (e.g. M, 32, 40)"
                                value={size}
                                onChange={e => setSize(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Quantity */}
                    <div className="form-group">
                        <label>Quantity</label>
                        <input
                            type="number"
                            placeholder="Enter Count"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                        />
                    </div>

                    <button className="btn btn-primary" type="submit">
                        {existingProducts.find(p => p.name === productName) ? 'Update Inventory' : 'Add New Item'}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default AddInventory;
