/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/**
 * database/db.js - opens the local SQLite file (node:sqlite, built into Node 22) and runs migrations.
 * No native modules, nothing to install. The file lives in data/bot.db (see DB_PATH in .env).
 */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const log = require('../utils/logger').child('db');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error('This bot needs Node.js 22.13 or newer (it uses the built-in node:sqlite). Run: node -v');
  process.exit(1);
}

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL;');

/** Migrations run in order, once each. To change the schema: append a new entry, never edit old ones. */
const migrations = [
  {
    name: '001_initial',
    sql: `
      CREATE TABLE levels (
        server_id  TEXT NOT NULL,
        user_id    TEXT NOT NULL,
        username   TEXT,
        xp         INTEGER NOT NULL DEFAULT 0,
        level      INTEGER NOT NULL DEFAULT 0,
        messages   INTEGER NOT NULL DEFAULT 0,
        last_xp_at INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (server_id, user_id)
      );
      CREATE INDEX idx_levels_rank ON levels (server_id, xp DESC);

      CREATE TABLE tickets (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id   TEXT NOT NULL,
        channel_id  TEXT,
        user_id     TEXT NOT NULL,
        username    TEXT,
        role_id     TEXT,
        status      TEXT NOT NULL DEFAULT 'open',
        created_at  INTEGER NOT NULL,
        closed_at   INTEGER,
        closed_by   TEXT
      );
      CREATE INDEX idx_tickets_user ON tickets (server_id, user_id, status);
      CREATE INDEX idx_tickets_channel ON tickets (channel_id);

      CREATE TABLE verifications (
        server_id   TEXT NOT NULL,
        user_id     TEXT NOT NULL,
        username    TEXT,
        verified_at INTEGER NOT NULL,
        PRIMARY KEY (server_id, user_id)
      );

      -- generic key/value store: panel message ids, counters, anything small
      CREATE TABLE kv (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    name: '002_daily_reward',
    sql: `
      ALTER TABLE levels ADD COLUMN daily_at INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE levels ADD COLUMN daily_streak INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    name: '003_mod_roles',
    sql: `
      CREATE TABLE mod_roles (
        server_id TEXT NOT NULL,
        role_id   TEXT NOT NULL,
        added_by  TEXT,
        PRIMARY KEY (server_id, role_id)
      );
    `,
  },
];

function migrate() {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
  const done = new Set(db.prepare('SELECT name FROM _migrations').all().map((r) => r.name));
  for (const m of migrations) {
    if (done.has(m.name)) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(m.name, Date.now());
      db.exec('COMMIT');
      log.ok(`migration applied: ${m.name}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

migrate();
module.exports = db;
