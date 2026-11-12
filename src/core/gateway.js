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
 * core/gateway.js - receives events from Yapin' and hands them to the event bus.
 *
 *  connection "gateway": WebSocket wss://rt.yapper.website/bot (fast, resumes after drops)
 *  connection "poll":    GET /events long poll (fallback, works anywhere)
 *
 * Both call  onEvent(type, data)  where type is "message", "member_join", "interaction", ...
 */
const config = require('../config');
const api = require('./api');
const log = require('../utils/logger').child('gateway');

const WANTED_EVENTS = ['message', 'member_join', 'member_leave', 'command', 'interaction'];

class Gateway {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.seq = 0;
    this.ws = null;
    this.hb = null;
    this.stopped = false;
    this.attempt = 0;
    this.seen = new Set(); // dedupe by event id
    this.botId = null;
  }

  start() {
    return config.connectionMode === 'poll' ? this.poll() : this.connect();
  }

  stop() {
    this.stopped = true;
    clearInterval(this.hb);
    try { this.ws?.close(1000); } catch { /* ignore */ }
  }

  dispatch(ev) {
    if (!ev || ev.id == null) return;
    if (this.seen.has(ev.id)) return;
    this.seen.add(ev.id);
    if (this.seen.size > 2000) this.seen.delete(this.seen.values().next().value);
    this.seq = Math.max(this.seq, ev.id);
    log.debug('event', ev.type, ev.id);
    Promise.resolve(this.onEvent(ev.type, ev.data)).catch((err) => log.error(`handler for "${ev.type}" crashed:`, err));
  }

  // ---------------- WebSocket ----------------
  connect() {
    if (this.stopped) return;
    log.info('connecting to gateway…');
    const ws = new WebSocket(config.gatewayUrl);
    this.ws = ws;
    const send = (o) => ws.readyState === 1 && ws.send(JSON.stringify(o));

    ws.addEventListener('message', (m) => {
      let f;
      try { f = JSON.parse(m.data); } catch { return; }

      if (f.op === 'hello') {
        this.startHeartbeat(f.heartbeat_interval || 30000, send);
        if (this.seq > 0) send({ op: 'resume', token: config.token, seq: this.seq });
        else send({ op: 'identify', token: config.token, events: WANTED_EVENTS, max_age: 300 });
      } else if (f.op === 'ready') {
        this.attempt = 0;
        this.botId = f.bot?.id ?? this.botId;
        log.ok(`gateway ready as "${f.bot?.name}"`);
      } else if (f.op === 'event') {
        this.dispatch(f.d ?? { id: f.s, type: f.t, data: f.d?.data });
      } else if (f.op === 'heartbeat_ack') {
        /* alive */
      } else {
        log.debug('frame', f.op);
      }
    });

    ws.addEventListener('close', (e) => {
      clearInterval(this.hb);
      if (this.stopped) return;
      const wait = Math.min(30000, 1000 * 2 ** this.attempt++);
      log.warn(`gateway closed (${e.code}), reconnecting in ${wait / 1000}s`);
      setTimeout(() => this.connect(), wait);
    });
    ws.addEventListener('error', () => { /* close handler reconnects */ });
  }

  startHeartbeat(ms, send) {
    clearInterval(this.hb);
    this.hb = setInterval(() => send({ op: 'heartbeat' }), ms);
  }

  // ---------------- Long poll ----------------
  async poll() {
    log.info('using long poll (GET /events)');
    let after = 0;
    try {
      const first = await api.get('/events', { after: 0 });
      after = first.last ?? 0;
    } catch (err) {
      log.error('first poll failed:', err.message);
    }
    log.ok('poll ready');
    while (!this.stopped) {
      try {
        const res = await api.get('/events', { after, wait: 25, max_age: 300 });
        for (const ev of res.events ?? []) this.dispatch(ev);
        after = res.last ?? after;
      } catch (err) {
        log.warn('poll error:', err.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
}

module.exports = Gateway;
