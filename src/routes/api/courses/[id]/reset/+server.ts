import { json } from '@sveltejs/kit';
import { resetCourse } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** POST /api/courses/:id/reset → reset to defaults */
export const POST: RequestHandler = async ({ params, locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    await resetCourse(locals.supabase, params.id);
    return json({ ok: true });
};