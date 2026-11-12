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
 * features/tickets
 *  - panel with an "Open ticket" button in TICKET_PANEL_CHANNEL_ID
 *  - click -> creates channel ticket-0001 (in TICKET_CATEGORY_ID)
 *      private mode: the bot makes a tiny role "ticket-0001", gives it to the opener,
 *                    hides the channel from @everyone and shows it to that role + staff role
 *  - "Close ticket" button (opener or staff) -> transcript to TICKET_LOG_CHANNEL_ID, channel deleted
 * Buttons: ticket:open | ticket:close
 */
const config = require('../../config');
const api = require('../../core/api');
const tickets = require('../../database/repositories/tickets');
const { embed, button, row, mention } = require('../../utils/ui');
const { ensurePanel } = require('../../utils/panel');
const { hasRole } = require('../../utils/server');
const { sleep } = require('../../utils/ui');
const log = require('../../utils/logger').child('tickets');

const cfg = config.tickets;
const reply = (i, content) => api.interactionCallback(i.id, i.token, { type: 'ephemeral', content });
const VISIBLE = ['view_channel', 'send_messages', 'attach_files', 'embed_links', 'add_reactions'];

/** Open tickets whose channel was deleted by hand must not block the user forever. */
async function liveOpenTickets(serverId, userId) {
  const live = [];
  for (const t of tickets.openByUser(serverId, userId)) {
    try {
      await api.getChannel(t.channel_id);
      live.push(t);
    } catch (err) {
      if (err.status === 404) tickets.close(t.id, 'channel-deleted');
      else live.push(t);
    }
  }
  return live;
}

async function onOpen(i) {
  if (config.serverId && i.server_id !== config.serverId) return;
  const serverId = i.server_id;

  const existing = await liveOpenTickets(serverId, i.user_id);
  if (existing.length >= cfg.maxPerUser) {
    return reply(i, `You already have an open ticket: <#${existing[0].channel_id}>`);
  }
  await api.interactionCallback(i.id, i.token, { type: 'ack' }).catch(() => {});

  const ticketId = tickets.create(serverId, i.user_id, i.username);
  const name = `ticket-${String(ticketId).padStart(4, '0')}`;
  let roleId = null;
  let privateOk = false;

  try {
    const body = { name, kind: 'text' };
    if (cfg.categoryId) body.category_id = cfg.categoryId;
    const channel = await api.createChannel(serverId, body);

    if (cfg.mode === 'private') {
      try {
        const role = await api.createRole(serverId, { name, mentionable: false });
        roleId = role.id;
        await api.addRole(serverId, i.user_id, roleId);
        await api.setChannelPermission(channel.id, 'everyone', [], ['view_channel']);
        await api.setChannelPermission(channel.id, roleId, VISIBLE, []);
        if (cfg.staffRoleId) await api.setChannelPermission(channel.id, cfg.staffRoleId, [...VISIBLE, 'manage_messages'], []);
        privateOk = true;
      } catch (err) {
        log.warn(`could not make ${name} private (${err.message}). It stays visible to the category.`);
      }
    }

    tickets.attach(ticketId, channel.id, roleId);
    const staffPing = cfg.staffRoleId ? ` <@&${cfg.staffRoleId}>` : '';
    await api.sendMessage(channel.id, {
      content: `${mention(i.user_id)}${staffPing}`,
      embeds: [
        embed({
          title: `🎫 Ticket #${ticketId}`,
          description: `Hi ${mention(i.user_id)}, describe your problem and staff will help you soon.\n` +
            (privateOk || cfg.mode !== 'private' ? '' : '\n⚠️ This ticket could not be made private.'),
          color: '#5865f2',
        }),
      ],
      components: [row(button('danger', 'Close ticket', 'ticket:close', '🔒'))],
    });
    log.ok(`${name} opened by ${i.username ?? i.user_id}`);
    await api.sendMessage(i.channel_id, { content: `${mention(i.user_id)} your ticket is ready: <#${channel.id}>` }).catch(() => {});
  } catch (err) {
    log.error('ticket open failed:', err.message);
    tickets.remove(ticketId);
    if (roleId) api.deleteRole(serverId, roleId).catch(() => {});
    await api.sendMessage(i.channel_id, { content: `${mention(i.user_id)} ⚠️ I could not create your ticket. Tell a moderator.` }).catch(() => {});
  }
}

async function transcript(channelId) {
  const msgs = (await api.getMessages(channelId, 100)).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return msgs
    .filter((m) => m.content)
    .map((m) => `[${m.created_at?.slice(11, 16)}] <@${m.author_id}>: ${m.content}`)
    .join('\n')
    .slice(0, 3500);
}

async function onClose(i) {
  const t = tickets.byChannel(i.channel_id);
  if (!t || t.status !== 'open') return reply(i, 'This is not an open ticket.');

  const allowed = t.user_id === i.user_id || (await hasRole(t.server_id, i.user_id, cfg.staffRoleId));
  if (!allowed) return reply(i, '⛔ Only the ticket owner or staff can close it.');

  await api.interactionCallback(i.id, i.token, { type: 'reply', content: '🔒 Closing this ticket in 5 seconds…' }).catch(() => {});
  tickets.close(t.id, i.user_id);

  if (cfg.logChannelId) {
    const text = await transcript(t.channel_id).catch(() => '');
    await api.sendMessage(cfg.logChannelId, {
      embeds: [
        embed({
          title: `Ticket #${t.id} closed`,
          description: text ? '```\n' + text.replace(/```/g, "'''") + '\n```' : '*(no messages)*',
          fields: [
            { name: 'Opened by', value: mention(t.user_id), inline: true },
            { name: 'Closed by', value: mention(i.user_id), inline: true },
          ],
          color: '#ed4245',
        }),
      ],
    }).catch((e) => log.warn('log failed:', e.message));
  }

  await sleep(5000);
  await api.deleteChannel(t.channel_id).catch((e) => log.warn('delete channel failed:', e.message));
  if (t.role_id) await api.deleteRole(t.server_id, t.role_id).catch(() => {});
  log.ok(`ticket #${t.id} closed`);
}

module.exports = {
  name: 'tickets',
  enabled: () => cfg.enabled && cfg.panelChannelId,
  register(router) {
    router.onButton('ticket:open', onOpen);
    router.onButton('ticket:close', onClose);
  },
  async onReady() {
    await ensurePanel('tickets', cfg.panelChannelId, {
      embeds: [embed({ title: `🎫 ${cfg.title}`, description: cfg.message, color: '#5865f2' })],
      components: [row(button('primary', 'Open ticket', 'ticket:open', '🎫'))],
    });
  },
};
