import React from 'react';

const CustomAlert = ({ isOpen, message, type = 'error', onClose }) => {
    if (!isOpen) return null;

    const isError = type === 'error';
    const icon = isError ? '⚠️' : '✅';
    const title = isError ? 'Error' : 'Success';
    const btnColor = isError ? '#ef4444' : '#10b981';

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', // Slightly more transparent to show blur better
            backdropFilter: 'blur(15px)', // Stronger blur
            webkitBackdropFilter: 'blur(15px)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onClose}>
            <div
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    padding: '2rem',
                    width: '85%',
                    maxWidth: '320px',
                    textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                    transform: 'scale(1)',
                    backdropFilter: 'blur(20px)', // Ensure card itself blurs background
                    webkitBackdropFilter: 'blur(20px)',
                    animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    fontSize: '3rem',
                    marginBottom: '1rem',
                    filter: isError ? 'drop-shadow(0 0 10px rgba(239,68,68,0.4))' : 'drop-shadow(0 0 10px rgba(16,185,129,0.4))'
                }}>
                    {icon}
                </div>

                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{title}</h3>

                <p style={{
                    color: 'var(--text-secondary)',
                    marginBottom: '1.5rem',
                    fontSize: '1rem',
                    lineHeight: '1.5'
                }}>
                    {message.replace('Error: ', '')}
                </p>

                <button
                    onClick={onClose}
                    className="btn"
                    style={{
                        background: btnColor,
                        color: 'white',
                        border: 'none',
                        boxShadow: `0 4px 14px 0 ${btnColor}66`
                    }}
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default CustomAlert;
