/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** Who verified and when. */
const db = require('../db');

const upsert = db.prepare(`
  INSERT INTO verifications (server_id, user_id, username, verified_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(server_id, user_id) DO UPDATE SET username = excluded.username, verified_at = excluded.verified_at
`);
const get = db.prepare('SELECT * FROM verifications WHERE server_id = ? AND user_id = ?');

module.exports = {
  mark: (serverId, userId, username) => void upsert.run(serverId, userId, username ?? null, Date.now()),
  get: (serverId, userId) => get.get(serverId, userId) ?? null,
};
