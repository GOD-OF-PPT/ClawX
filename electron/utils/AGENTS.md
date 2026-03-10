# AGENTS.md — Cross-Cutting Utilities

**Generated:** 2026-03-09

## Overview

26 utility files supporting main process, gateway, and services. Handles storage, auth, paths, logging, OAuth, channel configs, provider keys, and OpenClaw workspace management.

## Structure

```
electron/utils/
├── store.ts              # electron-store wrapper (settings)
├── secure-storage.ts     # OS keychain integration
├── logger.ts             # Winston-based logging
├── paths.ts              # App directory resolution
├── config.ts             # Constants (ports, defaults)
├── proxy.ts              # Proxy settings helper
├── proxy-fetch.ts        # fetch with proxy support
├── provider-*.ts         # Provider key/registry utilities
├── channel-config.ts     # Telegram/WhatsApp/DingTalk config
├── skill-config.ts       # Skill file management
├── token-usage*.ts       # Dashboard token metrics
├── openclaw-*.ts         # Workspace, CLI, auth, proxy sync
├── uv-*.ts               # Python/uv environment setup
├── device-*.ts           # Device identity for Gateway auth
├── *-oauth.ts            # Device/browser OAuth flows
├── whatsapp-login.ts     # WhatsApp QR login
└── win-shell.ts         # Windows shell integration
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Settings get/set | `store.ts` | Typed wrapper around electron-store |
| Secure key storage | `secure-storage.ts` | Keychain (macOS) / Credential Vault (Win) |
| Provider API keys | `provider-keys.ts` | Key validation, storage, retrieval |
| Channel config | `channel-config.ts` | Telegram bot token, WhatsApp creds |
| OpenClaw workspace | `openclaw-workspace.ts` | Context snippets, bootstrap files |
| Python/uv setup | `uv-setup.ts`, `uv-env.ts` | Managed Python environment |
| Device identity | `device-identity.ts` | Key pair for Gateway WebSocket auth |
| OAuth flows | `device-oauth.ts`, `browser-oauth.ts` | Kimi/Gemini auth |

## Key Patterns

- **Lazy initialization**: Many utilities export singleton getters rather than top-level instances
- **Keychain namespace**: Keys stored under `clawx-<provider-id>` format
- **Path resolution**: Works in both dev (`__dirname` relative) and packaged (`process.resourcesPath`)
- **OpenClaw sync**: `openclaw-proxy.ts` writes Gateway config on proxy change

## Anti-patterns

- ❌ Direct `electron-store` access — Use `getSetting`/`setSetting` from `store.ts`
- ❌ Hardcoded paths — Use `paths.ts` helpers for userData/resources resolution

## Gotchas

- **Token usage**: Reads `.jsonl` transcript files, not console logs
- **WhatsApp QR**: Requires `whatsapp-login.ts` event handling in main process
- **Windows shell**: `win-shell.ts` handles registry for context menu integration