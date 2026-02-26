import { json } from '@sveltejs/kit';
import { resetCourse } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** POST /api/courses/:id/reset → reset to defaults */
export const POST: RequestHandler = ({ params }) => {
    resetCourse(params.id);
    return json({ ok: true });
};
