# AGENTS.md — Host API Server

**Generated:** 2026-03-09

## Overview

Local HTTP server (127.0.0.1:3210) embedded in Electron main process. Provides REST endpoints + SSE event stream for renderer. Non-standard alternative to pure IPC model.

## Structure

```
electron/api/
├── server.ts           # Route handler chain, server bootstrap
├── context.ts          # Shared context (stores, gateway ref)
├── route-utils.ts      # sendJson, parseBody helpers
├── event-bus.ts        # SSE event broadcasting
└── routes/
    ├── app.ts          # SSE stream (GET /api/events)
    ├── gateway.ts      # Gateway status, logs, restart
    ├── settings.ts     # CRUD for app settings
    ├── providers.ts    # Provider config management
    ├── channels.ts     # Channel enable/config
    ├── sessions.ts     # Chat session management
    ├── skills.ts       # Skill install/list
    ├── files.ts        # File read/write operations
    ├── cron.ts         # Scheduled task management
    ├── logs.ts         # Log streaming
    └── usage.ts        # Token usage history
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Add new endpoint | `routes/*.ts` | Create handler, add to `server.ts` chain |
| SSE events | `routes/app.ts`, `event-bus.ts` | `GET /api/events` streaming |
| Error responses | `route-utils.ts` | `sendJson(res, code, body)` |
| Gateway proxy | `routes/gateway.ts` | HTTP proxy to Gateway via IPC |

## Key Patterns

- **Route chain**: Each handler returns `Promise<boolean>` — first `true` wins, 404 if none match
- **Context injection**: `HostApiContext` passes stores/gateway to all routes
- **SSE broadcasting**: `eventBus.emit(event, payload)` → connected clients receive
- **CORS-free**: Localhost only, renderer uses `hostApiFetch` from `src/lib/host-api.ts`

## Anti-patterns

- ❌ Direct fetch from renderer to external services — Route through gateway HTTP proxy or main IPC
- ❌ Adding Express/Fastify — Uses native `node:http` deliberately

## Gotchas

- **Port 3210**: Hardcoded in `utils/config.ts` PORTS.CLAWX_HOST_API
- **No auth**: Localhost-bound only, trusts renderer implicitly
- **Server lifecycle**: Started in `electron/main/index.ts` on app ready