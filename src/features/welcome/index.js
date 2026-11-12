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
 * features/welcome - welcome embed when someone joins, optional DM, optional goodbye.
 * Event: member_join / member_leave. Config: config.welcome (.env WELCOME_*).
 */
const config = require('../../config');
const api = require('../../core/api');
const { embed, mention, fill } = require('../../utils/ui');
const { serverName } = require('../../utils/server');
const log = require('../../utils/logger').child('welcome');

const cfg = config.welcome;

function inScope(serverId) {
  return !config.serverId || config.serverId === serverId;
}

async function onJoin(d) {
  if (!inScope(d.server_id)) return;
  const server = await serverName(d.server_id);
  const vars = { user: mention(d.user_id), username: d.username ?? 'friend', server, count: d.member_count ?? '?' };
  const text = fill(cfg.message, vars);

  if (cfg.channelId) {
    await api.sendMessage(
      cfg.channelId,
      cfg.embed
        ? {
            content: mention(d.user_id), // the ping stays outside the card so it notifies
            embeds: [embed({ title: cfg.title, description: text, color: cfg.color, footer: `${server} • ${vars.count} members` })],
          }
        : { content: text }
    );
    log.info(`welcomed ${d.username ?? d.user_id}`);
  }

  if (cfg.dm) {
    try {
      const dm = await api.openDm(d.user_id);
      await api.sendMessage(dm, { content: fill(cfg.message, { ...vars, user: vars.username }) });
    } catch (err) {
      log.debug('could not DM new member:', err.message); // their DM settings may block bots
    }
  }
}

async function onLeave(d) {
  if (!inScope(d.server_id) || !cfg.goodbyeChannelId) return;
  const server = await serverName(d.server_id);
  await api.sendMessage(cfg.goodbyeChannelId, {
    content: fill(cfg.goodbyeMessage, { username: d.username ?? 'Someone', server, count: d.member_count ?? '?', user: d.username ?? 'Someone' }),
  });
}

module.exports = {
  name: 'welcome',
  enabled: () => cfg.enabled,
  register(router) {
    router.on('member_join', onJoin);
    router.on('member_leave', onLeave);
  },
};
