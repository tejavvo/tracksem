import { grades } from '$lib/stores/grades.svelte';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
    const course = grades.getCourse(params.id);
    if (!course) {
        error(404, 'Course not found');
    }
    return { courseId: params.id };
};
