import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import bcrypt from 'bcryptjs';

const sqlite = new SQLiteConnection(CapacitorSQLite);

let dbConnection = null;

// Initialize Database
export const initDB = async () => {
    try {
        // Safe Connection Check: Ensure we don't double-open
        const ret = await sqlite.checkConnectionsConsistency();
        const isConn = (await sqlite.isConnection('inventory_db', false)).result;

        if (ret.result && isConn) {
            dbConnection = await sqlite.retrieveConnection('inventory_db', false);
        } else {
            dbConnection = await sqlite.createConnection('inventory_db', false, 'no-encryption', 1, false);
        }

        if (!dbConnection) throw new Error("Could not create connection object");

        await dbConnection.open();

        // Create Tables (Schema migration from server/db.js)

        // MIGRATION CHECK
        let hasOldTable = false;
        try {
            const checkOld = await dbConnection.query("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'");
            hasOldTable = checkOld && checkOld.values && checkOld.values.length > 0;
        } catch (ignored) {
            // If query fails, assume no old table or empty DB
        }

        if (hasOldTable) {
            console.log("Old schema detected. Performing migration reset...");
            try {
                // DROP CHILD FIRST (transactions references inventory)
                await dbConnection.execute("DROP TABLE IF EXISTS transactions");
                await dbConnection.execute("DROP TABLE IF EXISTS inventory");
            } catch (migErr) {
                console.warn("Migration DROP warning (can be ignored if tables verified gone):", migErr);
            }
        }

        // Create Relational Tables (Normalized)
        const schema = `
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        );

        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            class TEXT NOT NULL,
            UNIQUE(name, class)
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            UNIQUE(category_id, name),
            FOREIGN KEY(category_id) REFERENCES categories(id)
        );

        CREATE TABLE IF NOT EXISTS stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            size TEXT,
            quantity INTEGER DEFAULT 0,
            price REAL DEFAULT 0,
            FOREIGN KEY(product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            stock_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(stock_id) REFERENCES stock(id)
        );

        -- Initial Seed for Categories
        INSERT OR IGNORE INTO categories (name) VALUES ('Uniform');
        INSERT OR IGNORE INTO categories (name) VALUES ('Kit');
        `;

        await dbConnection.execute(schema);

        // Seed Admin
        await seedAdmin();

        console.log('Database Initialized');
        return true;
    } catch (err) {
        console.error('Database Initialization Failed:', err);
        throw err; // Propagate error so Context can show specific message
    }
};

export const getDB = () => {
    if (!dbConnection) throw new Error("Database not initialized");
    return dbConnection;
};

// Seed Helper (Must be called after init)
export const seedAdmin = async () => {
    try {
        const db = getDB();
        const res = await db.query("SELECT * FROM users WHERE username = 'sunshine'");

        if (res.values.length === 0) {
            console.log("Seeding Admin User...");
            const hash = await bcrypt.hash('sunshine@123', 10);
            await db.run(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                ['sunshine', hash, 'admin']
            );
            console.log("Admin Seeded");
        }
    } catch (e) {
        console.error("Seed Error:", e);
    }
}
