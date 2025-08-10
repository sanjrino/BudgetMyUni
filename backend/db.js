const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();


function makePool() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: 'Z', 
  });

  pool.on('connection', () => {
    console.log('[MySQL] pool connection opened');
  });

  pool.on('error', (err) => {
    console.error('[MySQL] pool error:', err && err.code, err && err.message);
  });

  setInterval(() => {
    pool.query('SELECT 1', () => {});
  }, 60 * 1000);

  console.log('[MySQL] pool created');
  return pool;
}

let pool = makePool();

function isRetryable(err) {
  if (!err) return false;
  const code = String(err.code || '').toUpperCase();
  const msg = String(err.message || '').toLowerCase();
  return (
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ECONNRESET' ||
    code === 'ER_SERVER_SHUTDOWN' ||
    msg.includes('closed state') ||
    msg.includes('cannot enqueue') ||
    msg.includes('read econnreset') ||
    msg.includes('write after end')
  );
}

function recreatePool() {
  try {
    if (pool && pool.end) pool.end(() => {});
  } catch {}
  pool = makePool();
}

function queryCb(sql, params, cb) {
  if (typeof params === 'function') { cb = params; params = []; }
  pool.query(sql, params, (err, rows, fields) => {
    if (!err) return cb && cb(null, rows, fields);
    if (isRetryable(err)) {
      console.warn('[MySQL] retrying query after pool error:', err.code || err.message);
      recreatePool();
      return pool.query(sql, params, (err2, rows2, fields2) => {
        if (err2) return cb && cb(err2);
        cb && cb(null, rows2, fields2);
      });
    }
    cb && cb(err);
  });
}

function executeCb(sql, params, cb) {
  if (typeof params === 'function') { cb = params; params = []; }
  pool.execute(sql, params, (err, rows, fields) => {
    if (!err) return cb && cb(null, rows, fields);
    if (isRetryable(err)) {
      console.warn('[MySQL] retrying execute after pool error:', err.code || err.message);
      recreatePool();
      return pool.execute(sql, params, (err2, rows2, fields2) => {
        if (err2) return cb && cb(err2);
        cb && cb(null, rows2, fields2);
      });
    }
    cb && cb(err);
  });
}

function getConnectionCb(cb) {
  pool.getConnection((err, conn) => {
    if (!err) return cb && cb(null, conn);
    if (isRetryable(err)) {
      console.warn('[MySQL] retrying getConnection after pool error:', err.code || err.message);
      recreatePool();
      return pool.getConnection(cb);
    }
    cb && cb(err);
  });
}


function beginTransaction(cb) {
  getConnectionCb((err, conn) => {
    if (err) return cb && cb(err);

    conn.beginTransaction((err2) => {
      if (err2) { try { conn.release(); } catch {} return cb && cb(err2); }

      const release = () => { try { conn.release(); } catch {} };

      const tx = {
        query(sql, params, cb2) {
          if (typeof params === 'function') { cb2 = params; params = []; }
          conn.query(sql, params, cb2);
        },
        execute(sql, params, cb2) {
          if (typeof params === 'function') { cb2 = params; params = []; }
          conn.execute(sql, params, cb2);
        },
        commit(cb2) {
          conn.commit((errC) => { release(); cb2 && cb2(errC); });
        },
        rollback(cb2) {
          conn.rollback(() => { release(); cb2 && cb2(); });
        }
      };

      cb && cb(null, tx);
    });
  });
}

function promiseApi() {
  return pool.promise();
}

const db = {
  query: queryCb,
  execute: executeCb,
  getConnection: getConnectionCb,
  beginTransaction,

  escape: mysql.escape,
  format: mysql.format,

  promise: promiseApi,

  _getPool: () => pool,
  _recreate: recreatePool,
};

module.exports = db;
