# AGENTS.md — Gateway Process Orchestration

**Generated:** 2026-03-09

## Overview

Manages OpenClaw Gateway process lifecycle: spawn, connect, monitor, reconnect, shutdown. Spawns Gateway as Electron UtilityProcess with WebSocket control plane on port 18789.

## Structure

```
electron/gateway/
├── manager.ts              # Main orchestrator (GatewayManager class)
├── process-launcher.ts     # Spawns Gateway via UtilityProcess.fork()
├── supervisor.ts           # Orphan detection, doctor repair, port cleanup
├── ws-client.ts            # WebSocket connection + handshake
├── lifecycle-controller.ts # Epoch-based lifecycle guards
├── restart-controller.ts   # Debounced/deferred restart logic
├── connection-monitor.ts   # Health check + ping interval
├── state.ts                # State machine controller
├── protocol.ts             # JSON-RPC type guards
├── event-dispatch.ts       # Event routing to EventEmitter
├── config-sync.ts          # Pre-launch config preparation
├── request-store.ts        # Pending RPC request tracking
└── startup-*.ts            # Startup sequence orchestration
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Start/stop/restart | `manager.ts` | Main API, handles reconnection |
| Spawn process | `process-launcher.ts` | UtilityProcess.fork, env setup |
| WebSocket connect | `ws-client.ts` | Handshake, auth token |
| Health monitoring | `connection-monitor.ts` | Periodic ping + health RPC |
| Reconnect logic | `manager.ts:705` | Exponential backoff, max attempts |
| Lifecycle guards | `lifecycle-controller.ts` | Prevents stale operations |
| Process cleanup | `supervisor.ts` | Kill orphans, wait for port free |

## Protocol

Gateway uses OpenClaw JSON-RPC-like protocol:
- **Request**: `{ type: "req", id, method, params }`
- **Response**: `{ type: "res", id, ok, payload, error }`
- **Event**: `{ type: "event", event, payload }`

## Key Patterns

- **Epoch guards**: `lifecycle-controller.ts` tracks operation epochs to cancel stale start/stop flows
- **Debounced restart**: `restart-controller.ts` coalesces rapid restart requests
- **SIGUSR1 reload**: On Unix, sends signal for in-process config reload instead of restart
- **Device identity**: Loaded lazily in `manager.ts:initDeviceIdentity()` for WebSocket auth

## Anti-patterns

- ❌ Awaiting `gatewayManager.stop()` in `before-quit` — Stalls Electron quit sequence; use fire-and-forget
- ❌ Direct process kill without checking ownership — May kill wrong process

## Ports

- **18789**: Gateway WebSocket (main RPC)
- **3210**: Host API (separate, in `electron/api/`)

## Gotchas

- **Windows port reuse**: Must wait for port to be free before respawn (OS holds port briefly after kill)
- **Startup stderr**: Classified in `startup-stderr.ts` — many harmless warnings filtered
- **External vs owned**: Manager can connect to already-running Gateway (no ownership) or spawn its own