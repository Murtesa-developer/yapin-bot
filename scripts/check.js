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
 * scripts/check.js  (npm run check)
 * Offline self-test: fake Yapin' API + temp database. Drives welcome, verification,
 * tickets, leveling and commands through the real router and prints what the bot would do.
 */
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yb-'));
Object.assign(process.env, {
  BOT_TOKEN: 'yb_test', DB_PATH: path.join(tmp, 't.db'), SERVER_ID: 'S1',
  WELCOME_CHANNEL_ID: 'CW', VERIFY_CHANNEL_ID: 'CV', VERIFIED_ROLE_ID: 'RV',
  TICKET_PANEL_CHANNEL_ID: 'CT', TICKET_STAFF_ROLE_ID: 'RS', TICKET_LOG_CHANNEL_ID: 'CL',
  TICKET_CATEGORY_ID: 'CAT', LEVEL_ROLES: '1:RL1', MOD_ROLE_IDS: 'RM', VERIFY_EMBED: 'false', MOD_LOG_CHANNEL_ID: 'CM', DAILY_XP_MIN: '100', DAILY_XP_MAX: '100', DAILY_STREAK_BONUS: '25', XP_COOLDOWN_SECONDS: '0', XP_MIN: '100', XP_MAX: '100',
});

const calls = [];
let n = 0;
global.fetch = async (url, opts = {}) => {
  const p = url.replace(/^https:\/\/[^/]+\/api\/bot\/v1/, '');
  const body = opts.body ? JSON.parse(opts.body) : undefined;
  calls.push({ m: opts.method, p, body });
  const ok = (j, s = 200) => new Response(JSON.stringify(j), { status: s });
  if (p === '/me') return ok({ id: 'BOT', username: 'bot' });
  if (/\/servers\/S1$/.test(p)) return ok({ id: 'S1', name: 'Test Server', owner_id: 'OWN' });
  if (opts.method === 'GET' && /\/servers\/S1\/roles$/.test(p)) return ok({ roles: [{ id: 'RK', perms: { kick_members: true } }, { id: 'RT', perms: { timeout_members: true } }, { id: 'RA', perms: { manage_server: true } }] });
  if (/\/members\/U5$/.test(p)) return ok({ member: { roles: [{ id: 'RK' }] } });
  if (/\/members\/U6$/.test(p)) return ok({ member: { roles: ['RX'] } });
  if (/\/members\/U7$/.test(p)) return ok({ member: { roles: ['RA'] } });
  if (/\/members\/U2$/.test(p)) return ok({ member: { roles: ['RM'] } });
  if (/\/members\/U1$/.test(p)) return ok({ member: { roles: [] } });
  if (opts.method === 'POST' && /\/channels$/.test(p)) return ok({ channel: { id: 'TCH' + ++n } }, 201);
  if (opts.method === 'POST' && /\/roles$/.test(p)) return ok({ role: { id: 'TR' + ++n } }, 201);
  if (opts.method === 'POST' && /\/messages$/.test(p)) return ok({ message: { id: 'M' + ++n } }, 201);
  if (/\/channels\/TCH\d+$/.test(p) && opts.method === 'GET') return ok({ channel: {} });
  if (/\/messages\?/.test(p)) return ok({ messages: [{ author_id: 'U1', content: 'hello staff', created_at: '2026-01-01T10:00:00Z' }] });
  return ok({ ok: true });
};

const config = require('../src/config');
const router = require('../src/core/router');
const commands = require('../src/commands');
const features = [require('../src/features/welcome'), require('../src/features/verification'), require('../src/features/tickets'), require('../src/features/leveling')];
const tickets = require('../src/database/repositories/tickets');
const levels = require('../src/database/repositories/levels');
const { progress, totalXpForLevel } = require('../src/features/leveling/xp');

