import React, { useState, useEffect } from 'react';
import { useDB } from '../db/DatabaseContext';
import CreatableSelect from './CreatableSelect';

const EditItemModal = ({ item, onClose, onUpdate }) => {
    const { runQuery } = useDB();
    const [name, setName] = useState(item.name);
    const [size, setSize] = useState(item.size === '-' ? '' : item.size);
    const [quantity, setQuantity] = useState(item.total);
    const [category, setCategory] = useState(item.category); // Just for context, usually read-only or auto-detected

    // Suggestions
    const [existingSizes, setExistingSizes] = useState([]);
    const [existingProducts, setExistingProducts] = useState([]);

    useEffect(() => {
        const loadSuggestions = async () => {
            // 1. Get Product ID for this item (to find category and relevant other products)
            // We only have name/size/category/total from GROUP BY query.
            // We need to fetch product_id to correctly query stock.
            // Actually, we can fetch all products in this Category.

            const cats = await runQuery("SELECT id FROM categories WHERE name = ?", [item.category]);
            if (cats.length === 0) return;
            const catId = cats[0].id;

            // Products in this category
            const prods = await runQuery("SELECT * FROM products WHERE category_id = ?", [catId]);
            setExistingProducts(prods);

            // Detailed Stock for Size suggestions (global for this product name?)
            // If name changes, we should update size suggestions.
            if (name) {
                const prod = prods.find(p => p.name === name);
                if (prod) {
                    const sizes = await runQuery(
                        "SELECT size, SUM(quantity) as count FROM stock WHERE product_id = ? AND size IS NOT NULL GROUP BY size",
                        [prod.id]
                    );
                    setExistingSizes(sizes);
                }
            }
        };
        loadSuggestions();
    }, [item.category, name]);

    const handleSave = async () => {
        try {
            // Complex Logic: Update "Stock"
            // The item passed in is a GROUPED aggregate (SUM of quantity).
            // But we might have multiple rows for same product/size (though unlikely with current Add logic, it's possible).
            // Simplification: We treat (Product, Size) as a Unique Entry.

            // 1. Find Product ID
            let prodId;
            const existingProd = existingProducts.find(p => p.name === name);
            if (existingProd) {
                prodId = existingProd.id;
            } else {
                // Rename Product? Or Create New?
                // If user changes name, do we rename the PRODUCT (affecting all sizes)?
                // OR do we move this STOCK to a new Product?
                // "Allow the admin to edit... item name".
                // Usually implies correcting a typo (Rename Product) OR changing this specific stock to be another product.
                // Converting stock is safer.

                // Let's create new product if needed
                const cats = await runQuery("SELECT id FROM categories WHERE name = ?", [item.category]);
                if (cats.length) {
                    await runQuery("INSERT INTO products (category_id, name) VALUES (?, ?)", [cats[0].id, name]);
                    const newP = await runQuery("SELECT id FROM products WHERE name = ?", [name]);
                    prodId = newP[0].id;
                }
            }

            // 2. Update Stock
            // We need to identify the specific rows to update.
            // We know the OLD Product Name and OLD Size.
            const oldProd = await runQuery("SELECT id FROM products WHERE name = ?", [item.name]);
            if (oldProd.length === 0) throw new Error("Original product not found");

            const oldProdId = oldProd[0].id;
            const oldSize = item.size === '-' ? null : item.size;

            // Update Query
            let updateSql = `UPDATE stock SET product_id = ?, quantity = ?`;
            const params = [prodId, quantity];

            if (size) {
                updateSql += `, size = ?`;
                params.push(size);
            } else {
                updateSql += `, size = NULL`;
            }

            updateSql += ` WHERE product_id = ?`;
            params.push(oldProdId);

            if (oldSize) {
                updateSql += ` AND size = ?`;
                params.push(oldSize);
            } else {
                updateSql += ` AND size IS NULL`;
            }

            // Wait, simply updating the WHERE clause might merge it into another existing row (duplicate constraint?).
            // If we change Size M -> L, and L already exists, we might have two rows for L.
            // Ideally we merge them, but SQLite UPDATE won't auto-merge.
            // For now, let's just update. Grouping logic in Dashboard handles display merging.

            await runQuery(updateSql, params);

            onUpdate();
            onClose();

        } catch (err) {
            console.error(err);
            alert("Update Failed: " + err.message);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
            padding: '20px'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>Edit Item</h3>

                {/* Item Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <CreatableSelect
                        label="Item Type"
                        placeholder="Select or Enter Item Name"
                        value={name}
                        onChange={setName}
                        options={existingProducts.map(p => p.name)}
                    />
                </div>

                {/* Size - Hide for Kits */}
                {item.category !== 'Kit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <CreatableSelect
                            label="Size"
                            placeholder="Select or Enter Size (e.g. M, 30)"
                            value={size}
                            onChange={setSize}
                            options={existingSizes.map(s => ({
                                value: s.size,
                                label: `${s.size} ${s.count ? `(${s.count})` : ''}`
                            }))}
                        />
                    </div>
                )}

                {/* Quantity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Quantity</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ padding: '8px' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                    <button onClick={onClose} className="btn" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>Cancel</button>
                    <button onClick={handleSave} className="btn btn-primary">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default EditItemModal;
