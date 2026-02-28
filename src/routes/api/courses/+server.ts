import { json } from '@sveltejs/kit';
import { getAllCourses } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    const {
        data: { user }
    } = await locals.supabase.auth.getUser();

    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const courses = await getAllCourses(locals.supabase, user.id);
    return json(courses);
};