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
 * features/leveling/daily.js - the daily reward.
 * Claim once per DAILY_COOLDOWN_HOURS. Claim again within 2x the cooldown to keep your streak,
 * every streak day adds DAILY_STREAK_BONUS xp (up to DAILY_STREAK_MAX_DAYS).
 */
const config = require('../../config');
const levels = require('../../database/repositories/levels');
const { randomXp } = require('./xp');
const { award } = require('./service');

const d = config.leveling.daily;

/** Returns { ok:false, retryInMs } or { ok:true, xp, base, bonus, streak, level, leveledUp } */
function claim(serverId, userId, username, channelId, now = Date.now()) {
  const row = levels.getOrBlank(serverId, userId, username);
  row.username = username ?? row.username;

  const since = now - row.daily_at;
  if (row.daily_at && since < d.cooldownMs) return { ok: false, retryInMs: d.cooldownMs - since };

  const streak = row.daily_at && since <= d.cooldownMs * 2 ? row.daily_streak + 1 : 1;
  const base = randomXp(d.xpMin, d.xpMax);
  const bonus = d.streakBonus * (Math.min(streak, d.streakMaxDays) - 1);
  row.daily_at = now;
  row.daily_streak = streak;

  const { leveledUp, level } = award(row, base + bonus, channelId);
  return { ok: true, xp: base + bonus, base, bonus, streak, level, leveledUp, total: row.xp };
}

const formatWait = (ms) => {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

module.exports = { claim, formatWait };
