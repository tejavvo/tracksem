# tracksem

> track your sem 2 grades before they track you

A TUI-style grade tracker for sem 2 courses — ISS, CSO, IoT, LA, DSA. Enter scores, get live projections, manage components dynamically.

## stack

- [SvelteKit](https://kit.svelte.dev) + Svelte 5 runes
- [shadcn-svelte](https://shadcn-svelte.com) + Tailwind CSS v4
- [Supabase](https://supabase.com) for persistence
- [Cloudflare Workers](https://workers.cloudflare.com) for deployment
- [Bun](https://bun.sh)

## dev

```bash
bun install
bun run dev
```

→ `http://localhost:5173`

`.env` needs:

```bash
PUBLIC_SUPABASE_URL=https://<project>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon key>
# Only needed for the token API (/api/v1). Server-side only, never commit it.
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

## database

Run [`supabase_migration.sql`](supabase_migration.sql) in **Supabase → SQL Editor**. It is safe to re-run, and you must re-run it whenever it changes. Run it **before** deploying code that uses new columns or tables, or the app will fail to load courses.

## deploy

Live at **https://tracksem.pages.dev**. Cloudflare Pages builds and deploys from git (no `wrangler.toml` in this repo): merging into `production` deploys. The production branch is set in **Cloudflare dashboard → Workers & Pages → tracksem → Settings → Builds & deployments**.

Set these in **Settings → Variables and Secrets** (Production). The service key must be of type *Secret*. Changes to variables only apply to the **next** deployment, so redeploy afterwards:

| Name | Type |
| ---- | ---- |
| `PUBLIC_SUPABASE_URL` | variable |
| `PUBLIC_SUPABASE_ANON_KEY` | variable |
| `SUPABASE_SERVICE_ROLE_KEY` | secret (Supabase → Project Settings → API → `service_role`) |

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
- **Fast entry** — type `23`, `23/30` or `80%` straight into the score table; parts, best-of, scaling and class stats live in a side panel
- **Course totals** — gained, graded and maximum possible, as % of the course
- **Class distribution** — your standing vs the class from the averages you enter
- **Supabase persistence** — per-user data with row-level security
- **Token API + Claude skill** — let Claude fill in your marks (see below)

## API

Create a token in the app: account menu (top right) → **API tokens** → **Create token**. Copy it right away, because it is only shown once. Send it as `Authorization: Bearer tsk_…`.

| Method | Path | What |
| ------ | ---- | ---- |
| `GET` | `/api/v1/courses` | all courses, components, sub-items (with ids) and a % summary |
| `PATCH` | `/api/v1/items` | batch update: `{"updates":[{"id","field","value"}]}` |
| `POST` | `/api/v1/sub-items` | add a part: `{"componentId","name"?,"maxScore"?}` |
| `POST` | `/api/v1/components` | add a component: `{"courseId","name","weight"?,"maxScore"?}` |

Fields and rules: [`.claude/skills/tracksem/reference.md`](.claude/skills/tracksem/reference.md).

```bash
curl -H "Authorization: Bearer $TRACKSEM_TOKEN" "$TRACKSEM_URL/api/v1/courses"
```

## Claude skill

The repo ships a [Claude Code](https://claude.com/claude-code) skill in [`.claude/skills/tracksem`](.claude/skills/tracksem). With it you can tell Claude things like *"OSN midsem 14.07/50, class avg 28"* or *"I got 12/15 on AAD quiz 2"* and it fills them in for you.

**1. Install the skill**

Inside this repo it already works, because Claude Code loads `.claude/skills/` from the project. To use it from any directory, install it for your user:

```bash
mkdir -p ~/.claude/skills
# symlink (updates when you git pull)
ln -s "$PWD/.claude/skills/tracksem" ~/.claude/skills/tracksem
# …or copy
cp -r .claude/skills/tracksem ~/.claude/skills/
```

**2. Give it your URL and token**

Either export them in your shell profile (`~/.bashrc`, `~/.zshrc`):

```bash
export TRACKSEM_URL="https://tracksem.pages.dev"   # no trailing slash
export TRACKSEM_TOKEN="tsk_…"
```

or add them to `~/.claude/settings.json` so only Claude Code sees them:

```json
{
  "env": {
    "TRACKSEM_URL": "https://tracksem.pages.dev",
    "TRACKSEM_TOKEN": "tsk_…"
  }
}
```

**3. Use it**

Restart Claude Code, then just ask, e.g. *"AAD quiz 2 was 12/15, class average 7"*, or call it directly with `/tracksem`. To cut off access, revoke the token in **API tokens**.

## courses

| Course | Total Weight |
| ------ | ------------ |
| ISS    | 100%         |
| CSO    | 100%         |
| IoT    | 100%         |
| LA     | 100%         |
| DSA    | 92% ⚠        |

## grade scale

| Letter | Range  |
| ------ | ------ |
| A      | ≥ 90%  |
| A-     | 85–89% |
| B      | 80–84% |
| B-     | 75–79% |
| C      | 70–74% |
| C-     | 65–69% |
| D      | 60–64% |
| F      | < 60%  |

## Future Plans

- [ ] Export and Import
- [X] Semester Support
- [X] Multi-user Support
- [X] API + Claude skill
