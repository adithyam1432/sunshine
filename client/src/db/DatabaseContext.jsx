import React, { createContext, useContext, useEffect, useState } from 'react';
import { initDB, getDB } from '../services/db';

const DatabaseContext = createContext(null);

export const DatabaseProvider = ({ children }) => {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const setup = async () => {
            try {
                const success = await initDB();
                if (success) {
                    setIsReady(true);
                }
            } catch (e) {
                console.error("Context DB Error:", e);
                // Extract useful message:
                const msg = e.message || JSON.stringify(e);
                setError(`DB Init Error: ${msg}`);
            }
        };
        setup();
    }, []);

    // Helper to run queries easily
    const runQuery = async (query, params = []) => {
        if (!isReady) throw new Error("Database not ready");
        const db = getDB();
        // Capacitor SQLite query returns { values: [] }
        // For modifying queries (INSERT/UPDATE), we use run() or execute()
        // But @capacitor-community/sqlite uses query() for SELECT and run() for others.

        const isSelect = query.trim().toUpperCase().startsWith('SELECT');

        try {
            if (isSelect) {
                const res = await db.query(query, params);
                return res.values || [];
            } else {
                const res = await db.run(query, params);
                return res.changes;
            }
        } catch (err) {
            console.error("Query Error:", query, err);
            throw err;
        }
    };

    if (error) {
        return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;
    }

    if (!isReady) {
        return (
            <div style={{
                display: 'flex',
                height: '100vh',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#0f172a', // Dark blue background
                color: '#ffffff', // White text
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Loading App Data...</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Please wait while we set up the database.</div>
            </div>
        );
    }

    return (
        <DatabaseContext.Provider value={{ runQuery, isReady }}>
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDB = () => useContext(DatabaseContext);
