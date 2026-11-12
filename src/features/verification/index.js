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
 * features/verification
 *  - posts a "Verify" panel in VERIFY_CHANNEL_ID (once, kept up to date)
 *  - mode "button":  one click gives VERIFIED_ROLE_ID
 *  - mode "captcha": click Verify -> private question "click the 🍎" -> right emoji gives the role
 * Buttons: verify:start | verify:ok:<n> | verify:bad:<n>
 */
const config = require('../../config');
const api = require('../../core/api');
const verifications = require('../../database/repositories/verifications');
const { embed, button, row, mention, channelLink } = require('../../utils/ui');
const { ensurePanel } = require('../../utils/panel');
const { hasRole } = require('../../utils/server');
const log = require('../../utils/logger').child('verify');

const cfg = config.verification;
const EMOJIS = ['🍎', '🐶', '🚗', '⭐', '🎈', '🍕', '🌵', '⚽', '🎸', '🐢', '🌙', '🔑'];

const reply = (i, content) => api.interactionCallback(i.id, i.token, { type: 'ephemeral', content });

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function grant(i) {
  const serverId = i.server_id;
  if (await hasRole(serverId, i.user_id, cfg.roleId)) {
    return reply(i, '✅ You are already verified.');
  }
  await api.addRole(serverId, i.user_id, cfg.roleId);
  if (cfg.unverifiedRoleId) await api.removeRole(serverId, i.user_id, cfg.unverifiedRoleId).catch(() => {});
  verifications.mark(serverId, i.user_id, i.username);
  log.ok(`verified ${i.username ?? i.user_id}`);

  if (cfg.logChannelId) {
    api.sendMessage(cfg.logChannelId, { content: `✅ ${mention(i.user_id)} verified.` }).catch(() => {});
  }
  return reply(i, '✅ You are verified! Welcome in.');
}

async function onStart(i) {
  if (config.serverId && i.server_id !== config.serverId) return;
  try {
    if (cfg.mode !== 'captcha') return await grant(i);

    // captcha: 4 emoji buttons, exactly one is correct
    const picks = shuffle([...EMOJIS]).slice(0, 4);
    const target = picks[Math.floor(Math.random() * picks.length)];
    const n = Math.random().toString(36).slice(2, 8);
    const buttons = picks.map((e) => button('secondary', e, `verify:${e === target ? 'ok' : 'bad'}:${n}:${e}`));
    await api.interactionCallback(i.id, i.token, {
      type: 'ephemeral',
      content: `🔒 Click the **${target}** to prove you are human.`,
      components: [row(...buttons)],
    });
  } catch (err) {
    log.error('verify start failed:', err.message);
    await reply(i, '⚠️ I could not verify you. Ask a moderator (my role must be above the verified role).').catch(() => {});
  }
}

async function onAnswer(i) {
  if (config.serverId && i.server_id !== config.serverId) return;
  try {
    if (i.custom_id.startsWith('verify:ok:')) return await grant(i);
    return await reply(i, '❌ Wrong one. Press **Verify** in the channel and try again.');
  } catch (err) {
    log.error('verify answer failed:', err.message);
    await reply(i, '⚠️ I could not give you the role. Tell a moderator.').catch(() => {});
  }
}

module.exports = {
  name: 'verification',
  enabled: () => cfg.enabled && cfg.channelId && cfg.roleId,
  register(router) {
    router.onButton('verify:start', onStart);
    router.onButton('verify:ok:', onAnswer);
    router.onButton('verify:bad:', onAnswer);
  },
  async onReady() {
    const components = [row(button('success', 'Verify', 'verify:start', '✅'))];
    await ensurePanel(
      'verify',
      cfg.channelId,
      cfg.embed
        ? { content: '', embeds: [embed({ title: `🔒 ${cfg.title}`, description: cfg.message, color: '#57f287' })], components }
        : { content: `**🔒 ${cfg.title}**\n${cfg.message}`, embeds: null, components }
    );
    log.info(`panel in ${channelLink(cfg.channelId)}, mode ${cfg.mode}`);
  },
};
