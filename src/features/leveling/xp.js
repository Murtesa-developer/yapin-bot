/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** Pure XP math (no database, easy to test). Same curve as MEE6. */

/** XP needed to go from `level` to `level + 1` */
const xpForNext = (level) => 5 * level * level + 50 * level + 100;

/** Total XP needed to REACH `level` */
function totalXpForLevel(level) {
  let sum = 0;
  for (let l = 0; l < level; l++) sum += xpForNext(l);
  return sum;
}

/** { level, current, needed } for a total xp value */
function progress(totalXp) {
  let level = 0;
  let left = totalXp;
  while (left >= xpForNext(level)) {
    left -= xpForNext(level);
    level++;
  }
  return { level, current: left, needed: xpForNext(level) };
}

const randomXp = (min, max) => min + Math.floor(Math.random() * (Math.max(max, min) - min + 1));

module.exports = { xpForNext, totalXpForLevel, progress, randomXp };
