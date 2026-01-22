const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database Connection Failed:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Connected to SQLite database at:', dbPath);
    }
});

db.serialize(() => {
    // Check Inventory
    db.all("SELECT * FROM inventory", [], (err, rows) => {
        if (err) {
            console.error('❌ Error reading inventory:', err);
        } else {
            console.log('\n--- Current Inventory Data ---');
            if (rows.length === 0) {
                console.log('No items found (Database is empty but connected).');
            } else {
                rows.forEach(row => {
                    const label = row.size ? `${row.name} (Size: ${row.size})` : row.name;
                    console.log(`- ${label}: ${row.quantity} units`);
                });
            }
            console.log('------------------------------');
            console.log(`Total Records: ${rows.length}`);
        }
    });

    // Check Users (just count)
    db.get("SELECT Count(*) as count FROM users", (err, row) => {
        if (err) console.error(err);
        else console.log(`\n✅ Users Table Accessible (Count: ${row.count})`);
    });
});
