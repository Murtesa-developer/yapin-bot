/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** All SQL for the leveling feature (xp, levels, daily reward). */
const db = require('../db');

const get = db.prepare('SELECT * FROM levels WHERE server_id = ? AND user_id = ?');
const upsert = db.prepare(`
  INSERT INTO levels (server_id, user_id, username, xp, level, messages, last_xp_at, daily_at, daily_streak)
  VALUES (@server_id, @user_id, @username, @xp, @level, @messages, @last_xp_at, @daily_at, @daily_streak)
  ON CONFLICT(server_id, user_id) DO UPDATE SET
    username = excluded.username, xp = excluded.xp, level = excluded.level,
    messages = excluded.messages, last_xp_at = excluded.last_xp_at,
    daily_at = excluded.daily_at, daily_streak = excluded.daily_streak
`);
const top = db.prepare('SELECT * FROM levels WHERE server_id = ? ORDER BY xp DESC LIMIT ?');
const rankOf = db.prepare('SELECT COUNT(*) + 1 AS rank FROM levels WHERE server_id = ? AND xp > ?');

const blank = (serverId, userId, username) => ({
  server_id: serverId, user_id: userId, username: username ?? null,
  xp: 0, level: 0, messages: 0, last_xp_at: 0, daily_at: 0, daily_streak: 0,
});

module.exports = {
  blank,
  get: (serverId, userId) => get.get(serverId, userId) ?? null,
  getOrBlank: (serverId, userId, username) => get.get(serverId, userId) ?? blank(serverId, userId, username),
  save: (row) => void upsert.run(row),
  top: (serverId, limit = 10) => top.all(serverId, limit),
  rank: (serverId, xp) => rankOf.get(serverId, xp).rank,
};
