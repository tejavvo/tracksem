import { json } from '@sveltejs/kit';
import { addSubItem, updateSubItemField, deleteSubItem, getSubItemCount } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** POST /api/sub-items → add a new sub-item */
export const POST: RequestHandler = async ({ request }) => {
    const { componentId, id, name, maxScore } = await request.json();
    addSubItem(componentId, id, name, maxScore);
    return json({ ok: true });
};

/** PATCH /api/sub-items → update a sub-item field */
export const PATCH: RequestHandler = async ({ request }) => {
    const { id, field, value } = await request.json();
    updateSubItemField(id, field, value);
    return json({ ok: true });
};

/** DELETE /api/sub-items → remove a sub-item */
export const DELETE: RequestHandler = async ({ request }) => {
    const { id, componentId } = await request.json();
    deleteSubItem(id);
    // Return remaining count so client can adjust bestOf
    const remaining = getSubItemCount(componentId);
    return json({ ok: true, remaining });
};
