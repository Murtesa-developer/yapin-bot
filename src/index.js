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
 * src/index.js - entry point. Run with:  npm start
 *   1. load config + database
 *   2. register every enabled feature on the router
 *   3. connect to Yapin' and route events
 *   4. post / refresh the verification and ticket panels
 */
const config = require('./config');
const log = require('./utils/logger');
const api = require('./core/api');
const router = require('./core/router');
const Gateway = require('./core/gateway');
require('./database/db'); // opens + migrates the SQLite file
const commands = require('./commands');

const features = [
  require('./features/welcome'),
  require('./features/verification'),
  require('./features/tickets'),
  require('./features/leveling'),
];

async function main() {
  for (const p of config.validate()) log.warn(p);
  if (!config.token || config.token.includes('put_your')) {
    log.error('Set BOT_TOKEN in .env first (copy .env.example to .env).');
    process.exit(1);
  }

  const me = await api.me().catch((err) => {
    log.error(`Token rejected or API unreachable: ${err.message}`);
    process.exit(1);
  });
  const botId = me.id;
  log.ok(`logged in as ${me.display_name ?? me.username} (${botId})`);

  const active = features.filter((f) => f.enabled());
  for (const f of active) f.register(router);
  log.info(`features on: ${active.map((f) => f.name).join(', ') || 'none'}`);

  router.on('command', (d) => commands.onCommand(d, botId));
  router.on('message', (m) => commands.onMessage(m, botId));

  const gateway = new Gateway((type, data) => router.handle(type, data));
  gateway.start();
  await commands.register();

  for (const f of active) {
    if (f.onReady) await f.onReady().catch((err) => log.error(`${f.name} panel setup failed: ${err.message}`));
  }
  api.setStatus('online', 'Helping the community').catch(() => {});
  log.ok('bot is running. Press Ctrl+C to stop.');

  const stop = () => {
    log.info('shutting down…');
    gateway.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

process.on('unhandledRejection', (err) => log.error('unhandled rejection:', err));
main();
