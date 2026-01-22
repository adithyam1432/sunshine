const db = require('./db');
const bcrypt = require('bcrypt');

const seed = async () => {
    console.log('Seeding database...');

    // 1. Create Admin User
    const passwordHash = await bcrypt.hash('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [passwordHash], (err) => {
        if (err) console.error('Error creating user:', err.message);
        else console.log('Admin user created (admin/admin123)');
    });

    // 2. Create Inventory
    const items = [
        { name: 'Uniform Shirt', category: 'Uniform', size: 'M', quantity: 100, price: 500 },
        { name: 'Uniform Skirt', category: 'Uniform', size: 'L', quantity: 50, price: 600 },
        { name: 'Abacus Kit', category: 'Kit', size: null, quantity: 200, price: 1200 },
        { name: 'K-Math Kit', category: 'Kit', size: null, quantity: 150, price: 1500 }
    ];

    items.forEach(item => {
        db.run(`INSERT INTO inventory (name, category, size, quantity, price) VALUES (?, ?, ?, ?, ?)`,
            [item.name, item.category, item.size, item.quantity, item.price],
            (err) => {
                if (err) console.error('Error inserting item:', err.message);
                else console.log(`Added ${item.name}`);
            }
        );
    });
};

// Wait for DB connection
setTimeout(seed, 1000);
