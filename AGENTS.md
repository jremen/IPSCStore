<!-- graymatter:instructions:begin — managed by `graymatter init`; edits inside this block are overwritten -->
## Memory (GrayMatter)

This project has persistent agent memory via the `graymatter` MCP tools:

- `memory_search` (`agent_id`, `query`) — call at the **start of a task** when prior context might matter.
- `memory_add` (`agent_id`, `text`) — call whenever you learn something **durable**: user preferences, decisions, conventions, gotchas.
- `memory_reflect` (`action`, `agent`, `text`/`target`) — update or forget stale facts. ⚠ takes `agent`, not `agent_id`.
- `checkpoint_save` / `checkpoint_resume` (`agent_id`) — snapshot/restore session state before major refactors or across restarts.

Use a stable `agent_id` of the form `<project>-<role>` (e.g. `myapp-backend`). Store conclusions, not conversation logs. Err on the side of remembering.
<!-- graymatter:instructions:end -->

---

## GrayMatter Workflow — IPSCScore

> Everything below is preserved on re-runs of `graymatter init`.

### agent_id convention

| Scope | agent_id | Examples |
|---|---|---|
| Frontend code (React, hooks, components, i18n) | `ipscscore-frontend` | design decisions, component patterns, UI quirks |
| Backend code (Express, database, API) | `ipscscore-backend` | query patterns, migration gotchas |
| Electron shell | `ipscscore-electron` | packaging, IPC |
| Cross-cutting (Docker, CI, repo layout, conventions) | `__shared__` | git workflow, shared tooling |

Choose the id matching the files you're editing. When in doubt, prefer the most specific id.

### Session boot — every session, first thing

```
1. checkpoint_resume  (agent_id = "ipscscore-<role>")
2. memory_search      (agent_id = "ipscscore-<role>",   query = "<task description>", top_k = 8)
3. memory_search      (agent_id = "__shared__",          query = "<task description>", top_k = 5)
4. Merge results.  Surface relevant facts in your reasoning before answering.
```

### Pre-plan — before producing a plan for the user

- Search memory (`ipscscore-<role>` + `__shared__`) for the affected subsystem.
- Surface any prior decisions, gotchas, or conventions that apply to the task.
- If a prior decision contradicts what you're about to propose, call `memory_reflect action=update` to correct it before acting.

### Write trigger #1 — after a non-trivial decision is made

If the user or the conversation produces a durable conclusion, architectural choice, preference, or workaround:

```
memory_add
  agent_id = "ipscscore-<role>"   (or "__shared__" for cross-cutting facts)
  text      = "<one atomic conclusion>"
```

Store immediately — don't wait for the session to end. Decisions decay from working memory faster than facts decay in GrayMatter.

Examples of what to store:

- "Chose to keep auto-save per-drop in squadding modal rather than batch save"
- "@dnd-kit dependencies must live in frontend/package.json, not root, because Docker node_modules lives inside the container"
- "Docker rebuild required whenever package.json changes — src/ and index.html are bind-mounted but node_modules is not"
- "User's i18n convention: common verb labels in common.*, entity-type strings use {{entity}} interpolation for Slovak grammar"

### Write trigger #2 — after implementation completes (e.g. code committed)

```
memory_add
  agent_id = "ipscscore-<role>"
  text      = "<what was learned, not what was done>"
```

Good post-build memories are generalised learnings, not commit logs:

- ✅ `api.bulkUpdateRegistrations returns stale data if called before the preceding optimistic local update has settled`
- ❌ `Updated useSquadding.ts to add flushPending`

### Anti-patterns specific to this project

- **Do not store Docker commands or git commands** as facts — they belong in AGENTS.md itself, not in memory.
- **Do not re-learn from scratch** if you recall a prior decision about squadding, i18n, DnD, or Docker — the answer is already in memory, search again with better keywords.
- **Do not store file paths or line numbers** — those rot. Store the pattern, not the location.

### Shared namespace rules

- **`__shared__`** — monorepo layout, Docker workflow, i18n conventions, branch strategy, anything a new contributor should know.
- **`ipscscore-frontend`** — React patterns, component decisions, hook refactorings, Flowbite usage, frontend-specific gotchas.
- **`ipscscore-backend`** — database schema decisions, API patterns, backend-specific gotchas.
- **Never duplicate** — if the same fact would apply to all roles, write once to `__shared__`.

### Tailwind CSS v4

In Tailwind 4, the `!important` modifier is a **suffix**, not a prefix:

- **Correct**: `pr-0!`, `w-4!`, `p-0!`
- **Wrong (Tailwind 3 syntax)**: `!pr-0`, `!w-4`, `!p-0`

This applies to all utility classes that need the `!important` override.
