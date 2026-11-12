/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** Tiny colored logger. Use log.info / log.warn / log.error / log.debug */
const config = require('../config');

const c = { reset: '\x1b[0m', gray: '\x1b[90m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', green: '\x1b[32m' };
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function out(color, tag, scope, args) {
  const line = `${c.gray}${stamp()}${c.reset} ${color}${tag}${c.reset} ${scope ? `[${scope}] ` : ''}`;
  (tag === 'ERR' ? console.error : console.log)(line, ...args);
}

function make(scope = '') {
  return {
    info: (...a) => out(c.cyan, 'INF', scope, a),
    ok: (...a) => out(c.green, 'OK ', scope, a),
    warn: (...a) => out(c.yellow, 'WRN', scope, a),
    error: (...a) => out(c.red, 'ERR', scope, a),
    debug: (...a) => config.debug && out(c.gray, 'DBG', scope, a),
    child: (s) => make(s),
  };
}

module.exports = make();
