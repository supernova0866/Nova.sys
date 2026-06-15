const { createClient } = require('@libsql/client');
const { TURSO_URL, TURSO_TOKEN } = require('./config');

let db;
function getDB() {
  if (!db) db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  return db;
}

async function initDB() {
  const client = getDB();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ships (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id TEXT,
      user2_id TEXT,
      range    TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS authorized_users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      added_at INTEGER NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS command_stats (
      user_id TEXT NOT NULL,
      command TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, command)
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_names (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS denied_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      command TEXT NOT NULL,
      denied_at INTEGER NOT NULL
    )
  `);
  console.log('[DB] Tables ready');
}

// Ship functions
async function getShipRange(user1_id, user2_id) {
  const client = getDB();

  // Priority 1: both users match (order-insensitive)
  const exactRes = await client.execute({
    sql: `SELECT range FROM ships WHERE
          (user1_id = ? AND user2_id = ?) OR
          (user1_id = ? AND user2_id = ?)`,
    args: [user1_id, user2_id, user2_id, user1_id],
  });
  if (exactRes.rows.length) return exactRes.rows[0].range;

  // Priority 2: partial match (one user, other is NULL)
  const partialRes = await client.execute({
    sql: `SELECT range FROM ships WHERE
          (user1_id = ? AND user2_id IS NULL) OR
          (user2_id = ? AND user1_id IS NULL) OR
          (user1_id = ? AND user2_id IS NULL) OR
          (user2_id = ? AND user1_id IS NULL)`,
    args: [user1_id, user1_id, user2_id, user2_id],
  });

  if (!partialRes.rows.length) return null;

  if (partialRes.rows.length === 1) return partialRes.rows[0].range;

  // Two partial rows — average their ranges
  function parseRange(r) {
    const [min, max] = r.split('-').map(Number);
    return { min, max };
  }

  const ranges = partialRes.rows.map(r => parseRange(r.range));
  const avgMin = Math.round(ranges.reduce((s, r) => s + r.min, 0) / ranges.length);
  const avgMax = Math.round(ranges.reduce((s, r) => s + r.max, 0) / ranges.length);
  return `${avgMin}-${avgMax}`;
}

// Auth functions
async function isAuthorized(user_id) {
  const { OWNER_ID } = require('./config');
  if (user_id === OWNER_ID) return true;
  const result = await getDB().execute({
    sql: 'SELECT 1 FROM authorized_users WHERE user_id = ?',
    args: [user_id],
  });
  return result.rows.length > 0;
}

async function addAuth(user_id, username) {
  await getDB().execute({
    sql: 'INSERT OR REPLACE INTO authorized_users (user_id, username, added_at) VALUES (?, ?, ?)',
    args: [user_id, username, Date.now()],
  });
}

async function removeAuth(user_id) {
  await getDB().execute({
    sql: 'DELETE FROM authorized_users WHERE user_id = ?',
    args: [user_id],
  });
}

async function listAuth() {
  const result = await getDB().execute('SELECT user_id, username FROM authorized_users ORDER BY added_at ASC');
  return result.rows;
}

// Stats functions
async function recordCommand(user_id, username, command) {
  const client = getDB();
  await Promise.all([
    client.execute({
      sql: `INSERT INTO command_stats (user_id, command, count) VALUES (?, ?, 1)
            ON CONFLICT(user_id, command) DO UPDATE SET count = count + 1`,
      args: [user_id, command],
    }),
    client.execute({
      sql: `INSERT OR REPLACE INTO user_names (user_id, username) VALUES (?, ?)`,
      args: [user_id, username],
    }),
  ]);
}

async function recordDenied(user_id, command) {
  await getDB().execute({
    sql: 'INSERT INTO denied_stats (user_id, command, denied_at) VALUES (?, ?, ?)',
    args: [user_id, command, Date.now()],
  });
}

async function getGlobalStats() {
  const client = getDB();

  const totalRes = await client.execute(
    'SELECT SUM(count) as total FROM command_stats'
  );
  const total = Number(totalRes.rows[0]?.total ?? 0);

  const deniedRes = await client.execute(
    'SELECT COUNT(*) as total FROM denied_stats'
  );
  const denied = Number(deniedRes.rows[0]?.total ?? 0);

  const authRes = await client.execute(
    'SELECT COUNT(*) as total FROM authorized_users'
  );
  const authorizedUsers = Number(authRes.rows[0]?.total ?? 0);

  const topRes = await client.execute(
    'SELECT command, SUM(count) as total FROM command_stats GROUP BY command ORDER BY total DESC LIMIT 3'
  );
  const topCommands = topRes.rows;

  const allRes = await client.execute(
    'SELECT command, SUM(count) as total FROM command_stats GROUP BY command ORDER BY total DESC'
  );
  const allCommands = allRes.rows;

  return { total, denied, authorizedUsers, topCommands, allCommands };
}

async function getUserStats(user_id) {
  const client = getDB();

  const [userRes, globalRes, nameRes] = await Promise.all([
    client.execute({ sql: 'SELECT command, count FROM command_stats WHERE user_id = ? ORDER BY count DESC', args: [user_id] }),
    client.execute('SELECT SUM(count) as total FROM command_stats'),
    client.execute({ sql: 'SELECT username FROM user_names WHERE user_id = ?', args: [user_id] }),
  ]);

  const commands = userRes.rows;
  const userTotal = commands.reduce((sum, r) => sum + Number(r.count), 0);
  const globalTotal = Number(globalRes.rows[0]?.total ?? 0);
  const username = nameRes.rows[0]?.username ?? user_id;
  const topCommands = commands.slice(0, 3);
  const mostUsed = commands[0]?.command ?? null;

  return { commands, userTotal, globalTotal, topCommands, mostUsed, username };
}

module.exports = {
  initDB, getShipRange,
  isAuthorized, addAuth, removeAuth, listAuth,
  recordCommand, recordDenied, getGlobalStats, getUserStats,
};