(async () => {
  for (const f of features) assert(f.enabled(), `${f.name} should be enabled`);
  for (const f of features) f.register(router);
  router.on('command', commands.onCommand);
  router.on('message', (m) => commands.onMessage(m, 'BOT'));
  const since = () => calls.splice(0);

  // xp math
  assert.deepStrictEqual(progress(0), { level: 0, current: 0, needed: 100 });
  assert.strictEqual(progress(totalXpForLevel(5)).level, 5);
  console.log('✓ xp math');

  // panels
  for (const f of features) if (f.onReady) await f.onReady();
  const panels = since().filter((c) => c.m === 'POST' && c.p.endsWith('/messages'));
  assert.strictEqual(panels.length, 2);
  console.log('✓ verification + ticket panels posted');

  // welcome
  await router.handle('member_join', { server_id: 'S1', user_id: 'U1', username: 'sam', member_count: 42 });
  const w = since().find((c) => c.p === '/channels/CW/messages');
  assert(w.body.embeds[0].description.includes('<@U1>') && w.body.embeds[0].description.includes('#42'));
  console.log('✓ welcome message');

  // verification (captcha): start, then answer correctly
  await router.handle('interaction', { id: 'I1', token: 'T', custom_id: 'verify:start', server_id: 'S1', channel_id: 'CV', user_id: 'U1', username: 'sam' });
  const q = since().find((c) => c.p.startsWith('/interactions/'));
  const good = q.body.components[0].components.find((b) => b.custom_id.startsWith('verify:ok:'));
  assert(good, 'captcha has a correct button');
  await router.handle('interaction', { id: 'I2', token: 'T', custom_id: good.custom_id, server_id: 'S1', channel_id: 'CV', user_id: 'U1', username: 'sam' });
  assert(since().some((c) => c.m === 'PUT' && c.p === '/servers/S1/members/U1/roles/RV'));
  console.log('✓ verification gives role');

  // tickets
  await router.handle('interaction', { id: 'I3', token: 'T', custom_id: 'ticket:open', server_id: 'S1', channel_id: 'CT', user_id: 'U1', username: 'sam' });
  const t = since();
  assert(t.some((c) => c.m === 'PUT' && c.p.includes('/permissions/everyone')), 'hides from everyone');
  assert(t.some((c) => c.p === '/servers/S1/roles'), 'ticket role');
  const row = tickets.openByUser('S1', 'U1')[0];
  assert(row && row.channel_id, 'ticket saved');
  console.log('✓ ticket opened:', row.channel_id);
  await router.handle('interaction', { id: 'I4', token: 'T', custom_id: 'ticket:open', server_id: 'S1', channel_id: 'CT', user_id: 'U1', username: 'sam' });
  assert(since().some((c) => c.body?.content?.includes('already have')), 'limit works');
  console.log('✓ one ticket per user');
  await router.handle('interaction', { id: 'I5', token: 'T', custom_id: 'ticket:close', server_id: 'S1', channel_id: row.channel_id, user_id: 'U1', username: 'sam' });
  const c = since();
  assert(c.some((x) => x.p === '/channels/CL/messages'), 'transcript logged');
  assert(c.some((x) => x.m === 'DELETE' && x.p === `/channels/${row.channel_id}`), 'channel deleted');
  console.log('✓ ticket closed, logged and deleted');

  // leveling: 100 xp per msg => level 1 on the first, 2 on the third (needs 100 then 155)
  for (let i = 0; i < 3; i++) await router.handle('message', { id: 'm' + i, server_id: 'S1', channel_id: 'CG', author_id: 'U1', author: 'sam', content: 'hello world', author_bot: false });
  const lv = levels.get('S1', 'U1');
  assert.strictEqual(lv.level, 2);
  const lc = since();
  assert(lc.some((x) => x.body?.content?.includes('level 1')) && lc.some((x) => x.p.endsWith('/roles/RL1')));
  console.log('✓ leveling, level-up message and role reward (level', lv.level + ')');

  // commands: slash + chat
  await router.handle('command', { id: 'I6', token: 'T', command: 'rank', server_id: 'S1', channel_id: 'CG', user_id: 'U1', username: 'sam' });
  assert(since().some((x) => x.p === '/interactions/I6/T/callback' && x.body.embeds));
  await router.handle('message', { id: 'x', server_id: 'S1', channel_id: 'CG', author_id: 'U1', author: 'sam', content: '!leaderboard', author_bot: false });
  assert(since().some((x) => x.p === '/channels/CG/messages' && x.body.embeds?.[0].title.includes('Leaderboard')));
  console.log('✓ /rank and !leaderboard');

  // welcome: plain text mode (no embed)
  config.welcome.embed = false;
  await router.handle('member_join', { server_id: 'S1', user_id: 'U1', username: 'sam', member_count: 43 });
  const plain = since().find((c) => c.p === '/channels/CW/messages');
  assert(plain.body.content.includes('<@U1>') && !plain.body.embeds, 'plain welcome has no embed');
  config.welcome.embed = true;
  console.log('✓ welcome can be plain text or embed');

  // daily reward + streak
  const { claim } = require('../src/features/leveling/daily');
  const t0 = Date.now();
  const d1 = claim('S1', 'U3', 'kim', 'CG', t0);
  assert(d1.ok && d1.xp === 100 && d1.streak === 1);
  assert(!claim('S1', 'U3', 'kim', 'CG', t0 + 3600e3).ok, 'cooldown blocks a second claim');
  const d2 = claim('S1', 'U3', 'kim', 'CG', t0 + 25 * 3600e3);
  assert(d2.ok && d2.streak === 2 && d2.xp === 125, 'streak bonus');
  const d3 = claim('S1', 'U3', 'kim', 'CG', t0 + 100 * 3600e3);
  assert(d3.ok && d3.streak === 1, 'streak resets after a missed day');
  since();
  await router.handle('command', { id: 'I7', token: 'T', command: 'daily', server_id: 'S1', channel_id: 'CG', user_id: 'U4', username: 'lee' });
  assert(since().some((x) => x.p === '/interactions/I7/T/callback' && x.body.embeds?.[0].title.includes('Daily')));
  console.log('✓ daily reward, streak and cooldown');

  // moderation
  const say = (user, content) => router.handle('message', { id: 'mm', server_id: 'S1', channel_id: 'CG', author_id: user, author: user, content, author_bot: false });
  await say('U1', '!kick <@U9> spam');
  assert(since().some((x) => x.body?.content?.includes('not allowed')), 'non-mod refused');
  await say('U2', '!kick <@U9> spam');
  const k = since();
  assert(k.some((x) => x.p === '/servers/S1/kick' && x.body.user_id === 'U9'));
  assert(k.some((x) => x.p === '/channels/CM/messages'), 'mod log');
  await say('OWN', '!timeout <@U9> 2h being rude');
  const to = since().find((x) => x.p === '/servers/S1/timeouts');
  assert(to.body.minutes === 120 && to.body.reason === 'being rude');
  await say('U2', '!timeout <@U9>');
  assert.strictEqual(since().find((x) => x.p === '/servers/S1/timeouts').body.minutes, 10, 'default timeout');
  await say('U2', '!unmute <@U9>');
  assert.strictEqual(since().find((x) => x.p === '/servers/S1/timeouts').body.minutes, 0);
  await say('U2', '!kick <@U2>');
  assert(since().some((x) => x.body?.content?.includes("yourself")));
  console.log('✓ kick, timeout, unmute (permissions, durations, log)');

  // verification panel can be plain text (VERIFY_EMBED=false in this test)
  assert(panels.find((c) => c.p === '/channels/CV/messages').body.content.includes('Verification'), 'plain verify panel');
  assert(!panels.find((c) => c.p === '/channels/CV/messages').body.embeds, 'no embed on verify panel');
  console.log('✓ verification panel as plain text');

  // permission based access
  await say('U5', '!kick <@U9>');
  assert(since().some((x) => x.p === '/servers/S1/kick'), 'role with kick_members can /kick');
  await say('U5', '!timeout <@U9> 5');
  assert(since().some((x) => x.body?.content?.includes('not allowed')), 'kick_members cannot /timeout');
  await say('U7', '!timeout <@U9> 5');
  assert(since().some((x) => x.p === '/servers/S1/timeouts'), 'manage_server can use everything');
  console.log('✓ access by role permissions (kick_members, manage_server)');

  // owner gives a role access with /modrole
  await say('U6', '!kick <@U9>');
  assert(since().some((x) => x.body?.content?.includes('not allowed')));
  await say('U2', '!modrole add <@&RX>');
  assert(since().some((x) => x.body?.content?.includes('Only the server owner')), 'only owner');
  await say('OWN', '!modrole add <@&RX>');
  since();
  await say('U6', '!kick <@U9>');
  assert(since().some((x) => x.p === '/servers/S1/kick'), 'role added by owner works');
  await say('OWN', '!modrole remove <@&RX>');
  since();
  await say('U6', '!kick <@U9>');
  assert(since().some((x) => x.body?.content?.includes('not allowed')), 'removed role loses access');
  console.log('✓ /modrole add and remove (owner only)');

  console.log('\nAll checks passed.');
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(0);
})().catch((e) => { console.error('✗ FAILED:', e); process.exit(1); });
