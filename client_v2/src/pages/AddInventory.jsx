import React, { useState, useEffect } from 'react';
import { useDB } from '../db/DatabaseContext';
import CreatableSelect from '../components/CreatableSelect';
import CustomAlert from '../components/CustomAlert';

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

    // Alert State
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', type: 'error' });

    const showAlert = (message, type = 'error') => {
        setAlertConfig({ isOpen: true, message, type });
    };

    const handleCloseAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    // UI Helpers
    const [isCustomProduct, setIsCustomProduct] = useState(false);

    const { runQuery } = useDB();

    // ... (UseEffects remain same) ...
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

    // 3. Fetch Sizes for Selected Product
    useEffect(() => {
        if (!productName || isCustomProduct) return;
        const prod = existingProducts.find(p => p.name.toUpperCase() === productName.toUpperCase());
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

        let finalName = productName.trim();
        const finalSize = size.trim() || null;
        const qty = parseInt(quantity);

        if (!selectedCategory) {
            showAlert("Please select a category");
            return;
        }

        if (!finalName) {
            showAlert("Item Name is required");
            return;
        }

        // Validate Size if NOT a Kit
        if (!isKit && !finalSize) {
            showAlert("Size is required for this category");
            return;
        }

        if (isNaN(qty) || qty <= 0) {
            showAlert("Quantity must be valid and greater than 0");
            return;
        }

        const defaults = (isKit ? kitDefaults : uniformDefaults);
        const defaultMatch = defaults.find(d => d.toLowerCase() === finalName.toLowerCase());

        if (defaultMatch) {
            finalName = defaultMatch; // Auto-correct casing
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
                showAlert(`Updated Stock! Total Count: ${newTotal}`, 'success');
                finalQtyForNotify = newTotal;
            } else {
                // Insert
                await runQuery(
                    "INSERT INTO stock (product_id, size, quantity) VALUES (?, ?, ?)",
                    [productId, finalSize, qty]
                );
                showAlert("New Item Added to Inventory!", 'success');
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

            // Refetch products for the list
            if (!existing) {
                const prods = await runQuery("SELECT * FROM products WHERE category_id = ?", [selectedCategory]);
                setExistingProducts(prods);
            }

            // As we cleared product name, existing sizes will naturally clear via effect dependency
            setExistingSizes([]);

        } catch (err) {
            console.error(err);
            showAlert(err.message);
        }
    };

    const selectedCatName = categories.find(c => c.id == selectedCategory)?.name || '';
    const isKit = selectedCatName === 'Kit';

    // Defaults for Dropdowns
    const kitDefaults = ["Abacus Kit", "K-Math Kit"];
    const uniformDefaults = ["T-Shirt", "Skirt", "Half Pant"];

    return (
        <div className="container" style={{ paddingBottom: '80px' }}>
            <CustomAlert
                isOpen={alertConfig.isOpen}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={handleCloseAlert}
            />

            <div className="card">
                <h2>Add Stock</h2>

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
                    <CreatableSelect
                        label="Item Type"
                        placeholder="Select or Enter New Item Name"
                        value={productName}
                        onChange={(val) => {
                            const upperVal = val.toUpperCase();
                            setProductName(upperVal);
                            const exists = existingProducts.some(p => p.name.toUpperCase() === upperVal);
                            setIsCustomProduct(!exists);
                        }}
                        options={[
                            ...(isKit ? kitDefaults : uniformDefaults),
                            ...existingProducts
                                .filter(p => !(isKit ? kitDefaults : uniformDefaults).some(def => def.toLowerCase() === p.name.toLowerCase()))
                                .map(p => p.name)
                        ]}
                    />

                    {/* Size (Hidden for Kit) */}
                    {!isKit && (
                        <div style={{ marginTop: '1rem' }}>
                            <CreatableSelect
                                label="Size"
                                placeholder="Select or Enter Size (e.g. M, 32)"
                                value={size}
                                onChange={(val) => setSize(val.toUpperCase())}
                                options={existingSizes.map(s => ({
                                    value: s.size,
                                    label: `${s.size} ${s.count ? `(Qty: ${s.count})` : ''}`
                                }))}
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
