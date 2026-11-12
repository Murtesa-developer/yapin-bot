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
 * commands/ - slash commands (/rank) that also work as text commands (!rank).
 * Each command: { name, description, run(ctx) }.  ctx.reply(payload) answers in the right way
 * whether it came from the / menu (interaction) or from a chat message.
 * To add a command: create a file in this folder, add it to the `all` list below.
 */
const config = require('../config');
const api = require('../core/api');
const log = require('../utils/logger').child('commands');
const rank = require('./rank');
const leaderboard = require('./leaderboard');
const daily = require('./daily');
const ping = require('./ping');
const { kick, timeout, unmute } = require('./moderation');
const modrole = require('./modrole');

/** Add new commands to this list. `needs` ties a command to a feature switch in .env. */
const SWITCH = {
  leveling: () => config.leveling.enabled,
  daily: () => config.leveling.enabled && config.leveling.daily.enabled,
  moderation: () => config.moderation.enabled,
};
const all = [ping, rank, leaderboard, daily, kick, timeout, unmute, modrole].filter((c) => !c.needs || SWITCH[c.needs]());
const byName = new Map(all.map((c) => [c.name, c]));

async function register() {
  const list = all.map((c) => ({ name: c.name, description: c.description }));
  try {
    await api.registerCommands(list, true); // true: commands arrive as "command" events
    log.ok(`registered ${list.length} slash commands`);
  } catch (err) {
    log.warn(`slash interactions unavailable (${err.message}), using chat commands only`);
    await api.registerCommands(list).catch((e) => log.error('command registration failed:', e.message));
  }
}

/** From a "command" event (picked in the / menu) */
async function onCommand(d, botId) {
  const cmd = byName.get(d.command);
  if (!cmd) return;
  if (config.serverId && d.server_id !== config.serverId) return;
  await cmd.run({
    botId,
    serverId: d.server_id,
    userId: d.user_id,
    username: d.username,
    channelId: d.channel_id,
    args: d.args ?? '',
    reply: (payload) => api.interactionCallback(d.id, d.token, { type: 'reply', ...payload }),
  });
}

/** From a chat "message" event: "/rank" typed by hand or "!rank" */
async function onMessage(m, botId) {
  if (!m.server_id || m.author_bot) return;
  if (config.serverId && m.server_id !== config.serverId) return;

  let name = m.command;
  let args = m.args ?? '';
  if (name && Array.isArray(m.command_for) && m.command_for.length && botId && !m.command_for.includes(botId)) return;
  if (!name && (m.content ?? '').startsWith(config.prefix)) {
    const [first, ...rest] = m.content.slice(config.prefix.length).trim().split(/\s+/);
    name = (first ?? '').toLowerCase();
    args = rest.join(' ');
  }
  const cmd = name && byName.get(name);
  if (!cmd) return;
  await cmd.run({
    botId,
    serverId: m.server_id,
    userId: m.author_id,
    username: m.author,
    channelId: m.channel_id,
    args,
    reply: (payload) => api.sendMessage(m.channel_id, { ...payload, reply_to: m.id }),
  });
}

module.exports = { register, onCommand, onMessage };
