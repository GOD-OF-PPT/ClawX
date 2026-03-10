# AGENTS.md — Zustand State Stores

**Generated:** 2026-03-09

## Overview

8 Zustand stores managing all renderer state. Initialized in `App.tsx` on mount. Heavy use of async actions calling Host API or Gateway WebSocket.

## Structure

```
src/stores/
├── chat.ts          # Messages, sessions, streaming (1805 lines) ⚠️
├── gateway.ts       # Connection status, health, WebSocket state
├── providers.ts     # AI provider configs, API key status
├── channels.ts      # Message channels (Telegram/WhatsApp)
├── settings.ts      # App settings, developer mode
├── skills.ts        # Installed skills management
├── cron.ts          # Scheduled tasks
└── update.ts        # Auto-update state
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Chat messages | `chat.ts` | Message list, streaming, sessions |
| Provider config | `providers.ts` | API keys, model selection |
| Gateway status | `gateway.ts` | Connected/disconnected, health |
| Channel enable | `channels.ts` | Telegram/WhatsApp toggle |
| Add new state | New file | Export `useXxxStore`, import in `App.tsx` |

## Key Patterns

- **Async actions**: Stores contain `fetchXxx` actions that call `hostApiFetch` or Gateway RPC
- **Cross-store imports**: `chat.ts` imports `useGatewayStore` for WebSocket state
- **No persistence**: All state is runtime-only; settings stored via Host API
- **Streaming state**: `chat.ts` manages `streamingText`, `streamingTools`, `pendingFinal`

## Anti-patterns

- ❌ Direct localStorage — Use `settings.ts` actions → Host API → electron-store
- ❌ Store-to-store sync — Use single source of truth, cross-store imports

## Gotchas

- **chat.ts size**: 1805 lines — streaming logic, tool status, session management all in one
- **Session labels**: Stored in `sessionLabels` map, not persisted separately
- **Tool images**: `pendingToolImages` collected from tool results, attached to next assistant message