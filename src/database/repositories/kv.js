/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** Key/value store (panel message ids etc). */
const db = require('../db');

const getStmt = db.prepare('SELECT value FROM kv WHERE key = ?');
const setStmt = db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
const delStmt = db.prepare('DELETE FROM kv WHERE key = ?');

module.exports = {
  get: (key) => getStmt.get(key)?.value ?? null,
  set: (key, value) => void setStmt.run(key, String(value)),
  delete: (key) => void delStmt.run(key),
};
