import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDB } from '../db/DatabaseContext';

const AddInventory = () => {
    // Dropdown Data
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]); // Products for the selected category

    // Form Selection
    const [selectedCategory, setSelectedCategory] = useState('');
    const [productName, setProductName] = useState('');
    const [size, setSize] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [price, setPrice] = useState(0);

    const [message, setMessage] = useState('');

    // UI State
    const [isCustomProduct, setIsCustomProduct] = useState(false);

    const { runQuery } = useDB();

    // 1. Fetch Categories on Mount
    useEffect(() => {
        const loadCats = async () => {
            try {
                const cats = await runQuery("SELECT * FROM categories");
                setCategories(cats);
                if (cats.length > 0) setSelectedCategory(cats[0].id); // Default to first
            } catch (err) {
                console.error("Error loading categories:", err);
            }
        };
        loadCats();
    }, []);

    // 2. Fetch Products when Category changes
    useEffect(() => {
        const loadProducts = async () => {
            if (!selectedCategory) return;
            try {
                const prods = await runQuery("SELECT * FROM products WHERE category_id = ?", [selectedCategory]);
                setProducts(prods);
                setProductName(''); // Reset selection
                setIsCustomProduct(false);
            } catch (err) {
                console.error("Error loading products:", err);
            }
        };
        loadProducts();
    }, [selectedCategory]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const finalName = productName.trim();
        const finalSize = size.trim() || null;
        const qty = parseInt(quantity);
        const CatID = parseInt(selectedCategory);

        if (!finalName || qty <= 0) {
            setMessage("Please enter valid details.");
            return;
        }

        try {
            // Step 1: Find or Create Product
            let productId = null;

            // Check if product exists (Logic: Name + Category)
            const existingProduct = await runQuery(
                "SELECT id FROM products WHERE name = ? AND category_id = ?",
                [finalName, CatID]
            );

            if (existingProduct.length > 0) {
                productId = existingProduct[0].id;
            } else {
                // Create New Product
                const res = await runQuery(
                    "INSERT INTO products (category_id, name) VALUES (?, ?) RETURNING id",
                    [CatID, finalName]
                );
                // Handle different SQLite return formats ( Capacitor SQLite sometimes returns changes/lastId separately)
                // If RETURNING not supported by plugin, fetch back.
                const checkAgain = await runQuery("SELECT id FROM products WHERE name = ? AND category_id = ?", [finalName, CatID]);
                productId = checkAgain[0].id;
            }

            // Step 2: Update or Insert Stock
            // Check if Stock exists (Product + Size)
            let existingStock;
            if (finalSize) {
                existingStock = await runQuery(
                    "SELECT * FROM stock WHERE product_id = ? AND size = ?",
                    [productId, finalSize]
                );
            } else {
                existingStock = await runQuery(
                    "SELECT * FROM stock WHERE product_id = ? AND size IS NULL",
                    [productId]
                );
            }

            if (existingStock.length > 0) {
                // Update Quantity
                const newQty = existingStock[0].quantity + qty;
                await runQuery("UPDATE stock SET quantity = ? WHERE id = ?", [newQty, existingStock[0].id]);
                setMessage(`Stock Updated! (Total: ${newQty})`);
            } else {
                // Insert New Stock Variant
                await runQuery(
                    "INSERT INTO stock (product_id, size, quantity, price) VALUES (?, ?, ?, ?)",
                    [productId, finalSize, qty, price]
                );
                setMessage("New Stock Added Successfully!");
            }

            // Reset inputs
            setQuantity(0);
            setSize('');
            // Optional: Re-fetch products to update dropdown if new product added
            if (isCustomProduct) {
                const prods = await runQuery("SELECT * FROM products WHERE category_id = ?", [selectedCategory]);
                setProducts(prods);
                setIsCustomProduct(false);
            }

        } catch (err) {
            console.error(err);
            setMessage("Error: " + err.message);
        }
    };

    const selectedCatName = categories.find(c => c.id == selectedCategory)?.name || '';
    const isKit = selectedCatName === 'Kit';

    return (
        <div className="container">
            <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Add New Stock</h2>

                {message && (
                    <div style={{ padding: '1rem', background: message.includes('Error') ? '#fee2e2' : '#dcfce7', borderRadius: '8px', marginBottom: '1rem', color: message.includes('Error') ? 'red' : 'green' }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Category Selection */}
                    <div className="form-group">
                        <label>Category</label>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Product Selection / Entry */}
                    <div className="form-group">
                        <label>Product Name</label>
                        <select
                            disabled={isCustomProduct}
                            value={isCustomProduct ? '__custom__' : productName}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom__') {
                                    setIsCustomProduct(true);
                                    setProductName('');
                                } else {
                                    setProductName(val);
                                }
                            }}
                        >
                            <option value="">-- Select Product --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                            <option value="__custom__" style={{ fontWeight: 'bold' }}>+ Create New Product</option>
                        </select>

                        {isCustomProduct && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <input
                                    autoFocus
                                    placeholder="Enter New Product Name (e.g. Red Shirt)"
                                    value={productName}
                                    onChange={e => setProductName(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsCustomProduct(false)}
                                    style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.5rem', background: 'transparent', color: 'red', border: '1px solid red' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Size (Only for non-Kits basically, or if user wants) */}
                    <div className="form-group">
                        <label>Size {isKit ? '(Optional)' : ''}</label>
                        <input
                            placeholder="e.g. 32, M, XL"
                            value={size}
                            onChange={e => setSize(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Quantity</label>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Price (Optional)</label>
                        <input
                            type="number"
                            min="0"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                        />
                    </div>


                    <button type="submit" className="btn btn-primary">Add to Inventory</button>
                </form>
            </div>
        </div>
    );
};

export default AddInventory;
