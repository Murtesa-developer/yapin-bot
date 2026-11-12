/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** All SQL for the ticket feature. */
const db = require('../db');

const insert = db.prepare(
  'INSERT INTO tickets (server_id, user_id, username, status, created_at) VALUES (?, ?, ?, \'open\', ?)'
);
const attach = db.prepare('UPDATE tickets SET channel_id = ?, role_id = ? WHERE id = ?');
const byChannel = db.prepare('SELECT * FROM tickets WHERE channel_id = ?');
const openByUser = db.prepare('SELECT * FROM tickets WHERE server_id = ? AND user_id = ? AND status = \'open\'');
const close = db.prepare('UPDATE tickets SET status = \'closed\', closed_at = ?, closed_by = ? WHERE id = ?');
const remove = db.prepare('DELETE FROM tickets WHERE id = ?');

module.exports = {
  create: (serverId, userId, username) => Number(insert.run(serverId, userId, username ?? null, Date.now()).lastInsertRowid),
  attach: (id, channelId, roleId) => void attach.run(channelId, roleId ?? null, id),
  byChannel: (channelId) => byChannel.get(channelId) ?? null,
  openByUser: (serverId, userId) => openByUser.all(serverId, userId),
  close: (id, closedBy) => void close.run(Date.now(), closedBy, id),
  remove: (id) => void remove.run(id),
};
