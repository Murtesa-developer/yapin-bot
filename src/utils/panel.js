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
 * utils/panel.js - "post this panel once, keep it alive".
 * The message id is stored in the database; on every start we check it still exists,
 * and repost it only if somebody deleted it. If the panel changed, it is edited in place.
 */
const api = require('../core/api');
const kv = require('../database/repositories/kv');
const log = require('./logger').child('panel');

async function ensurePanel(key, channelId, payload) {
  const saved = kv.get(`panel:${key}`);
  if (saved) {
    const [chan, msgId] = saved.split(':');
    if (chan === channelId) {
      try {
        await api.editMessage(chan, msgId, payload);
        log.info(`panel "${key}" up to date`);
        return msgId;
      } catch (err) {
        log.debug(`panel "${key}" missing, reposting`, err.message);
      }
    }
  }
  const msg = await api.sendMessage(channelId, payload);
  kv.set(`panel:${key}`, `${channelId}:${msg.id}`);
  log.ok(`panel "${key}" posted in ${channelId}`);
  return msg.id;
}

module.exports = { ensurePanel };
