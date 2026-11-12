/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
module.exports = {
  name: 'ping',
  description: 'Check the bot is alive',
  async run(ctx) {
    await ctx.reply({ content: '🏓 Pong!' });
  },
};
