// server.js - Node.js + Express Backend
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
const db = new sqlite3.Database('./inventory.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize Database Tables
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      price REAL DEFAULT 0,
      supplier TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      notes TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Registration failed' });
        }
        res.status(201).json({ 
          message: 'User registered successfully',
          userId: this.lastID 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// ==================== INVENTORY ROUTES ====================

// Get all items
app.get('/api/items', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch items' });
      }
      res.json(items);
    }
  );
});

// Get single item
app.get('/api/items/:id', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM items WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, item) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch item' });
      }
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    }
  );
});

// Create item
app.post('/api/items', authenticateToken, (req, res) => {
  const { name, sku, category, quantity, min_stock, price, supplier } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: 'Name and SKU are required' });
  }

  db.run(
    `INSERT INTO items (name, sku, category, quantity, min_stock, price, supplier, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, sku, category || '', quantity || 0, min_stock || 0, price || 0, supplier || '', req.user.id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'SKU already exists' });
        }
        return res.status(500).json({ error: 'Failed to create item' });
      }
      res.status(201).json({
        message: 'Item created successfully',
        id: this.lastID
      });
    }
  );
});

// Update item
app.put('/api/items/:id', authenticateToken, (req, res) => {
  const { name, sku, category, quantity, min_stock, price, supplier } = req.body;

  db.run(
    `UPDATE items 
     SET name = ?, sku = ?, category = ?, quantity = ?, min_stock = ?, 
         price = ?, supplier = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [name, sku, category, quantity, min_stock, price, supplier, req.params.id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update item' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json({ message: 'Item updated successfully' });
    }
  );
});

// Delete item
app.delete('/api/items/:id', authenticateToken, (req, res) => {
  db.run(
    'DELETE FROM items WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete item' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json({ message: 'Item deleted successfully' });
    }
  );
});

// Get low stock items
app.get('/api/items/alerts/low-stock', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM items WHERE quantity <= min_stock AND user_id = ?',
    [req.user.id],
    (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch low stock items' });
      }
      res.json(items);
    }
  );
});

// ==================== TRANSACTION ROUTES ====================

// Record transaction (stock in/out)
app.post('/api/transactions', authenticateToken, (req, res) => {
  const { item_id, type, quantity, notes } = req.body;

  if (!item_id || !type || !quantity) {
    return res.status(400).json({ error: 'Item ID, type, and quantity required' });
  }

  if (!['in', 'out'].includes(type)) {
    return res.status(400).json({ error: 'Type must be "in" or "out"' });
  }

  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Record transaction
    db.run(
      'INSERT INTO transactions (item_id, type, quantity, notes, user_id) VALUES (?, ?, ?, ?, ?)',
      [item_id, type, quantity, notes || '', req.user.id],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to record transaction' });
        }

        // Update item quantity
        const quantityChange = type === 'in' ? quantity : -quantity;
        db.run(
          'UPDATE items SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [quantityChange, item_id],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to update quantity' });
            }

            db.run('COMMIT');
            res.status(201).json({ 
              message: 'Transaction recorded successfully',
              transactionId: this.lastID 
            });
          }
        );
      }
    );
  });
});

// Get transaction history
app.get('/api/transactions', authenticateToken, (req, res) => {
  const { item_id } = req.query;

  let query = `
    SELECT t.*, i.name as item_name, i.sku 
    FROM transactions t
    JOIN items i ON t.item_id = i.id
    WHERE t.user_id = ?
  `;
  const params = [req.user.id];

  if (item_id) {
    query += ' AND t.item_id = ?';
    params.push(item_id);
  }

  query += ' ORDER BY t.created_at DESC LIMIT 100';

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
    res.json(transactions);
  });
});

// ==================== DASHBOARD/STATS ====================

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const stats = {};

  db.get(
    'SELECT COUNT(*) as total_items, SUM(quantity) as total_quantity FROM items WHERE user_id = ?',
    [req.user.id],
    (err, itemStats) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
      stats.items = itemStats;

      db.get(
        'SELECT SUM(quantity * price) as total_value FROM items WHERE user_id = ?',
        [req.user.id],
        (err, valueStats) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch value stats' });
          }
          stats.total_value = valueStats.total_value || 0;

          db.get(
            'SELECT COUNT(*) as low_stock_count FROM items WHERE quantity <= min_stock AND user_id = ?',
            [req.user.id],
            (err, lowStockStats) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to fetch low stock stats' });
              }
              stats.low_stock = lowStockStats.low_stock_count;
              res.json(stats);
            }
          );
        }
      );
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});