import { json } from '@sveltejs/kit';
import { requireTokenUser } from '$lib/server/apiAuth';
import { loadOwned } from '$lib/server/apiItems';
import { addComponent, updateComponentField } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** POST /api/v1/components { courseId, name, weight?, maxScore? } → { id } */
export const POST: RequestHandler = async ({ request }) => {
    const { userId, supabase } = await requireTokenUser(request);
    const { courseId, name, weight, maxScore } = await request.json().catch(() => ({}));

    const { courseIds } = await loadOwned(supabase, userId);
    if (!courseIds.has(courseId)) return json({ error: 'Unknown courseId.' }, { status: 404 });
    if (typeof name !== 'string' || !name.trim() || name.length > 80)
        return json({ error: 'name must be a non-empty string (≤ 80 chars).' }, { status: 400 });
    if (weight !== undefined && !(typeof weight === 'number' && weight >= 0 && weight <= 100))
        return json({ error: 'weight must be a number from 0 to 100.' }, { status: 400 });
    if (maxScore !== undefined && !(typeof maxScore === 'number' && maxScore > 0))
        return json({ error: 'maxScore must be a number > 0.' }, { status: 400 });

    const id = `${courseId}-${crypto.randomUUID()}`;
    await addComponent(supabase, courseId, id, name.trim());
    if (weight !== undefined) await updateComponentField(supabase, id, 'weight', weight);
    if (maxScore !== undefined) await updateComponentField(supabase, id, 'maxScore', maxScore);
    return json({ id }, { status: 201 });
};
