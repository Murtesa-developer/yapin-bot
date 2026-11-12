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
 * core/router.js - the event bus.
 * Features register handlers:
 *    router.on('member_join', handler)
 *    router.onButton('verify:', handler)      // matches custom_id by prefix
 * The gateway calls router.handle(type, data).
 */
const log = require('../utils/logger').child('router');

class Router {
  constructor() {
    this.handlers = new Map(); // type -> [fn]
    this.buttons = []; // [{prefix, fn}]
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
  }

  /** Handle button clicks / select picks whose custom_id starts with prefix. */
  onButton(prefix, fn) {
    this.buttons.push({ prefix, fn });
  }

  async handle(type, data) {
    if (type === 'interaction') {
      const hit = this.buttons.find((b) => String(data.custom_id || '').startsWith(b.prefix));
      if (hit) {
        try { await hit.fn(data); } catch (err) { log.error(`button "${data.custom_id}" failed:`, err); }
      }
      return;
    }
    for (const fn of this.handlers.get(type) ?? []) {
      try { await fn(data); } catch (err) { log.error(`handler for "${type}" failed:`, err); }
    }
  }
}

module.exports = new Router();
