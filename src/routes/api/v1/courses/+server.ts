import { json } from '@sveltejs/kit';
import { requireTokenUser } from '$lib/server/apiAuth';
import { loadOwned, summarize } from '$lib/server/apiItems';
import type { RequestHandler } from './$types';

/**
 * GET /api/v1/courses → every course with its components, sub-items, ids,
 * scores, class stats, and a percent summary.
 */
export const GET: RequestHandler = async ({ request }) => {
    const { userId, supabase } = await requireTokenUser(request);
    const { courses } = await loadOwned(supabase, userId);
    return json({ courses: courses.map((c) => ({ ...c, summary: summarize(c) })) });
};
