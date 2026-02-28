# tracksem

> track your sem 2 grades before they track you

A TUI-style grade tracker for sem 2 courses — ISS, CSO, IoT, LA, DSA. Enter scores, get live projections, manage components dynamically.

## stack

- [SvelteKit](https://kit.svelte.dev) + Svelte 5 runes
- [shadcn-svelte](https://shadcn-svelte.com) + Tailwind CSS v4
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for persistence
- [Bun](https://bun.sh)

## dev

```bash
bun install
bun run dev
```

→ `http://localhost:5173`

The SQLite database (`data/tracksem.db`) is auto-created and seeded on first run.

## features

- **Dashboard** — all courses at a glance with letter grade, projected %, and per-component bars
- **Course detail** — click any card to open a live-editable table
  - edit component name, weight, score, max score inline
  - add custom components (bonus marks, participation, etc.)
  - remove any component
  - reset to defaults
- **Expandable components** — click ⊕ on any flat component to add sub-items (e.g. split "Quiz" into Quiz 1, Quiz 2)
- **Best-of scoring** — drop lowest N scores automatically (e.g. best 8 of 9 labs)
- **Live projection** — weighted average recalculates instantly as you type
- **Weight validation** — warns if component weights don't sum to 100%
- **SQLite persistence** — data lives in `data/tracksem.db`, survives restarts

## courses

| Course | Total Weight |
|--------|-------------|
| ISS    | 100% |
| CSO    | 100% |
| IoT    | 100% |
| LA     | 100% |
| DSA    | 92% ⚠ |

> DSA components as listed sum to 92%. Adjust weights or add a component to fix it.

## grade scale

| Letter | Range |
|--------|-------|
| A  | ≥ 90% |
| A- | 85–89% |
| B  | 80–84% |
| B- | 75–79% |
| C  | 70–74% |
| C- | 65–69% |
| D  | 60–64% |
| F  | < 60% |


## Future Plans
- [ ] Exprot and Import
- [ ] Semester Support
- [ ] Multi-user Support