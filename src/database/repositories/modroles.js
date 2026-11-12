/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** Roles the server owner gave access to the moderation commands (/modrole). */
const db = require('../db');

const add = db.prepare('INSERT OR IGNORE INTO mod_roles (server_id, role_id, added_by) VALUES (?, ?, ?)');
const remove = db.prepare('DELETE FROM mod_roles WHERE server_id = ? AND role_id = ?');
const list = db.prepare('SELECT role_id FROM mod_roles WHERE server_id = ?');

module.exports = {
  add: (serverId, roleId, by) => void add.run(serverId, roleId, by ?? null),
  remove: (serverId, roleId) => Number(remove.run(serverId, roleId).changes) > 0,
  list: (serverId) => list.all(serverId).map((r) => r.role_id),
};
