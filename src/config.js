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
 * config.js - reads .env ONCE and exposes a clean, typed config object.
 * Every other file imports this instead of touching process.env.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile); // built into Node 22, no dotenv needed

const str = (k, d = '') => (process.env[k] ?? d).trim();
const bool = (k, d = false) => {
  const v = str(k, String(d)).toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(v);
};
const int = (k, d) => {
  const n = parseInt(str(k, String(d)), 10);
  return Number.isFinite(n) ? n : d;
};
const list = (k) => str(k).split(',').map((s) => s.trim()).filter(Boolean);

/** "5:roleId,10:roleId" -> [{level:5, roleId}] sorted ascending */
function parseLevelRoles(raw) {
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [lvl, roleId] = p.split(':').map((s) => s.trim());
      return { level: parseInt(lvl, 10), roleId };
    })
    .filter((r) => Number.isFinite(r.level) && r.roleId)
    .sort((a, b) => a.level - b.level);
}

const config = {
  root: ROOT,
  token: str('BOT_TOKEN'),
  serverId: str('SERVER_ID'),
  prefix: str('COMMAND_PREFIX', '!'),
  debug: bool('DEBUG'),
  connectionMode: str('CONNECTION_MODE', 'gateway').toLowerCase(),
  apiBase: 'https://bots.yapper.website/api/bot/v1',
  apiFallbackBase: 'https://www.yapin.gg/api/bot/v1',
  gatewayUrl: 'wss://rt.yapper.website/bot',

  dbPath: path.resolve(ROOT, str('DB_PATH', './data/bot.db')),

  welcome: {
    enabled: bool('WELCOME_ENABLED', true),
    channelId: str('WELCOME_CHANNEL_ID'),
    title: str('WELCOME_TITLE', 'Welcome!'),
    message: str('WELCOME_MESSAGE', 'Welcome {user} to **{server}**! You are member #{count}.'),
    color: str('WELCOME_COLOR', '#5865f2'),
    embed: bool('WELCOME_EMBED', true), // false = plain text message
    dm: bool('WELCOME_DM'),
    goodbyeChannelId: str('GOODBYE_CHANNEL_ID'),
    goodbyeMessage: str('GOODBYE_MESSAGE', '{username} left the server.'),
  },

  verification: {
    enabled: bool('VERIFY_ENABLED', true),
    channelId: str('VERIFY_CHANNEL_ID'),
    roleId: str('VERIFIED_ROLE_ID'),
    unverifiedRoleId: str('UNVERIFIED_ROLE_ID'),
    embed: bool('VERIFY_EMBED', true), // false = plain text message above the button
    logChannelId: str('VERIFY_LOG_CHANNEL_ID'),
    mode: str('VERIFY_MODE', 'captcha').toLowerCase(),
    title: str('VERIFY_TITLE', 'Verification'),
    message: str('VERIFY_MESSAGE', 'Press the button below to verify.'),
  },

  tickets: {
    enabled: bool('TICKETS_ENABLED', true),
    panelChannelId: str('TICKET_PANEL_CHANNEL_ID'),
    categoryId: str('TICKET_CATEGORY_ID'),
    staffRoleId: str('TICKET_STAFF_ROLE_ID'),
    logChannelId: str('TICKET_LOG_CHANNEL_ID'),
    maxPerUser: int('MAX_TICKETS_PER_USER', 1),
    mode: str('TICKET_MODE', 'private').toLowerCase(),
    title: str('TICKET_TITLE', 'Support'),
    message: str('TICKET_MESSAGE', 'Press the button to open a ticket.'),
  },

  leveling: {
    enabled: bool('LEVELING_ENABLED', true),
    levelUpChannelId: str('LEVEL_UP_CHANNEL_ID'),
    xpMin: int('XP_MIN', 15),
    xpMax: int('XP_MAX', 25),
    cooldownMs: int('XP_COOLDOWN_SECONDS', 60) * 1000,
    roles: parseLevelRoles(str('LEVEL_ROLES')),
    ignoredChannels: new Set(list('XP_IGNORED_CHANNELS')),
    daily: {
      enabled: bool('DAILY_ENABLED', true),
      xpMin: int('DAILY_XP_MIN', 100),
      xpMax: int('DAILY_XP_MAX', 200),
      streakBonus: int('DAILY_STREAK_BONUS', 25), // extra XP per streak day
      streakMaxDays: int('DAILY_STREAK_MAX_DAYS', 7), // bonus stops growing here
      cooldownMs: int('DAILY_COOLDOWN_HOURS', 24) * 3600 * 1000,
    },
  },

  moderation: {
    enabled: bool('MODERATION_ENABLED', true),
    // who may use !kick / !timeout / !unmute: the server owner plus these roles
    roleIds: list('MOD_ROLE_IDS'),
    // also allow anyone whose role has the Yapin' permission: kick_members (/kick),
    // timeout_members (/timeout /unmute), or manage_server / administrator (all of them)
    usePermissions: bool('MOD_USE_ROLE_PERMISSIONS', true),
    logChannelId: str('MOD_LOG_CHANNEL_ID'),
    defaultTimeoutMinutes: int('DEFAULT_TIMEOUT_MINUTES', 10),
  },
};

/** Returns a list of human readable problems (empty = all good). */
config.validate = function validate() {
  const problems = [];
  if (!config.token || config.token.includes('put_your')) problems.push('BOT_TOKEN is missing in .env');
  if (config.welcome.enabled && !config.welcome.channelId) problems.push('WELCOME_CHANNEL_ID is empty (welcome disabled until set)');
  if (config.verification.enabled && (!config.verification.channelId || !config.verification.roleId))
    problems.push('VERIFY_CHANNEL_ID and VERIFIED_ROLE_ID are needed for verification (disabled until set)');
  if (config.tickets.enabled && !config.tickets.panelChannelId)
    problems.push('TICKET_PANEL_CHANNEL_ID is empty (tickets disabled until set)');
  if (config.tickets.enabled && !config.tickets.staffRoleId)
    problems.push('TICKET_STAFF_ROLE_ID is empty (staff will not be added to tickets)');
  return problems;
};

module.exports = config;
