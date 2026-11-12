/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** /rank - your level, xp and position */
const levels = require('../database/repositories/levels');
const { progress } = require('../features/leveling/xp');
const { embed } = require('../utils/ui');

const bar = (cur, max, size = 16) => {
  const filled = Math.round((cur / max) * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
};

module.exports = {
  name: 'rank',
  description: 'Show your level and XP',
  needs: 'leveling',
  async run(ctx) {
    const row = levels.get(ctx.serverId, ctx.userId);
    if (!row) return ctx.reply({ content: 'You have no XP yet. Chat a little first! 💬' });
    const p = progress(row.xp);
    await ctx.reply({
      embeds: [
        embed({
          title: `${ctx.username ?? 'You'} — Level ${p.level}`,
          description: `\`${bar(p.current, p.needed)}\`\n**${p.current} / ${p.needed}** XP to level ${p.level + 1}`,
          fields: [
            { name: 'Rank', value: `#${levels.rank(ctx.serverId, row.xp)}`, inline: true },
            { name: 'Total XP', value: String(row.xp), inline: true },
            { name: 'Messages', value: String(row.messages), inline: true },
          ],
          color: '#fee75c',
        }),
      ],
    });
  },
};
