import React, { useState } from 'react';

const EditItemModal = ({ item, onClose, onSave, onDelete }) => {
    const [quantity, setQuantity] = useState(item.quantity);
    const [price, setPrice] = useState(item.price);

    const handleSave = () => {
        onSave(item.id, parseInt(quantity), parseFloat(price));
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete ${item.name}? This cannot be undone.`)) {
            onDelete(item.id);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '400px', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >✕</button>

                <h3 style={{ marginBottom: '1.5rem' }}>Edit Item</h3>

                <div style={{ marginBottom: '1rem' }}>
                    <strong>{item.name}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {item.category} {item.size ? `- ${item.size}` : ''}
                    </div>
                </div>

                <div className="form-group">
                    <label>Quantity</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>Price (₹)</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button onClick={handleSave} className="btn btn-primary">Save Changes</button>
                    <button onClick={handleDelete} className="btn" style={{ background: '#ef4444', color: 'white' }}>Delete Item</button>
                </div>
            </div>
        </div>
    );
};

export default EditItemModal;
