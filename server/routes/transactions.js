const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all transactions
router.get('/', (req, res) => {
    db.all(`SELECT t.*, i.name as item_name, i.category, i.size 
          FROM transactions t 
          JOIN inventory i ON t.item_id = i.id 
          ORDER BY t.date DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Transaction (Distribute item)
router.post('/', (req, res) => {
    const { student_name, student_class, item_id, quantity } = req.body;

    // 1. Check if stock exists
    db.get("SELECT quantity FROM inventory WHERE id = ?", [item_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item not found' });
        if (row.quantity < quantity) return res.status(400).json({ error: 'Insufficient stock' });

        // 2. Deduct stock
        const newQuantity = row.quantity - quantity;
        db.run("UPDATE inventory SET quantity = ? WHERE id = ?", [newQuantity, item_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // 3. Record Transaction
            const sql = `INSERT INTO transactions (student_name, student_class, item_id, quantity) VALUES (?, ?, ?, ?)`;
            db.run(sql, [student_name, student_class, item_id, quantity], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, student_name, student_class, item_id, quantity, date: new Date() });
            });
        });
    });
});

module.exports = router;
