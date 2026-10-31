---
name: tracksem
description: Read and fill in grades in the user's tracksem grade tracker — scores, max scores, weights, class averages/medians/highs/σ, best-of, new quiz/assignment parts. Use when the user mentions tracksem, wants to enter or update marks, class stats or course components, or asks how a course is going (gained / graded / max possible %).
---

# tracksem

tracksem tracks course grades. Each course has **components** (Midsem, Endsem, Quiz…) with a weight (% of the course); a component can be split into **sub-items** (Quiz 1, Quiz 2…). Scores are raw marks out of `maxScore`. Class stats (`classAvg`, `classMedian`, `classMax`, `classStdDev`) are in the same raw units as the item's `maxScore`.

## Setup check

The API needs two environment variables. Check them first without printing the token:

```bash
[ -n "$TRACKSEM_URL" ] && echo "URL: $TRACKSEM_URL" || echo "TRACKSEM_URL missing"
[ -n "$TRACKSEM_TOKEN" ] && echo "token set" || echo "TRACKSEM_TOKEN missing"
```

If either is missing, stop and tell the user: open tracksem → account menu (top right) → **API tokens** → **Create token**, then set `TRACKSEM_URL` (`https://tracksem.pages.dev` unless they host their own copy; no trailing slash) and `TRACKSEM_TOKEN` (see the repo README). Never echo, log or write the token anywhere.

## Workflow

1. **Fetch the current data** and keep it in a temp file so you can look things up:

   ```bash
   curl -sf -H "Authorization: Bearer $TRACKSEM_TOKEN" "$TRACKSEM_URL/api/v1/courses" > /tmp/tracksem.json
   python3 - <<'EOF'
   import json
   for c in json.load(open('/tmp/tracksem.json'))['courses']:
       s = c['summary']
       print(f"\n{c['name']} — {c['fullName']}  [{c['id']}]  gained {s['gainedPct']}% · graded {s['gradedPct']}% · max {s['maxPossiblePct']}%")
       for k in c['components']:
           print(f"  {k['name']:<22} w={k['weight']:<5} {k['score']}/{k['maxScore']}  avg={k.get('classAvg')}  [{k['id']}]")
           for s2 in k.get('subItems') or []:
               print(f"    {s2['name']:<20} {s2['score']}/{s2['maxScore']}  avg={s2.get('classAvg')}  [{s2['id']}]")
   EOF
   ```

2. **Map what the user said to item ids.** Match courses by code (`CS1.301`), short name (`AAD`) or full name; match items by name loosely ("mid-sem" = "Midsem", "q2" = "Quiz 2"). If a match is ambiguous, or a value looks implausible (score above the max, weights over 100), ask before writing.

3. **Convert values to the item's units** (see "Units" below), then build one batch of updates.

4. **Create missing parts first.** If the user gives a score for e.g. "Quiz 3" and the Quiz component has parts but no Quiz 3, add it with `POST /api/v1/sub-items`, then use the returned id. Ask before creating a whole new **component**, because that changes the course's weights.

5. **Apply the batch** with `PATCH /api/v1/items` (example below) and check `results`: any `"ok": false` has an `error` explaining why. Fix and retry only the failed ones.

6. **Report back** briefly: what changed (old → new) and the course summary from the response — gained %, graded %, max possible %, projected %.

## Units

| User says | Score (`score`) | Class stat (`classAvg` etc.) |
|---|---|---|
| `23` | 23 | 23 |
| `23/30`, item max is 30 | 23 | 23 |
| `23/30`, item max is 15 | set `maxScore` 30 **and** `score` 23 — the stored max was wrong | rescale: 23/30 × 15 = 11.5 |
| `80%` | 0.8 × maxScore | 0.8 × maxScore |
| "skipped", "not graded", clear it | `null` | `null` |

For a component that has parts, the component's own `score` is unused: write scores to the parts. For per-part class stats, also set the component's `statsMode` to `"per-sub"`. Otherwise class stats go on the component and `statsMode` stays `"global"`.

## API

All requests send `Authorization: Bearer $TRACKSEM_TOKEN`. Full field rules: [reference.md](reference.md).

```bash
# Batch update (up to 200 changes)
curl -sf -X PATCH "$TRACKSEM_URL/api/v1/items" \
  -H "Authorization: Bearer $TRACKSEM_TOKEN" -H "Content-Type: application/json" \
  -d '{"updates":[
        {"id":"<midsem id>","field":"score","value":14.07},
        {"id":"<midsem id>","field":"classAvg","value":28},
        {"id":"<quiz 2 id>","field":"score","value":12}
      ]}'

# Add a part to a component
curl -sf -X POST "$TRACKSEM_URL/api/v1/sub-items" \
  -H "Authorization: Bearer $TRACKSEM_TOKEN" -H "Content-Type: application/json" \
  -d '{"componentId":"<quiz component id>","name":"Quiz 3","maxScore":15}'

# Add a component (ask first)
curl -sf -X POST "$TRACKSEM_URL/api/v1/components" \
  -H "Authorization: Bearer $TRACKSEM_TOKEN" -H "Content-Type: application/json" \
  -d '{"courseId":"<course id>","name":"Project","weight":25,"maxScore":100}'
```

On `401` the token is wrong or revoked. On `503` the server has no `SUPABASE_SERVICE_ROLE_KEY`, so tell the user the API isn't configured on their deployment.
