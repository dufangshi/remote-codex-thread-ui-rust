# Remote Codex Thread UI

Standalone workspace for the Remote Codex thread surface, app shell, built-in UI plugins, and Treer ACP Agent UI recipe.

The shared packages remain UI-only. Runtime integrations translate provider events into the shared thread DTOs consumed by `@remote-codex/thread-ui`. The Treer recipe is a separate app boundary that hosts an ACP runtime and exposes the same surface through `treer.agent-interface/v1`.

## Packages

- `@remote-codex/thread-ui`: React thread/chat/artifact/settings surface.
- `@remote-codex/shared`: Current DTO contract source copied from Remote Codex. This should be narrowed
  into a dedicated `@remote-codex/thread-ui-contracts` package before publishing externally.
- `@remote-codex/plugin-runtime`: Shared plugin/artifact helpers.
- `@remote-codex/plugin-terminal`: Built-in terminal plugin manifest.

## Apps

- `apps/playground`: Vite playground with mock thread data for visual iteration.
- `apps/agent-ui-web`: Embedded single-thread surface used through Treer's AIS iframe tunnel. Optional chrome flags are documented in `docs/treer-embed.md`.
- `apps/agent-ui-server`: ACP client, authentication flow, normalized thread projection, and AIS HTTP/WebSocket server.

## Treer Recipe

Install the repository URL from Treer's **Install recipe** flow:

```text
https://github.com/dufangshi/remote-codex-thread-ui.git
```

The installer lists the supported ACP harnesses, asks which ones to install, then creates one Treer command Agent and launch profile per selection. Each Agent owns one ACP session and registers an embedded UI with prompt, transcript, state, and abort capabilities.

For direct inspection inside a Treer-managed installer Agent:

```bash
./scripts/apply.sh --list
./scripts/apply.sh --agent codex
```

## Development

```bash
pnpm install
pnpm build
pnpm dev
```

The playground is the default place to redesign the UI toward a GraphChat-like product surface without
pulling in the full Remote Codex control-plane runtime.

## Boundary

Keep the shared packages UI-only:

- Do not add Treer Proxy auth, sandbox routing, database, or deployment logic to the shared packages.
- Keep backend-specific behavior in adapters outside the core thread UI.
- Prefer typed DTO/event inputs over direct runtime coupling.
- Keep the ACP/AIS process in `apps/agent-ui-server`; do not move provider lifecycle into React components.
