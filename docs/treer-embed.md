# Treer embed chrome flags

`apps/agent-ui-web` is the Treer-embedded thread surface. Hosts can opt into
chrome through iframe query parameters or an equivalent bootstrap object.
Flags are **opt-in**: when they are omitted, behavior stays identical to today
(`embedded-single-thread`, no file tree, no RC nav, permission cards visible).

Do not change Remote Codex supervisor-web defaults. Supervisor-web and the
playground keep `presentation="workspace"` unless they pass these props
themselves.

## Query parameters

Pass flags on the iframe URL, for example:

```text
...?presentation=embedded-single-thread&explorer=1&shell=0&permissions=0&nav=0
```

| Query | Treer default | Effect |
| --- | --- | --- |
| `presentation=embedded-single-thread` | on | Existing single-thread layout: no rooms rail / thread list |
| `explorer=0` or `1` | Treer wants `1` | Hide/show the workspace file tree |
| `shell=0` or `1` | Treer wants `0` | Hide/show the RC thread shell / terminal plugin |
| `permissions=0` or `1` | Treer wants `0` | Hide/show permission and request cards |
| `nav=0` or `1` | Treer wants `0` | Hide/show the RC app/workspace switcher / app menu |

Boolean values accept `1` / `0`, `true` / `false`, `on` / `off`, and `yes` / `no`.

Recommended Treer iframe query:

```text
presentation=embedded-single-thread&explorer=1&shell=0&permissions=0&nav=0
```

## Bootstrap

The same keys can be provided before the UI boots:

```js
window.__REMOTE_CODEX_THREAD_UI__ = {
  presentation: "embedded-single-thread",
  explorer: 1,
  shell: 0,
  permissions: 0,
  nav: 0,
};
```

`window.__REMOTE_CODEX_EMBED__` is also accepted. Query parameters override
bootstrap values.

## Host props

`ThreadDetailSurface` exposes optional props rather than Treer-specific
branching:

- `presentation`
- `hideExplorer`
- `hideShell`
- `hidePermissionCards`
- `hideNav`
- `chrome` (partial flag overrides)

`PluginProvider` accepts `hideTerminalPanels` to omit the terminal plugin
panel. `ThreadTimeline` accepts `hidePermissionCards`.
