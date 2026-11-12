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
 * features/leveling - XP for chatting. (Level-ups/rewards: service.js, daily reward: daily.js)
 * Event: message. Data: table "levels" (database/repositories/levels.js).
 * Anti-spam: one XP gain per XP_COOLDOWN_SECONDS per person, bots and commands give nothing.
 */
const config = require('../../config');
const levels = require('../../database/repositories/levels');
const { randomXp } = require('./xp');
const { award } = require('./service');

const cfg = config.leveling;

async function onMessage(m) {
  if (!m.server_id || m.author_bot || !m.author_id) return;
  if (config.serverId && m.server_id !== config.serverId) return;
  if (cfg.ignoredChannels.has(m.channel_id)) return;
  if (m.command || (m.content ?? '').startsWith(config.prefix)) return;
  if ((m.content ?? '').trim().length < 3) return;

  const now = Date.now();
  const row = levels.getOrBlank(m.server_id, m.author_id, m.author);
  row.username = m.author ?? row.username;
  row.messages += 1;

  if (now - row.last_xp_at < cfg.cooldownMs) {
    levels.save(row); // still count the message
    return;
  }
  row.last_xp_at = now;
  award(row, randomXp(cfg.xpMin, cfg.xpMax), m.channel_id);
}

module.exports = {
  name: 'leveling',
  enabled: () => cfg.enabled,
  register(router) {
    router.on('message', onMessage);
  },
};
