import SQLite from 'react-native-sqlite-storage';

// Enable debug logs if needed
SQLite.enablePromise(true);

export const getDBConnection = async () => {
  return SQLite.openDatabase({ name: 'transactions.db', location: 'default' });
};

export const createTable = async (db) => {
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
  await db.sqlBatch(batch);
};

export const getAllTransactions = async (db) => {
  const results = await db.executeSql('SELECT * FROM transactions ORDER BY id DESC');
  const rows = results[0].rows;
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    items.push(rows.item(i));
  }
  return items;
};

export const clearTransactions = async (db) => {
  await db.executeSql('DELETE FROM transactions');
};