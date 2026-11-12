# Security Policy

Copyright (c) 2026 Murtesa Developer. All rights reserved.

Thank you for helping keep Yapper Community Bot and the communities that run it safe.

## Supported versions

Only the latest release gets security fixes. Please update before reporting.

| Version | Supported |
|---------|-----------|
| 1.x (latest) | ✅ |
| Older | ❌ |

## Reporting a vulnerability

**Please do not open a public issue, pull request or discussion for a security problem.**

Report it privately in one of these ways:

1. **Preferred:** use GitHub's private reporting at
   [Security → Report a vulnerability](https://github.com/Murtesa-developer/yapin-bot/security/advisories/new).
2. Or open the [Security tab](https://github.com/Murtesa-developer/yapin-bot/tree/main?tab=security-ov-file#) of the repository and follow the instructions there.

Please include:

- A clear description of the problem and its impact
- Steps to reproduce, or a small proof of concept
- The affected version and your Node.js version
- Any logs, with **tokens and personal data removed**

## What to expect

| Step | Target time |
|------|-------------|
| Acknowledge your report | within 72 hours |
| First assessment and severity | within 7 days |
| Fix or mitigation for confirmed issues | within 30 days, faster for critical ones |

We will keep you updated, and we are happy to credit you in the release notes if you want that.

## Scope

In scope:

- Permission bypass, for example using `/kick`, `/timeout`, `/unmute` or `/modrole` without the right access
- Ticket or verification bypass, such as reading another user's private ticket or getting the verified role without verifying
- Leaking or logging the bot token or other secrets
- SQL injection or unsafe handling of the SQLite database
- Abuse of XP, daily rewards or leveling to get unearned roles
- Denial of service caused by a single user or message

Out of scope:

- Problems in Node.js, SQLite, Yapin' or other platforms (please report them to their owners)
- Issues that need the attacker to already control the host machine, `.env` file or database
- Social engineering, spam, or physical attacks
- Rate-limit findings on the platform's own API
- Reports from automated scanners with no demonstrated impact

## Source code is confidential

This software is proprietary. If you obtained a copy only to test it, keep the source code and your findings private until a fix is released. Do not publish, share or redistribute the code. See the [LICENSE](LICENSE).

## Safe harbor

If you act in good faith, avoid harming users, do not access or change data that is not yours, and give us reasonable time to fix the issue before disclosure, we will not take legal action against you for your research.

## Advice for people running the bot

- Keep `BOT_TOKEN` only in `.env`. Never commit it, post it in chat or share screenshots of it.
- If a token may have leaked, **regenerate it right away** in *Settings → Developer* on Yapin'.
- Give the bot only the permissions it needs, and keep its role below your admins.
- Restrict file access to the `data/` folder, and back it up regularly.
- Set `SERVER_ID` so the bot only works in your server.
- Keep Node.js on a current, patched release (22.13 or newer).
