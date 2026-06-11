const { createClient } = require('@libsql/client');
const { TURSO_URL, TURSO_TOKEN } = require('./config');

const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      range TEXT NOT NULL,
      UNIQUE(user1_id, user2_id)
    )
  `);
  console.log('[DB] Ship table ready');
}

async function getShipRange(user1_id, user2_id) {
  const [a, b] = [user1_id, user2_id].sort();
  const result = await db.execute({
    sql: 'SELECT range FROM ships WHERE user1_id = ? AND user2_id = ?',
    args: [a, b],
  });
  return result.rows[0]?.range ?? null;
}

module.exports = { initDB, getShipRange };
