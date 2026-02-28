import { json } from '@sveltejs/kit';
import { addComponent, updateComponentField, deleteComponent } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** POST /api/components → add a new component */
export const POST: RequestHandler = async ({ request, locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId, id, name } = await request.json();
    await addComponent(locals.supabase, courseId, id, name);
    return json({ ok: true });
};

/** PATCH /api/components → update a component field */
export const PATCH: RequestHandler = async ({ request, locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id, field, value } = await request.json();
    await updateComponentField(locals.supabase, id, field, value);
    return json({ ok: true });
};

/** DELETE /api/components → remove a component */
export const DELETE: RequestHandler = async ({ request, locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    await deleteComponent(locals.supabase, id);
    return json({ ok: true });
};