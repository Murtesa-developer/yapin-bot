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
 * commands/modrole.js - the SERVER OWNER chooses which roles may use the bot's moderation commands.
 *   /modrole add @role      give the role access to /kick /timeout /unmute
 *   /modrole remove @role
 *   /modrole list
 * Stored in the database (table mod_roles). Only the server owner can use it.
 */
const config = require('../config');
const modRoles = require('../database/repositories/modroles');
const { isOwner } = require('../utils/access');

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const roleFrom = (text) => /<@&([^>\s]+)>/.exec(text)?.[1] ?? UUID.exec(text)?.[0] ?? null;

module.exports = {
  name: 'modrole',
  description: 'Owner only: give a role access to moderation: /modrole add @role',
  needs: 'moderation',
  async run(ctx) {
    if (!(await isOwner(ctx.serverId, ctx.userId))) return ctx.reply({ content: '⛔ Only the server owner can use this.' });

    const [sub = 'list', ...rest] = (ctx.args ?? '').trim().split(/\s+/);
    const roleId = roleFrom(rest.join(' '));

    if (sub === 'list') {
      const ids = [...new Set([...config.moderation.roleIds, ...modRoles.list(ctx.serverId)])];
      return ctx.reply({ content: ids.length ? `Roles with moderation access:\n${ids.map((r) => `• <@&${r}>`).join('\n')}` : 'No roles yet. Use `/modrole add @role`.' });
    }
    if (!roleId) return ctx.reply({ content: `Usage: \`${config.prefix}modrole add @role\`, \`remove @role\` or \`list\`` });

    if (sub === 'add') {
      modRoles.add(ctx.serverId, roleId, ctx.userId);
      return ctx.reply({ content: `✅ <@&${roleId}> can now use /kick, /timeout and /unmute.` });
    }
    if (sub === 'remove') {
      const had = modRoles.remove(ctx.serverId, roleId);
      return ctx.reply({ content: had ? `✅ Removed <@&${roleId}>.` : 'That role was not in the list (roles from .env must be removed there).' });
    }
    return ctx.reply({ content: `Usage: \`${config.prefix}modrole add @role\`, \`remove @role\` or \`list\`` });
  },
};
