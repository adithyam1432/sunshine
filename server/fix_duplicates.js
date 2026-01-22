const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

console.log('Running duplicate fixer...');

db.all("SELECT * FROM inventory", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }

    const map = new Map();

    rows.forEach(row => {
        // Create a unique key for grouping
        // Normalize: trim whitespace, lowercase for comparison
        const nameKey = row.name.trim().toLowerCase();
        const catKey = row.category.trim().toLowerCase();
        const sizeKey = row.size ? row.size.trim().toLowerCase() : 'null';

        const key = `${nameKey}|${catKey}|${sizeKey}`;

        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(row);
    });

    db.serialize(() => {
        map.forEach((items, key) => {
            if (items.length > 1) {
                console.log(`Found duplicates for ${key}: ${items.length} items`);

                // Keep the first one, merge others into it
                const prime = items[0];
                let totalQty = 0;
                const idsToDelete = [];

                items.forEach(item => {
                    totalQty += item.quantity;
                    if (item.id !== prime.id) {
                        idsToDelete.push(item.id);
                    }
                });

                console.log(`Merging into ID ${prime.id}. New Total: ${totalQty}. Deleting IDs: ${idsToDelete}`);

                // Update prime
                db.run("UPDATE inventory SET quantity = ? WHERE id = ?", [totalQty, prime.id]);

                // Delete others
                idsToDelete.forEach(id => {
                    db.run("DELETE FROM inventory WHERE id = ?", [id]);
                });
            }
        });
    });
});
