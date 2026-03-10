# AGENTS.md

**Generated:** 2026-03-09
**Commit:** d32d84f
**Branch:** main

## Overview

Cross-platform Electron desktop app (React 19 + Vite + TypeScript) providing a GUI for OpenClaw AI agent runtime. Uses pnpm with pinned version. **Tri-layer communication architecture**: IPC + Host HTTP API + direct Gateway WebSocket.

## Structure

```
ClawX/
├── electron/           # Main process (Electron)
│   ├── main/          # App entry, window, tray, IPC handlers
│   ├── preload/       # contextBridge IPC API surface
│   ├── gateway/       # OpenClaw Gateway process orchestration ⚠️ complex
│   ├── api/           # Host HTTP API server (127.0.0.1:3210)
│   ├── utils/         # Shared utilities ⚠️ 26 files
│   └── services/      # Provider/channel services
├── src/                # Renderer process (React)
│   ├── components/    # UI components (shadcn/ui based)
│   ├── pages/         # Route pages (Chat, Settings, etc.)
│   ├── stores/        # Zustand state stores
│   ├── lib/           # Frontend utilities
│   └── types/         # TypeScript definitions
├── scripts/            # Build/packaging scripts
└── resources/          # Static assets, icons, CLI wrappers
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| Add IPC channel | `electron/preload/index.ts` + `electron/main/ipc-handlers.ts` | Whitelist in preload, handler in main |
| Gateway lifecycle | `electron/gateway/manager.ts` | Start/stop/restart, WebSocket, health |
| Provider config | `electron/services/providers/` | Validation, storage, runtime sync |
| Channel config | `electron/utils/channel-config.ts` | Telegram/WhatsApp/DingTalk setup |
| State management | `src/stores/*.ts` | Zustand stores, init on app mount |
| API client | `src/lib/api-client.ts` | invokeIpc wrapper (REQUIRED, see Anti-patterns) |
| Host API routes | `electron/api/routes/*.ts` | HTTP endpoints for renderer |
| Build/packaging | `scripts/bundle-openclaw.mjs`, `electron-builder.yml` | OpenClaw bundling, platform targets |

## Architecture

**Dual API Model** (non-standard):
- **IPC**: Traditional Electron IPC via preload contextBridge
- **Host API**: Local HTTP server (port 3210) with SSE for real-time events
- **Direct WS**: Renderer connects directly to Gateway WebSocket (port 18789)

```
Renderer ──IPC──▶ Main Process ──UtilityProcess──▶ Gateway
    │                                      │
    └──── HTTP/SSE ───▶ Host API ◀─────────┘
    │
    └──── WebSocket ───▶ Gateway (direct RPC)
```

## Conventions

- **Path aliases**: `@/*` → `src/*`, `@electron/*` → `electron/*`
- **TypeScript**: Strict mode, noUnusedLocals/Parameters, bundler resolution
- **Lint**: ESLint flat config (`eslint.config.mjs`), auto-fix on `pnpm lint`
- **Format**: Prettier (semi, singleQuote, tabWidth: 2, trailingComma: es5)
- **Imports**: `@/lib/api-client` for IPC, never direct `window.electron.ipcRenderer.invoke`

## Anti-patterns

- ❌ `window.electron.ipcRenderer.invoke(...)` in src/** — Use `invokeIpc` from `@/lib/api-client`
- ❌ Database setup required — Uses electron-store (JSON) + OS keychain
- ❌ GPU hardware acceleration — Disabled globally for stability (see `electron/main/index.ts`)

## Commands

```bash
pnpm run init           # Install + download uv
pnpm dev                # Dev server (Vite + Electron)
pnpm run lint           # ESLint (auto-fix)
pnpm run typecheck      # TypeScript validation
pnpm test               # Vitest unit tests
pnpm run build:vite     # Frontend only
pnpm build              # Full build (includes OpenClaw bundle)
```

## Gotchas

- **pnpm version**: Pinned in `package.json` → use `corepack enable && corepack prepare`
- **Gateway startup**: Takes 10-30s on `pnpm dev`, not required for UI work
- **Linux dbus errors**: Expected in headless env, harmless with `$DISPLAY` set
- **Lint race condition**: Re-run if `temp_uv_extract` ENOENT after `uv:download`
- **Build warnings**: `@discordjs/opus`/`koffi` build scripts ignored (optional deps)
- **CI/Release drift**: Different Node versions (24 vs 20) and lockfile handling between workflows

## Large Files (Complexity Hotspots)

| File | Lines | Why Large |
|------|-------|-----------|
| `electron/main/ipc-handlers.ts` | 2424 | All IPC handlers in one file |
| `src/stores/chat.ts` | 1805 | Messages + sessions + streaming |
| `src/lib/api-client.ts` | 916 | Unified transport routing |
| `electron/utils/openclaw-auth.ts` | 915 | OAuth + device auth flows |
| `electron/gateway/manager.ts` | 772 | Gateway lifecycle orchestrator |

## Subdirectory Guides

- [`electron/gateway/AGENTS.md`](electron/gateway/AGENTS.md) — Gateway process orchestration
- [`electron/utils/AGENTS.md`](electron/utils/AGENTS.md) — Cross-cutting utilities
- [`electron/api/AGENTS.md`](electron/api/AGENTS.md) — Host HTTP API server
- [`src/stores/AGENTS.md`](src/stores/AGENTS.md) — Zustand state management
- [`src/lib/AGENTS.md`](src/lib/AGENTS.md) — Frontend transport layer
