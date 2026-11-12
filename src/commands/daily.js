/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** /daily - claim your daily XP reward (with streak bonus) */
const { claim, formatWait } = require('../features/leveling/daily');
const { embed } = require('../utils/ui');

module.exports = {
  name: 'daily',
  description: 'Claim your daily XP reward',
  needs: 'daily',
  async run(ctx) {
    const r = claim(ctx.serverId, ctx.userId, ctx.username, ctx.channelId);
    if (!r.ok) return ctx.reply({ content: `⏳ You already claimed today. Come back in **${formatWait(r.retryInMs)}**.` });
    await ctx.reply({
      embeds: [
        embed({
          title: '🎁 Daily reward',
          description: `You got **+${r.xp} XP**${r.bonus ? ` (${r.base} + ${r.bonus} streak bonus)` : ''}.`,
          fields: [
            { name: 'Streak', value: `🔥 ${r.streak} day${r.streak === 1 ? '' : 's'}`, inline: true },
            { name: 'Level', value: String(r.level), inline: true },
          ],
          color: '#57f287',
        }),
      ],
    });
  },
};
