import SQLite from 'react-native-sqlite-storage';

// Enable promise-based API
SQLite.enablePromise(true);

// --- DB Connection ---
export const getDBConnection = async () => {
  return SQLite.openDatabase({ name: 'app.db', location: 'default' });
};

// ------------------
// --- TRANSACTIONS TABLE ---
// ------------------
export const createTransactionsTable = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sms_id TEXT UNIQUE,
      date TEXT,
      amount REAL,
      type TEXT,
      description TEXT,
      category TEXT
    );
  `;
  await db.executeSql(query);
};

// Save transactions (batch insert)
export const saveTransactions = async (db, transactions) => {
  const insertQuery = `
    INSERT OR IGNORE INTO transactions 
    (sms_id, date, amount, type, description, category) 
    VALUES (?, ?, ?, ?, ?, ?);
  `;
  const batch = transactions.map((t) => [
    insertQuery,
    [t.id, t.date, t.amount, t.type, t.description, t.category],
  ]);
  if (batch.length > 0) {
    await db.sqlBatch(batch);
  }
};

// Get all transactions
export const getAllTransactions = async (db) => {
  const results = await db.executeSql('SELECT * FROM transactions ORDER BY id DESC;');
  const rows = results[0].rows;
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    items.push(rows.item(i));
  }
  return items;
};

// Clear transactions
export const clearTransactions = async (db) => {
  await db.executeSql('DELETE FROM transactions;');
};

// ------------------
// --- USER TABLE ---
// ------------------
export const createUserTable = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT,
      email TEXT,
      photo TEXT
    );
  `;
  await db.executeSql(query);
};

// Save user profile (overwrite id=1)
export const saveUser = async (db, user) => {
  const query = `
    INSERT OR REPLACE INTO users (id, name, email, photo)
    VALUES (1, ?, ?, ?);
  `;
  await db.executeSql(query, [user.name, user.email, user.photo]);
};

// Get user profile safely
export const getUser = async (db) => {
  const results = await db.executeSql('SELECT * FROM users WHERE id = 1;');
  const rows = results[0].rows;
  if (rows.length > 0) {
    return rows.item(0);
  }
  return null;
};

// Clear user (optional)
export const clearUser = async (db) => {
  await db.executeSql('DELETE FROM users;');
};