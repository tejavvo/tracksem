import { json } from '@sveltejs/kit';
import { getAllCourses } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
    const courses = getAllCourses();
    return json(courses);
};
