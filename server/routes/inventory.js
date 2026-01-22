const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all inventory
router.get('/', (req, res) => {
    db.all("SELECT * FROM inventory", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add new item (with aggregation)
router.post('/', (req, res) => {
    const { quantity, price } = req.body;
    // Normalize inputs to prevent duplicates from trailing spaces
    const name = req.body.name ? req.body.name.trim() : '';
    const category = req.body.category ? req.body.category.trim() : '';
    const size = req.body.size ? req.body.size.trim() : null;


    // 1. Fetch potential matches by name and category (Ignore size in SQL to handle NULLs in JS)
    const checkSql = `SELECT id, quantity, size FROM inventory WHERE name = ? AND category = ?`;

    db.all(checkSql, [name, category], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // 2. Find exact match including Size (Handling NULL vs undefined vs empty string)
        const incomingSize = size ? size.trim() : null;

        const existingItem = rows.find(row => {
            const dbSize = row.size ? row.size.trim() : null;
            return dbSize === incomingSize;
        });

        if (existingItem) {
            // 3. Update existing item
            const newQuantity = existingItem.quantity + quantity;
            const updateSql = `UPDATE inventory SET quantity = ? WHERE id = ?`;
            db.run(updateSql, [newQuantity, existingItem.id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: existingItem.id, name, category, size, quantity: newQuantity, price, message: 'Stock updated (Merged)' });
            });
        } else {
            // 4. Insert new item
            const insertSql = `INSERT INTO inventory (name, category, size, quantity, price) VALUES (?, ?, ?, ?, ?)`;
            db.run(insertSql, [name, category, size, quantity, price], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, name, category, size, quantity, price, message: 'New item created' });
            });
        }
    });
});

// Update stock (e.g., adding more items)
router.put('/:id', (req, res) => {
    const { quantity } = req.body;
    const sql = `UPDATE inventory SET quantity = ? WHERE id = ?`;
    db.run(sql, [quantity, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Updated', changes: this.changes });
    });
});

// Delete item
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM inventory WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted', changes: this.changes });
    });
});

module.exports = router;
