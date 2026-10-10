# Migration Notes

This workspace was split from `/home/u/dev/pockymoe-main` on branch `main` at
commit `66b2317`, including the local uncommitted package changes present in that
worktree at extraction time.

## Current State

- The workspace builds independently with `pnpm build`.
- `apps/playground` runs a standalone Vite surface at `http://localhost:5174/`.
- Built-in terminal and XYZ viewer plugin packages are included.
- The playground uses mock thread data, mock adapter callbacks, app shell navigation,
  plugin settings context, and an expandable molecule artifact.
- `apps/agent-ui-web` uses the same `ThreadDetailSurface` in the
  `embedded-single-thread` presentation mode.
- `apps/agent-ui-server` maps ACP sessions into the shared thread DTOs and exposes
  a `treer.agent-interface/v1` server plus the embedded web bundle.
- The root `treer-agent.json` and `scripts/apply.sh` make this repository a
  clone-and-run Treer recipe without another sibling checkout.

## Intentional Temporary Compromise

`@pockymoe/shared` is still copied in as the DTO source. This keeps the first
extraction behavior-compatible and avoids changing thread UI contracts while preparing
for visual work.

Before publishing this as a durable external package, narrow it into a UI-specific
contract package such as:

```text
@pockymoe/thread-ui-contracts
```

That package should contain only the DTOs required by:

- thread list/detail
- timeline items
- artifacts
- plugin manifests
- composer settings
- shell panel status
- app shell settings

## Integration

Build and verify both the reusable UI packages and Treer Agent UI:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
./scripts/apply.sh --list
```

Treer installs the recipe from the repository URL. `scripts/apply.sh` installs
only the selected harnesses, creates their command Agents and launch profiles,
and waits for the verified AIS descriptor.

## Boundary Rules

- Do not add control-plane auth, Proxy routing, sandbox workers, databases, or
  deployment infrastructure to the shared packages.
- Keep GraphChat, Pydantic AI, Codex, Claude Code, and OpenCode support as adapter
  concerns that produce the thread UI DTOs.
- Keep plugin enablement and settings state explicit through props/context adapters.
- Keep ACP process ownership, authentication, and AIS routes in
  `apps/agent-ui-server`, outside React and `packages/thread-ui`.
