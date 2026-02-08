const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'inventory.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    security_question TEXT,
    security_answer TEXT
  )`);

  // --- Legacy Tables (Kept for compatibility) ---
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL, 
    size TEXT, 
    quantity INTEGER DEFAULT 0,
    price REAL DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    student_class TEXT NOT NULL,
    item_id INTEGER,
    quantity INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES inventory(id)
  )`);

  // --- New Client V2 Schema Tables ---
  db.run(`CREATE TABLE IF NOT EXISTS students(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class TEXT NOT NULL,
      previous_school TEXT,
      UNIQUE(name, class)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(category_id, name),
      FOREIGN KEY(category_id) REFERENCES categories(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stock(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      size TEXT,
      quantity INTEGER DEFAULT 0,
      FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions_v2(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      stock_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(stock_id) REFERENCES stock(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stock_logs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT,
      item_name TEXT,
      size TEXT,
      quantity INTEGER,
      action TEXT,
      date TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed Categories if empty
  db.get("SELECT count(*) as count FROM categories", (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare("INSERT INTO categories (name) VALUES (?)");
      stmt.run("Uniform");
      stmt.run("Kit");
      stmt.finalize();
    }
  });
});

module.exports = db;
