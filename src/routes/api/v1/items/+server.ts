import { json } from '@sveltejs/kit';
import { requireTokenUser } from '$lib/server/apiAuth';
import { applyUpdates, loadOwned, summarize, type Update } from '$lib/server/apiItems';
import type { RequestHandler } from './$types';

const MAX_UPDATES = 200;

/**
 * PATCH /api/v1/items
 * { "updates": [{ "id": "<component or sub-item id>", "field": "score", "value": 23 }, …] }
 * Each update is validated on its own; invalid ones are skipped and reported.
 * Responds with per-update results and the refreshed course summaries.
 */
export const PATCH: RequestHandler = async ({ request }) => {
    const { userId, supabase } = await requireTokenUser(request);
    const body = await request.json().catch(() => null);
    const updates = body?.updates;
    if (!Array.isArray(updates) || updates.length === 0)
        return json({ error: 'Body must be { "updates": [{ id, field, value }, …] }.' }, { status: 400 });
    if (updates.length > MAX_UPDATES)
        return json({ error: `At most ${MAX_UPDATES} updates per request.` }, { status: 400 });

    const results = await applyUpdates(supabase, userId, updates as Update[]);
    const { courses } = await loadOwned(supabase, userId);
    return json({
        results,
        applied: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        summaries: courses.map((c) => ({ id: c.id, name: c.name, summary: summarize(c) })),
    });
};
