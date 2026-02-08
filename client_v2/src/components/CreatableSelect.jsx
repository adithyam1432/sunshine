import React, { useState, useRef, useEffect } from 'react';

// A "Combobox" that allows selecting from a list OR typing a new value.
const CreatableSelect = ({ label, value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const wrapperRef = useRef(null);

    // Sync internal filter with external value changes (optional, mostly for initial load)
    useEffect(() => {
        setFilterText(value || '');
    }, [value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setFilterText(optionValue);
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        const text = e.target.value;
        setFilterText(text);
        onChange(text); // Propagate changes immediately as "custom" value
        setIsOpen(true); // Open dropdown when typing
    };

    // Filter options based on text
    // options can be simple strings or objects { label, value }
    const filteredOptions = options.filter(opt => {
        const labelStr = typeof opt === 'string' ? opt : opt.label || opt.value;
        return labelStr.toLowerCase().includes(filterText.toLowerCase());
    });

    return (
        <div className="form-group" ref={wrapperRef}>
            {label && <label>{label}</label>}
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={filterText}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    style={{
                        paddingRight: '30px' // Space for arrow
                    }}
                />
                {/* Arrow Icon */}
                <span
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        opacity: 0.7,
                        pointerEvents: 'auto' // Ensure click works
                    }}
                >
                    ▼
                </span>

                {isOpen && filteredOptions.length > 0 && (
                    <ul style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-card)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--border)',
                        borderRadius: '0 0 12px 12px',
                        marginTop: '4px',
                        padding: '0.5rem 0',
                        listStyle: 'none',
                        zIndex: 100,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: 'var(--shadow)'
                    }}>
                        {filteredOptions.map((opt, idx) => {
                            const val = typeof opt === 'string' ? opt : opt.value;
                            const disp = typeof opt === 'string' ? opt : opt.label;
                            return (
                                <li
                                    key={idx}
                                    onClick={() => handleSelect(val)}
                                    style={{
                                        padding: '10px 16px',
                                        cursor: 'pointer',
                                        color: 'var(--text-primary)',
                                        borderBottom: idx === filteredOptions.length - 1 ? 'none' : '1px solid var(--border)',
                                        background: val === value ? 'var(--bg-hover)' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                                    onMouseLeave={(e) => e.target.style.background = val === value ? 'var(--bg-hover)' : 'transparent'}
                                >
                                    {disp}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default CreatableSelect;
