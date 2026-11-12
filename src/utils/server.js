/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** Cached server lookups + role checks. */
const api = require('../core/api');

const names = new Map();

async function serverName(serverId) {
  if (names.has(serverId)) return names.get(serverId);
  try {
    const s = await api.getServer(serverId);
    const name = s.server?.name ?? s.name ?? 'the server';
    names.set(serverId, name);
    return name;
  } catch {
    return 'the server';
  }
}

/** Roles in the member payload may be ids or {id,name} objects: support both. */
async function memberRoleIds(serverId, userId) {
  const m = await api.getMember(serverId, userId);
  return (m.roles ?? []).map((r) => (typeof r === 'string' ? r : r.id));
}

async function hasRole(serverId, userId, roleId) {
  if (!roleId) return false;
  try {
    return (await memberRoleIds(serverId, userId)).includes(roleId);
  } catch {
    return false;
  }
}

module.exports = { serverName, memberRoleIds, hasRole };
