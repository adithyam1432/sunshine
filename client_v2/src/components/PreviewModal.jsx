import React from 'react';

const PreviewModal = ({ show, title, data, columns, onConfirm, onCancel }) => {
    if (!show) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
            padding: '20px'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '600px', maxHeight: '80vh',
                display: 'flex', flexDirection: 'column', padding: '0',
                overflow: 'hidden', background: 'var(--bg-card)'
            }}>
                <div style={{ padding: '15px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Preview: {title}</h3>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>✖</button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '15px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr>
                                {columns.map((col, idx) => (
                                    <th key={idx} style={{
                                        textAlign: 'left', padding: '8px',
                                        borderBottom: '2px solid var(--border)',
                                        background: 'var(--bg-input)', position: 'sticky', top: 0
                                    }}>
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr><td colSpan={columns.length} style={{ padding: '20px', textAlign: 'center' }}>No data to export.</td></tr>
                            ) : (
                                data.map((row, rIdx) => (
                                    <tr key={rIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        {columns.map((col, cIdx) => (
                                            <td key={cIdx} style={{ padding: '8px', verticalAlign: 'top' }}>
                                                {row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '15px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onCancel} className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="btn btn-primary" disabled={data.length === 0}>
                        Confirm & Share CSV 📤
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
