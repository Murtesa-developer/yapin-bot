# Yapper Community Bot

A Node.js bot for [Yapin' / yapper.website](https://www.yapper.website/developers) with:

- 👋 **Welcome messages** (embed card or plain text, optional goodbye + DM)
- ✅ **Verification** (one-click or emoji captcha → gives a role)
- 🎫 **Ticket system** (private channel per ticket, close button, transcript log)
- ⭐ **Leveling** (XP for chatting, level-up messages, role rewards, `/rank`, `/leaderboard`)
- 🎁 **Daily reward** (`/daily`, XP with a streak bonus)
- 🔨 **Moderation** (`/kick`, `/timeout`, `/unmute`, with a mod log)
- 💾 **Local database** (SQLite file in `data/bot.db`, nothing to install)

**Zero npm dependencies.** It uses what Node 22 already has: `fetch`, `WebSocket`, `node:sqlite`, `process.loadEnvFile`.

## Quick start

1. Install **Node.js 22.13 or newer** (`node -v`).
2. In Yapin': *Settings → Developer* → create a bot → copy the token (starts with `yb_`).
3. Copy `.env.example` to `.env` and fill it in (token + channel / role IDs, see below).
4. Invite the bot to your server and give it a role with: **Send Messages, Embed Links, Manage Channels, Manage Roles** (ticket + verification need these). Put the bot's role **above** the verified role and the staff role.
5. Run:

```bash
npm start        # run the bot
npm run dev      # restart on file changes
npm run check    # offline self-test (fake API, temp database)
```

## The `.env` file (channel IDs go here)

| Variable | What it is |
|---|---|
| `BOT_TOKEN` | Bot token (required) |
| `SERVER_ID` | Only work in this server (empty = all servers) |
| `WELCOME_CHANNEL_ID` | Where welcome messages are posted |
| `WELCOME_MESSAGE` | Template: `{user}` `{username}` `{server}` `{count}` |
| `WELCOME_EMBED` | `true` = embed card, `false` = plain text |
| `VERIFY_CHANNEL_ID` | Channel for the Verify panel (bot posts it itself) |
| `VERIFIED_ROLE_ID` | Role given on verification |
| `VERIFY_MODE` | `button` or `captcha` |
| `VERIFY_EMBED` | `true` = embed card, `false` = plain text panel |
| `UNVERIFIED_ROLE_ID` | Optional role removed on verification |
| `TICKET_PANEL_CHANNEL_ID` | Channel for the "Open ticket" panel |
| `TICKET_CATEGORY_ID` | Category the ticket channels are created in |
| `TICKET_STAFF_ROLE_ID` | Staff who can see/close tickets |
| `TICKET_LOG_CHANNEL_ID` | Closed-ticket transcripts |
| `TICKET_MODE` | `private` (opener + staff only) or `open` |
| `LEVEL_UP_CHANNEL_ID` | Level-up messages (empty = same channel) |
| `LEVEL_ROLES` | `5:ROLE_ID,10:ROLE_ID` role rewards |
| `XP_MIN` `XP_MAX` `XP_COOLDOWN_SECONDS` | XP tuning |
| `XP_IGNORED_CHANNELS` | Comma separated channels that give no XP |
| `DAILY_XP_MIN` `DAILY_XP_MAX` | Daily reward range |
| `DAILY_STREAK_BONUS` `DAILY_STREAK_MAX_DAYS` | Extra XP per streak day, and where it stops growing |
| `DAILY_COOLDOWN_HOURS` | Hours between claims (miss it by 2x and the streak resets) |
| `MOD_ROLE_IDS` | Roles allowed to use `/kick` `/timeout` `/unmute` (the server owner always can) |
| `MOD_USE_ROLE_PERMISSIONS` | `true` = roles that have the Kick / Timeout / Manage Server permission can use them too |
| `MOD_LOG_CHANNEL_ID` | Where moderation actions are logged |
| `DEFAULT_TIMEOUT_MINUTES` | Used when `/timeout` has no duration |
| `CONNECTION_MODE` | `gateway` (WebSocket) or `poll` (long poll fallback) |

Each feature turns itself off (with a warning) if its IDs are missing.

**Verification setup tip:** make the rest of the server visible only to the verified role, and leave the verify channel visible to everyone.

## Folder structure

```
yapper-bot/
├── .env.example            All settings, copy to .env
├── package.json            Scripts (start, dev, check). No dependencies.
├── data/                   bot.db (SQLite) is created here. Back this folder up.
├── scripts/
│   └── check.js            Offline self-test of every feature
└── src/
    ├── index.js            Entry point: loads features, connects, posts panels
    ├── config.js           Reads .env once → typed config object
    │
    ├── core/               Talking to Yapin' (no bot logic here)
    │   ├── api.js          REST client: auth, 429 retry, fallback host, all endpoint helpers
    │   ├── gateway.js      WebSocket gateway (+ resume) and long-poll fallback
    │   └── router.js       Event bus: router.on(type) and router.onButton(prefix)
    │
    ├── database/           Everything that touches SQLite
    │   ├── db.js           Opens the file, runs migrations (append-only list)
    │   └── repositories/   One file of SQL per topic
    │       ├── levels.js         xp, level, leaderboard
    │       ├── tickets.js        open / closed tickets
    │       ├── verifications.js  who verified and when
    │       ├── modroles.js       roles the owner gave moderation access
    │       └── kv.js             small key/value (saved panel message ids)
    │
    ├── features/           One folder per feature, each exports { name, enabled, register, onReady }
    │   ├── welcome/        member_join → welcome embed, DM, goodbye
    │   ├── verification/   Verify panel + button/captcha → gives role
    │   ├── tickets/        Ticket panel, create private channel, close + transcript
    │   └── leveling/       index.js (message → XP), service.js (add XP, level-up, role rewards),
    │                       daily.js (daily reward + streak), xp.js (pure level math)
    │
    ├── commands/           Slash commands that also work as !text commands
    │   ├── index.js        Registers commands, routes slash + chat commands
    │   ├── ping.js  rank.js  leaderboard.js  daily.js
    │   ├── moderation.js   /kick  /timeout  /unmute (+ mod log)
    │   └── modrole.js      /modrole add|remove|list (owner gives roles access)
    │
    └── utils/              Small helpers
        ├── logger.js       Colored logs (DEBUG=true for more)
        ├── ui.js           embed(), button(), row(), fill() templates
        ├── access.js       Who may use moderation commands (owner, roles, permissions)
        ├── panel.js        Post a panel once, edit it on restarts
        └── server.js       Cached server name, role checks
```

### Add a new feature

1. Create `src/features/myfeature/index.js` exporting `{ name, enabled(), register(router), onReady? }`.
2. In `register`, use `router.on('member_join' | 'message' | ..., fn)` or `router.onButton('myprefix:', fn)`.
3. Add it to the `features` list in `src/index.js`. Need a table? Append a migration in `database/db.js`.

### Add a new command

Create `src/commands/hello.js` with `{ name, description, run(ctx) }`, then add it to the `all` list in `commands/index.js`.

## Commands

| Command | What it does |
|---|---|
| `/ping` | Is the bot alive |
| `/rank` `/leaderboard` | Your level / top 10 |
| `/daily` | Daily XP reward, streak bonus for coming back every day |
| `/kick @user [reason]` | Mods only |
| `/timeout @user [10m\|2h\|1d] [reason]` | Mods only, 1 minute to 28 days |
| `/unmute @user` | Mods only, clears the timeout |

| `/modrole add @role` / `remove @role` / `list` | **Server owner only**: choose which roles can use the moderation commands |

**Who can use `/kick`, `/timeout`, `/unmute`:** the server owner, plus anyone with a role that is (a) added with `/modrole add`, (b) listed in `MOD_ROLE_IDS`, or (c) has the matching Yapin' permission: *Kick Members* for `/kick`, *Timeout Members* for `/timeout` and `/unmute`, and *Manage Server* or *Administrator* for all of them. Turn (c) off with `MOD_USE_ROLE_PERMISSIONS=false`. Role permissions are cached for 60 seconds.

All of them also work with the prefix, e.g. `!daily` or `!timeout @user 30m spam`. The bot needs **Kick Members** and **Timeout Members** and a role above the person it acts on.

## Notes

- **Private tickets:** Yapin' channel permissions are per role, so the bot creates a small role per ticket (`ticket-0001`), gives it to the opener, and deletes it when the ticket closes. The role/permission endpoints are marked *"in testing (flag bot_roles)"* in the API docs. If your bot doesn't have that flag yet, the ticket still opens but stays visible to the category and the bot says so; set `TICKET_MODE=open` to silence the warning, or hide the ticket category from everyone except staff and rely on pings.
- **Rate limits:** 30 messages/minute per server. The client retries automatically on 429.
- **Reset a user's XP / ticket data:** open `data/bot.db` with any SQLite viewer (stop the bot first).
- Database lives only on this machine. Back up `data/bot.db` to keep levels.

## License

Copyright (c) 2026 Murtesa Developer. All rights reserved.

This is **proprietary software**, not open source. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

- ✅ You may run it for your own servers.
- ✅ You may deploy and operate it for your customers and **charge them for that service**; you keep the money.
- ❌ You may not share, publish, sell or give away the source code, and customers never receive it.
- ❌ You may not modify, resell the software itself, or reverse engineer it.
