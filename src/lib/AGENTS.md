# AGENTS.md — Frontend Utilities

**Generated:** 2026-03-09

## Overview

Transport layer for renderer↔main/gateway communication. Unified API client routes calls across IPC, WebSocket, and HTTP based on channel rules.

## Structure

```
src/lib/
├── api-client.ts        # Unified transport (916 lines) ⚠️
├── gateway-client.ts    # Direct Gateway WebSocket RPC
├── host-api.ts          # HTTP fetch to Host API (port 3210)
├── host-events.ts       # SSE event subscription
├── providers.ts         # Provider-related helpers
├── provider-accounts.ts # Account management UI helpers
├── telemetry.ts         # Analytics/telemetry
└── utils.ts             # Misc frontend utilities
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| IPC calls | `api-client.ts` | `invokeIpc()` — REQUIRED for all IPC |
| Gateway RPC | `gateway-client.ts` | Direct WebSocket to Gateway |
| HTTP to Host API | `host-api.ts` | `hostApiFetch()` |
| SSE events | `host-events.ts` | Subscribe to server events |

## Transport Routing (api-client.ts)

- **UNIFIED_CHANNELS**: Channels that work across transports
- **Transport rules**: Regex matchers decide transport priority
- **Fallback chain**: WS → HTTP → IPC for most calls
- **Gateway RPC**: WS-first (direct to Gateway:18789)

## Key Patterns

- **Single entry point**: `invokeIpc()` handles all IPC — enforced by ESLint rule
- **Transport config**: `configureApiTransports()` enables WS/HTTP
- **Error normalization**: All transports return `{ ok, data, error }` shape

## Anti-patterns

- ❌ `window.electron.ipcRenderer.invoke(...)` — Use `invokeIpc` from this module
- ❌ Bypassing api-client for IPC — ESLint will fail

## Gotchas

- **Transport enablement**: WS/HTTP disabled by default; configured at app startup
- **Gateway-only calls**: `gateway:rpc` routes to WS only
- **Timeout handling**: Built into transport layer, not per-call