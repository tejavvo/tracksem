# tracksem

> track your sem 2 grades before they track you

A TUI-style grade tracker for sem 2 courses — ISS, CSO, IoT, LA, DSA. Enter scores, get live projections, manage components dynamically.

## stack

- [SvelteKit](https://kit.svelte.dev) + Svelte 5 runes
- [shadcn-svelte](https://shadcn-svelte.com) + Tailwind CSS v4
- [Bun](https://bun.sh)
- `localStorage` for persistence (no backend)

## dev

```bash
bun install
bun run dev
```

→ `http://localhost:5173`

## features

- **Dashboard** — all courses at a glance with letter grade, projected %, and per-component bars
- **Course detail** — click any card to open a live-editable table
  - edit component name, weight, score, max score inline
  - add custom components (bonus marks, participation, etc.)
  - remove any component
  - reset to defaults
- **Live projection** — weighted average recalculates instantly as you type
- **Weight validation** — warns if component weights don't sum to 100%
- **Persistent** — data survives page refreshes via localStorage

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
| S | ≥ 90% |
| A | ≥ 80% |
| B | ≥ 70% |
| C | ≥ 60% |
| D | ≥ 50% |
| F | < 50% |
