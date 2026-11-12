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
 * features/leveling/service.js - the one place that adds XP.
 * Used by chatting (index.js) and by the daily reward (daily.js), so level-up
 * messages and role rewards always behave the same.
 */
const config = require('../../config');
const api = require('../../core/api');
const levels = require('../../database/repositories/levels');
const { progress } = require('./xp');
const { mention } = require('../../utils/ui');
const log = require('../../utils/logger').child('leveling');

const cfg = config.leveling;

async function giveRewards(serverId, userId, level) {
  for (const r of cfg.roles) {
    if (level >= r.level) {
      await api.addRole(serverId, userId, r.roleId).catch((e) => log.warn(`reward role ${r.roleId} failed: ${e.message}`));
    }
  }
}

/**
 * Add xp to a row, save it, announce a level-up if there is one.
 * `row` is a levels row (mutated). Returns { leveledUp, level }.
 */
function award(row, amount, channelId) {
  row.xp += amount;
  const newLevel = progress(row.xp).level;
  const leveledUp = newLevel > row.level;
  row.level = newLevel;
  levels.save(row);

  if (leveledUp) {
    log.ok(`${row.username ?? row.user_id} reached level ${newLevel}`);
    const target = cfg.levelUpChannelId || channelId;
    if (target) api.sendMessage(target, { content: `🎉 ${mention(row.user_id)} reached **level ${newLevel}**!` }).catch(() => {});
    giveRewards(row.server_id, row.user_id, newLevel);
  }
  return { leveledUp, level: newLevel };
}

module.exports = { award };
