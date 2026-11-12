/*!
 * Yapper Community Bot
 * Copyright (c) 2026 Murtesa Developer. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL. Licensed under the Yapper Community Bot
 * Proprietary Commercial Use License (see LICENSE). Copying, disclosing,
 * modifying or distributing this source code is prohibited.
 */
'use strict';
/** Small helpers to build embeds / buttons so feature code stays readable. */

const embed = ({ title, description, color = '#5865f2', fields, footer, thumbnail } = {}) => {
  const e = { color };
  if (title) e.title = title;
  if (description) e.description = description;
  if (fields) e.fields = fields;
  if (footer) e.footer = typeof footer === 'string' ? { text: footer } : footer;
  if (thumbnail) e.thumbnail = thumbnail;
  return e;
};

/** button('primary', 'Verify', 'verify:start', '✅') */
const button = (style, label, customId, emoji) => {
  const b = { type: 'button', style, label };
  if (customId) b.custom_id = customId;
  if (emoji) b.emoji = emoji;
  return b;
};

const row = (...buttons) => ({ type: 'row', components: buttons });

const mention = (userId) => `<@${userId}>`;
const channelLink = (channelId) => `<#${channelId}>`;

/** Replace {placeholders} in a template string. */
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { embed, button, row, mention, channelLink, fill, sleep };
