# NEXUS MARKET — Discord Store Bot

Discord.js v14 bot for a store/community server, with Spanish and English responses, black-and-silver branding, custom emoji support, slash commands and a ! prefix.

## Included

- Welcome messages in the configured channel.
- Private support, purchase and other ticket channels; a maximum of two open tickets per user; close ticket button with a five-second delay.
- Verification panel that assigns a configured verified role.
- Application panel with a five-question modal; applications are stored locally and posted to the application channel (or the configured logs channel as fallback).
- Moderation: ban, kick, timeout, remove timeout and bulk-delete recent messages.
- Utility: ping, avatar, user info, server info and server statistics.
- Custom text commands managed with /custom-command and invoked using the configured prefix (default !).
- /say command with mentions disabled to prevent accidental mass pings.
- Welcome, member, moderation and ticket logs.
- Per-server response language selection.

## Requirements

- Node.js 20.11 or newer.
- A Discord application and bot token.
- The bot invited to the server with appropriate channel, role and moderation permissions.

## Run locally

1. Copy .env.example to .env.
2. Fill in DISCORD_TOKEN and CLIENT_ID. Set GUILD_ID to your test server ID for immediate command registration.
3. In a terminal, run:

   npm install
   npm run deploy-commands
   npm start

4. In Discord, try /help, then run /ticket-panel, /verify-panel and /application-panel in the channels where each panel should appear. The ticket panel is posted to TICKET_PANEL_CHANNEL_ID.

You can also use npm run check to perform Node.js syntax checks.

## Important Discord settings

In Discord Developer Portal > Bot, enable the Server Members Intent and Message Content Intent. The bot needs the following permissions as appropriate: View Channels, Send Messages, Embed Links, Read Message History, Manage Channels, Manage Roles, Ban Members, Kick Members, Moderate Members and Manage Messages.

Move the bot's highest role above the verified role and any members it needs to moderate. The bot cannot assign a role higher than or equal to its own role.

Set these values in .env or the hosting provider's environment settings:

| Variable | Purpose |
| --- | --- |
| DISCORD_TOKEN | Secret bot token. Never commit this value. |
| CLIENT_ID | Discord application ID. |
| GUILD_ID | Optional test server ID for faster command registration. |
| WELCOME_CHANNEL_ID | Welcome channel; default is the ID supplied for NEXUS MARKET. |
| LOG_CHANNEL_ID | Log channel; default is the ID supplied for NEXUS MARKET. |
| TICKET_PANEL_CHANNEL_ID | Where /ticket-panel publishes; default is the supplied ticket channel. |
| APPLICATION_CHANNEL_ID | Optional application destination; if empty, applications go to the logs channel. |
| STAFF_ROLE_ID | Optional role that can see tickets and close them. |
| VERIFIED_ROLE_ID | Required for the verification button to assign a role. |
| UNVERIFIED_ROLE_ID | Optional role removed after successful verification. |
| TICKET_CATEGORY_ID | Optional category for new ticket channels. |
| BOT_PREFIX | Prefix for custom commands and prefix commands; default !. |
| EMBED_COLOR | Embed color in hex; default #BFC5D2. |

## Main commands

- Utility: /ping, /help, /avatar, /userinfo, /serverinfo, /stats
- Moderation: /ban, /kick, /timeout, /untimeout, /clear
- Panels: /ticket-panel, /verify-panel, /application-panel
- Setup: /welcome-channel, /language, /custom-command add, /custom-command remove, /custom-command list, /say
- Prefix commands: !ping, !help, !say, !ban, !kick, plus any custom commands you add.

## Storage and privacy

The bot stores configuration, ticket metadata and submitted applications in data/database.json, which is created at runtime and intentionally ignored by Git. Back up that file if you need to retain local data. On hosting platforms with ephemeral filesystems, attach persistent storage or replace this JSON store with a managed database before relying on long-term retention.

Application responses can include personal information such as age and timezone. Restrict access to the application/logs channel and retain submissions only as long as needed.

## Safety notes

- Never place your bot token in source code, issue reports or public messages.
- The supplied channel IDs are defaults. If those channels belong to a different server, update the environment variables.
- Set VERIFIED_ROLE_ID and optional staff role IDs before using verification and staff-only ticket access.
- The custom emojis supplied for the design are used where Discord can render them. If an emoji is unavailable to the bot or cannot be used on a component, use a standard emoji or remove that component emoji.
- A command being registered does not prove permissions or role hierarchy are correct in your server; test it in a private channel first.
