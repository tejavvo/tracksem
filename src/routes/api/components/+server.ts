import { json } from '@sveltejs/kit';
import { addComponent, updateComponentField, deleteComponent } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** POST /api/components → add a new component */
export const POST: RequestHandler = async ({ request }) => {
    const { courseId, id, name } = await request.json();
    addComponent(courseId, id, name);
    return json({ ok: true });
};

/** PATCH /api/components → update a component field */
export const PATCH: RequestHandler = async ({ request }) => {
    const { id, field, value } = await request.json();
    updateComponentField(id, field, value);
    return json({ ok: true });
};

/** DELETE /api/components → remove a component */
export const DELETE: RequestHandler = async ({ request }) => {
    const { id } = await request.json();
    deleteComponent(id);
    return json({ ok: true });
};
