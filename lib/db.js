/**
 * - Why not ORM?
 * - Someone tell me an ORM library that sucks less
 */

const os = require('os')
const path = require('path')
const sqlite3 = require('sqlite3')

const connect = () => new Promise((resolve, reject) => {
  const DB_PATH = process.env.NODE_ENV === 'development' ?
    path.join(__dirname, '..', 'debug.db') :
    path.join(os.homedir(), '.passionfruit.db')

  const db = new sqlite3.Database(DB_PATH, err => (err ? reject(err) : resolve(db)))
})

const SQL_INIT_TABLES = [
  `CREATE TABLE devices(
    id INTEGER PRIMARY KEY,
    uuid TEXT UNIQUE NOT NULL,
    title TEXT,
    preference TEXT
  );`,
  `CREATE TABLE apps(
    id INTEGER PRIMARY KEY,
    bundle TEXT,
    device_id INT,
    name TEXT,
    preference TEXT,    
    FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE (device_id, bundle) ON CONFLICT REPLACE
  );`,
  `CREATE TABLE logs(
    id INTEGER PRIMARY KEY,
    app_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    event TEXT NOT NULL,
    backtrace TEXT,
    msg TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(app_id) REFERENCES apps(id) ON DELETE CASCADE
  );`]

const setUp = () => new Promise(async (resolve, reject) => {
  const db = await connect()
  db.serialize(() =>
    SQL_INIT_TABLES.forEach(sql =>
      db.run(sql, err => err && reject(err))))
  db.close()
  resolve()
})

class DataBase {
  constructor() {
    this.db = null
    this.ready = false
  }

  async connect() {
    this.db = await connect()
    this.ready = true
  }

  async bulk(sql, list) {
    const { db } = this
    db.serialize(() => {
      db.exec('BEGIN')
      const stmt = db.prepare(sql)
      for (const row of list)
        stmt.run(...row)
      stmt.finalize()
      db.exec('COMMIT')
    })
  }

  async saveDevices(devices) {
    const list = devices.map(dev => [dev.id, dev.name])
    const sql = 'INSERT OR IGNORE INTO devices(uuid, title, preference) VALUES (?, ?, "{}")'
    return this.bulk(sql, list)
  }

  async saveApps(apps, uuid) {
    const list = apps.map(app => [app.identifier, uuid, app.name])
    const sql = `INSERT OR IGNORE INTO apps(bundle, device_id, name, preference) 
      VALUES (?, (SELECT id FROM devices WHERE uuid = ?), ?, "{}")`
    return this.bulk(sql, list)
  }

  disconnect() {
    if (this.ready)
      this.db.close()
  }
}

module.exports = {
  connect,
  setUp,

  DataBase,
}
