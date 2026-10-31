# tracksem API reference

Base URL: `$TRACKSEM_URL`. Every request needs `Authorization: Bearer tsk_…`. Responses are JSON. Errors look like `{ "message": "…" }` (auth) or `{ "error": "…" }` (validation).

## GET /api/v1/courses

```json
{
  "courses": [{
    "id": "cs1301",
    "name": "CS1.301",
    "fullName": "Algorithm Analysis and Design",
    "summary": { "totalWeight": 100, "projectedPct": 39.7, "gainedPct": 19.8, "gradedPct": 50, "maxPossiblePct": 69.8 },
    "components": [{
      "id": "…", "name": "Midsem", "weight": 25, "maxScore": 30, "score": 3.5,
      "bestOf": null, "statsMode": "global", "scaleTargetId": null,
      "classAvg": 10.32, "classMedian": 10.25, "classMax": 22.75, "classStdDev": null,
      "subItems": [{ "id": "…", "name": "Quiz 1", "score": 8.5, "maxScore": 15, "classAvg": 6, "…": "…" }]
    }]
  }]
}
```

`summary` is in percent of the course:
- `gainedPct`: marks locked in (ungraded work counts as 0)
- `gradedPct`: how much of the course has been assessed
- `maxPossiblePct`: the result with full marks on everything left
- `projectedPct`: the average over graded components

## PATCH /api/v1/items

Body: `{ "updates": [{ "id": "…", "field": "…", "value": … }] }`, with 1–200 updates. Each update is validated on its own. Invalid ones are skipped and reported, and the rest are applied.

| Field | On | Value |
|---|---|---|
| `score` | component, sub-item | `null` or number ≥ 0 (raw marks) |
| `maxScore` | component, sub-item | number > 0 |
| `weight` | component | number 0–100 (% of course) |
| `name` | component, sub-item | non-empty string ≤ 80 chars |
| `bestOf` | component | `null` or integer 1…number of sub-items |
| `statsMode` | component | `"global"` or `"per-sub"` |
| `scaleTargetId` | component, sub-item | `null` or the id of another of your items (marks are copied from it) |
| `classAvg`, `classMedian`, `classMax`, `classStdDev` | component, sub-item | `null` or number ≥ 0, same units as `maxScore` |

Response:

```json
{
  "results": [{ "id": "…", "field": "score", "ok": true }, { "id": "…", "field": "weight", "ok": false, "error": "…" }],
  "applied": 1, "failed": 1,
  "summaries": [{ "id": "cs1301", "name": "CS1.301", "summary": { "…": "…" } }]
}
```

## POST /api/v1/sub-items

Body: `{ "componentId": "…", "name"?: "Quiz 3", "maxScore"?: 15 }`. `name` defaults to "<component> N" and `maxScore` to the component's. Returns `201 { "id", "name" }`.

## POST /api/v1/components

Body: `{ "courseId": "…", "name": "Project", "weight"?: 25, "maxScore"?: 100 }`. Returns `201 { "id" }`.

## Status codes

`400` bad body · `401` missing, invalid or revoked token · `404` unknown course or component id · `503` server missing `SUPABASE_SERVICE_ROLE_KEY`
