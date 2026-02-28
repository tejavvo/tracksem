import { json } from '@sveltejs/kit';
import { addCourseWithDefaults, deleteCourse, getAllCourses } from '$lib/server/db';
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

/** POST /api/courses → add a new course with defaults */
export const POST: RequestHandler = async ({ request, locals }) => {
    const {
        data: { user }
    } = await locals.supabase.auth.getUser();

    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, fullName, color } = await request.json();
    if (!name || !fullName || !color) {
        return json({ error: 'Missing fields' }, { status: 400 });
    }

    const course = await addCourseWithDefaults(
        locals.supabase,
        user.id,
        name,
        fullName,
        color
    );
    return json(course);
};

/** DELETE /api/courses → delete a course */
export const DELETE: RequestHandler = async ({ request, locals }) => {
    const {
        data: { user }
    } = await locals.supabase.auth.getUser();

    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
        return json({ error: 'Missing id' }, { status: 400 });
    }

    await deleteCourse(locals.supabase, user.id, id);
    return json({ ok: true });
};