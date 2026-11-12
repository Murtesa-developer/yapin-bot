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
 * utils/access.js - who may use the moderation commands.
 * Allowed when ANY of these is true:
 *   1. the person is the server owner
 *   2. one of their roles is in MOD_ROLE_IDS (.env) or was added by the owner with /modrole add
 *   3. (MOD_USE_ROLE_PERMISSIONS=true) one of their roles has the Yapin' permission needed:
 *        kick_members    -> /kick
 *        timeout_members -> /timeout, /unmute
 *        manage_server or administrator -> every moderation command
 */
const config = require('../config');
const api = require('../core/api');
const modRoles = require('../database/repositories/modroles');
const { memberRoleIds } = require('./server');

const cache = new Map(); // serverId -> { at, roles }
async function rolesOf(serverId) {
  const hit = cache.get(serverId);
  if (hit && Date.now() - hit.at < 60_000) return hit.roles;
  const roles = await api.getRoles(serverId);
  cache.set(serverId, { at: Date.now(), roles });
  return roles;
}

async function isOwner(serverId, userId) {
  try {
    const s = await api.getServer(serverId);
    const owner = s.server?.owner_id ?? s.owner_id;
    return Boolean(owner) && owner === userId;
  } catch {
    return false;
  }
}

/** perm: 'kick_members' | 'timeout_members' */
async function canModerate(serverId, userId, perm) {
  if (await isOwner(serverId, userId)) return true;

  let mine;
  try { mine = await memberRoleIds(serverId, userId); } catch { return false; }

  const granted = new Set([...config.moderation.roleIds, ...modRoles.list(serverId)]);
  if (mine.some((r) => granted.has(r))) return true;

  if (config.moderation.usePermissions) {
    try {
      const roles = await rolesOf(serverId);
      for (const role of roles) {
        if (!mine.includes(role.id)) continue;
        const p = role.perms ?? {};
        if (p.administrator || p.manage_server || p[perm]) return true;
      }
    } catch { /* roles unreadable: no extra access */ }
  }
  return false;
}

module.exports = { canModerate, isOwner };
