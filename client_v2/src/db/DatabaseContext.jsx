import React, { createContext, useContext, useEffect, useState } from 'react';
import { initDB, getDB } from '../services/db';
import SunLoader from '../components/SunLoader';

const DatabaseContext = createContext(null);

export const DatabaseProvider = ({ children }) => {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        const setup = async () => {
            const start = Date.now();
            try {
                const success = await initDB();

                // Enforce minimum 3.5 seconds loader time
                const elapsed = Date.now() - start;
                const remaining = Math.max(0, 3500 - elapsed);

                setTimeout(() => {
                    if (success) {
                        setIsReady(true);
                        setShowLoader(false);
                    }
                }, remaining);

            } catch (e) {
                console.error("Context DB Error:", e);
                const msg = e.message || JSON.stringify(e);
                setError(`DB Init Error: ${msg}`);
                setShowLoader(false);
            }
        };
        setup();
    }, []);

    // Helper to run queries easily
    const runQuery = async (query, params = []) => {
        if (!isReady && !query.includes('sqlite_master')) throw new Error("Database not ready");
        const db = getDB();

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

    if (showLoader || !isReady) {
        return <SunLoader />;
    }

    return (
        <DatabaseContext.Provider value={{ runQuery, isReady }}>
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDB = () => useContext(DatabaseContext);
