const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

console.log('=== DATA RESET SCRIPT ===');

db.serialize(async () => {
    // 1. Clear Transactions
    db.run("DELETE FROM transactions", (err) => {
        if (err) console.error("Error clearing transactions:", err);
        else console.log("✔ Transactions Cleared");
    });

    // 2. Clear Inventory
    db.run("DELETE FROM inventory", (err) => {
        if (err) console.error("Error clearing inventory:", err);
        else console.log("✔ Inventory Cleared");
    });

    // 3. Reset Users (Optional but requested "all data")
    // We will clear users but insert the deafult 'admin' back immediately
    db.run("DELETE FROM users", async (err) => {
        if (err) {
            console.error("Error clearing users:", err);
        } else {
            console.log("✔ Users Cleared");

            // Re-create Admin
            // Re-create Admin
            const hashedPassword = await bcrypt.hash('sunshine@123', 10);
            const sql = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;
            db.run(sql, ['sunshine', hashedPassword, 'admin'], (err) => {
                if (err) console.error("Error re-creating admin:", err);
                else console.log("✔ Default User Restored (sunshine / sunshine@123)");
            });
        }
    });
});
