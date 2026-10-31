import { json } from '@sveltejs/kit';
import { requireTokenUser } from '$lib/server/apiAuth';
import { loadOwned } from '$lib/server/apiItems';
import { addSubItem } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** POST /api/v1/sub-items { componentId, name?, maxScore? } → { id, name } */
export const POST: RequestHandler = async ({ request }) => {
    const { userId, supabase } = await requireTokenUser(request);
    const { componentId, name, maxScore } = await request.json().catch(() => ({}));

    const { items } = await loadOwned(supabase, userId);
    const ref = items.get(componentId);
    if (!ref || ref.kind !== 'component') return json({ error: 'Unknown componentId.' }, { status: 404 });
    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 80))
        return json({ error: 'name must be a non-empty string (≤ 80 chars).' }, { status: 400 });
    if (maxScore !== undefined && !(typeof maxScore === 'number' && maxScore > 0))
        return json({ error: 'maxScore must be a number > 0.' }, { status: 400 });

    const n = (ref.comp.subItems?.length ?? 0) + 1;
    const id = `${componentId}-${crypto.randomUUID()}`;
    const finalName = name?.trim() || `${ref.comp.name} ${n}`;
    await addSubItem(supabase, componentId, id, finalName, maxScore ?? ref.comp.maxScore);
    return json({ id, name: finalName }, { status: 201 });
};
