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
 * commands/moderation.js - /kick  /timeout  /unmute
 *   !kick @user [reason]
 *   !timeout @user [10m|2h|1d|minutes] [reason]
 *   !unmute @user            (clears a timeout)
 * Who can use them: see utils/access.js (owner, /modrole roles, MOD_ROLE_IDS, role permissions). The bot also needs
 * the Kick Members / Timeout Members permission and a role above the target.
 */
const config = require('../config');
const api = require('../core/api');
const { canModerate } = require('../utils/access');
const { embed, mention } = require('../utils/ui');
const log = require('../utils/logger').child('mod');

const cfg = config.moderation;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** "<@id> rest of text" or "uuid rest of text" -> { userId, rest } */
function parseTarget(args) {
  const text = args.trim();
  const mention = /<@!?([^>\s]+)>/.exec(text);
  if (mention) return { userId: mention[1], rest: text.replace(mention[0], '').trim() };
  const raw = UUID.exec(text);
  if (raw) return { userId: raw[0], rest: text.replace(raw[0], '').trim() };
  return { userId: null, rest: text };
}

/** "10" "10m" "2h" "1d" -> minutes (null if not a duration) */
function parseDuration(token) {
  const m = /^(\d+)\s*(m|min|h|d)?$/i.exec(token ?? '');
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = (m[2] ?? 'm').toLowerCase();
  return unit === 'd' ? n * 1440 : unit === 'h' ? n * 60 : n;
}

/** Shared checks. Returns { userId, rest } or null (and has already replied). */
async function prepare(ctx, usage, perm) {
  if (!(await canModerate(ctx.serverId, ctx.userId, perm))) {
    await ctx.reply({ content: '⛔ You are not allowed to use this command.' });
    return null;
  }
  const t = parseTarget(ctx.args ?? '');
  if (!t.userId) {
    await ctx.reply({ content: `Mention someone. Usage: \`${usage}\`` });
    return null;
  }
  if (t.userId === ctx.userId) {
    await ctx.reply({ content: "You can't do that to yourself." });
    return null;
  }
  if (t.userId === ctx.botId) {
    await ctx.reply({ content: "I can't do that to myself." });
    return null;
  }
  return t;
}

async function record(ctx, action, targetId, extra) {
  log.ok(`${action} ${targetId} by ${ctx.username ?? ctx.userId}`);
  if (!cfg.logChannelId) return;
  await api.sendMessage(cfg.logChannelId, {
    embeds: [
      embed({
        title: `🔨 ${action}`,
        fields: [
          { name: 'User', value: mention(targetId), inline: true },
          { name: 'By', value: mention(ctx.userId), inline: true },
          ...(extra ? [{ name: 'Details', value: extra }] : []),
        ],
        color: '#ed4245',
      }),
    ],
  }).catch(() => {});
}

const failText = (err) =>
  `⚠️ It didn't work (${err.status ?? 'error'}). Check my permissions and that my role is above theirs.`;

const kick = {
  name: 'kick',
  description: 'Kick a member: /kick @user reason',
  needs: 'moderation',
  async run(ctx) {
    const t = await prepare(ctx, `${config.prefix}kick @user [reason]`, 'kick_members');
    if (!t) return;
    try {
      await api.kick(ctx.serverId, t.userId);
      await ctx.reply({ content: `👢 Kicked ${mention(t.userId)}${t.rest ? ` — ${t.rest}` : ''}` });
      await record(ctx, 'Kick', t.userId, t.rest || undefined);
    } catch (err) {
      await ctx.reply({ content: failText(err) });
    }
  },
};

const timeout = {
  name: 'timeout',
  description: 'Time out a member: /timeout @user 10m reason',
  needs: 'moderation',
  async run(ctx) {
    const t = await prepare(ctx, `${config.prefix}timeout @user [10m|2h|1d] [reason]`, 'timeout_members');
    if (!t) return;
    const [first, ...others] = t.rest.split(/\s+/).filter(Boolean);
    let minutes = parseDuration(first);
    const reason = minutes === null ? t.rest : others.join(' ');
    if (minutes === null) minutes = cfg.defaultTimeoutMinutes;
    minutes = Math.min(Math.max(minutes, 1), 40320); // 1 minute .. 28 days
    try {
      await api.timeout(ctx.serverId, t.userId, minutes, reason || undefined);
      await ctx.reply({ content: `🔇 Timed out ${mention(t.userId)} for **${minutes} min**${reason ? ` — ${reason}` : ''}` });
      await record(ctx, 'Timeout', t.userId, `${minutes} min${reason ? ` — ${reason}` : ''}`);
    } catch (err) {
      await ctx.reply({ content: failText(err) });
    }
  },
};

const unmute = {
  name: 'unmute',
  description: 'Remove a timeout: /unmute @user',
  needs: 'moderation',
  async run(ctx) {
    const t = await prepare(ctx, `${config.prefix}unmute @user`, 'timeout_members');
    if (!t) return;
    try {
      await api.timeout(ctx.serverId, t.userId, 0);
      await ctx.reply({ content: `🔊 Unmuted ${mention(t.userId)}` });
      await record(ctx, 'Unmute', t.userId);
    } catch (err) {
      await ctx.reply({ content: failText(err) });
    }
  },
};

module.exports = { kick, timeout, unmute, parseTarget, parseDuration };
