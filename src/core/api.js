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
 * core/api.js - thin REST client for the Yapin' Bot API (v1).
 *   Authorization: Bot <token>
 * Handles JSON, 429 retry_after, and falls back to the website host if the API host is down.
 * Every method returns parsed JSON or throws ApiError.
 */
const config = require('../config');
const log = require('../utils/logger').child('api');

class ApiError extends Error {
  constructor(status, body, method, path) {
    super(`${method} ${path} -> ${status} ${body?.error || body?.message || ''}`.trim());
    this.status = status;
    this.body = body;
  }
}

let base = config.apiBase;
let fallbackUntil = 0;

async function request(method, path, body, { retries = 3, query } = {}) {
  const useFallback = Date.now() < fallbackUntil;
  const root = useFallback ? config.apiFallbackBase : base;
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const url = root + path + qs;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bot ${config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'yapper-community-bot/1.0',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (!useFallback) {
      log.warn('API host unreachable, using website host for 10 minutes');
      fallbackUntil = Date.now() + 10 * 60 * 1000;
      return request(method, path, body, { retries, query });
    }
    throw err;
  }

  if (res.status === 429 && retries > 0) {
    const data = await res.json().catch(() => ({}));
    const wait = Math.ceil((data.retry_after ?? Number(res.headers.get('retry-after')) ?? 1) * 1000) || 1000;
    log.warn(`rate limited on ${method} ${path}, waiting ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    return request(method, path, body, { retries: retries - 1, query });
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw new ApiError(res.status, data, method, path);
  return data;
}

const get = (p, query) => request('GET', p, undefined, { query });
const post = (p, b = {}) => request('POST', p, b);
const put = (p, b = {}) => request('PUT', p, b);
const patch = (p, b = {}) => request('PATCH', p, b);
const del = (p) => request('DELETE', p);

/** Typed helpers used by the features. Keep all endpoint paths in ONE place. */
const api = {
  ApiError,
  get, post, put, patch, del,

  me: () => get('/me'),
  setStatus: (status, activity) => put('/me/status', { status, activity }),

  registerCommands: (commands, interactions) => put('/commands', { commands, interactions }),

  getServer: (id) => get(`/servers/${id}`),
  getMember: (serverId, userId) => get(`/servers/${serverId}/members/${userId}`).then((r) => r.member ?? r),
  getChannel: (id) => get(`/channels/${id}`),
  getChannels: (serverId) => get(`/servers/${serverId}/channels`),
  createChannel: (serverId, body) => post(`/servers/${serverId}/channels`, body).then((r) => r.channel),
  deleteChannel: (id) => del(`/channels/${id}`),
  setChannelPermission: (channelId, roleId, allow = [], deny = []) =>
    put(`/channels/${channelId}/permissions/${roleId}`, { allow, deny }),

  sendMessage: (channelId, body) => post(`/channels/${channelId}/messages`, body).then((r) => r.message ?? r.messages?.[0] ?? r),
  getMessage: (channelId, messageId) => get(`/channels/${channelId}/messages/${messageId}`).then((r) => r.message ?? r),
  getMessages: (channelId, limit = 100) => get(`/channels/${channelId}/messages`, { limit }).then((r) => r.messages ?? []),
  editMessage: (channelId, messageId, body) => patch(`/channels/${channelId}/messages/${messageId}`, body),
  deleteMessage: (channelId, messageId) => del(`/channels/${channelId}/messages/${messageId}`),

  getRoles: (serverId) => get(`/servers/${serverId}/roles`).then((r) => r.roles ?? []),
  createRole: (serverId, body) => post(`/servers/${serverId}/roles`, body).then((r) => r.role),
  deleteRole: (serverId, roleId) => del(`/servers/${serverId}/roles/${roleId}`),
  addRole: (serverId, userId, roleId) => put(`/servers/${serverId}/members/${userId}/roles/${roleId}`),
  removeRole: (serverId, userId, roleId) => del(`/servers/${serverId}/members/${userId}/roles/${roleId}`),

  kick: (serverId, userId) => post(`/servers/${serverId}/kick`, { user_id: userId }),
  /** minutes 0 clears the timeout */
  timeout: (serverId, userId, minutes, reason) => post(`/servers/${serverId}/timeouts`, { user_id: userId, minutes, ...(reason ? { reason: reason.slice(0, 200) } : {}) }),

  openDm: (userId) => post(`/users/${userId}/dm`).then((r) => r.channel_id ?? r.channel?.id),

  /** Answer a button click / slash command. type: reply | ephemeral | update | ack */
  interactionCallback: (id, token, payload) => post(`/interactions/${id}/${token}/callback`, payload),
};

module.exports = api;
