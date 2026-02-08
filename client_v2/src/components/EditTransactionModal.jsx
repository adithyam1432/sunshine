import React, { useState } from 'react';

const EditTransactionModal = ({ transaction, onClose, onUpdate }) => {
    const [quantity, setQuantity] = useState(transaction.quantity);

    const handleSave = () => {
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) {
            alert("Please enter a valid quantity");
            return;
        }
        onUpdate(transaction.id, qty, transaction.quantity, transaction.stock_id);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
            padding: '20px'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>Edit Distribution</h3>

                <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Item</label>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{transaction.name}</div>
                    {transaction.size && transaction.size !== '-' && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Size: {transaction.size}</div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Quantity Given</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        style={{ padding: '8px', fontSize: '1.1rem' }}
                        min="1"
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                    <button onClick={onClose} className="btn" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>Cancel</button>
                    <button onClick={handleSave} className="btn btn-primary">Update</button>
                </div>
            </div>
        </div>
    );
};

export default EditTransactionModal;
