/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** /leaderboard - top 10 by XP */
const levels = require('../database/repositories/levels');
const { embed } = require('../utils/ui');

const medals = ['🥇', '🥈', '🥉'];

module.exports = {
  name: 'leaderboard',
  description: 'Top 10 most active members',
  needs: 'leveling',
  async run(ctx) {
    const rows = levels.top(ctx.serverId, 10);
    if (!rows.length) return ctx.reply({ content: 'Nobody has XP yet.' });
    const lines = rows.map((r, i) => `${medals[i] ?? `**${i + 1}.**`} ${r.username ?? r.user_id} — level **${r.level}** (${r.xp} XP)`);
    await ctx.reply({ embeds: [embed({ title: '🏆 Leaderboard', description: lines.join('\n'), color: '#fee75c' })] });
  },
};
