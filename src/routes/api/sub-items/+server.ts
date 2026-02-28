import { json } from '@sveltejs/kit';
import { addSubItem, updateSubItemField, deleteSubItem, getSubItemCount } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** POST /api/sub-items → add a new sub-item */
export const POST: RequestHandler = async ({ request, locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { componentId, id, name, maxScore } = await request.json();
    await addSubItem(locals.supabase, componentId, id, name, maxScore);
    return json({ ok: true });
};

/** PATCH /api/sub-items → update a sub-item field */
export const PATCH: RequestHandler = async ({ request, locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id, field, value } = await request.json();
    await updateSubItemField(locals.supabase, id, field, value);
    return json({ ok: true });
};

/** DELETE /api/sub-items → remove a sub-item */
export const DELETE: RequestHandler = async ({ request, locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id, componentId } = await request.json();
    await deleteSubItem(locals.supabase, id);
    const remaining = await getSubItemCount(locals.supabase, componentId);
    return json({ ok: true, remaining });
};