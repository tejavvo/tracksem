import { json } from '@sveltejs/kit';
import { generateToken } from '$lib/server/apiAuth';
import type { RequestHandler } from './$types';

// Token management uses the signed-in session, so row-level security scopes it.

/** GET /api/tokens → your tokens (never the secret) */
export const GET: RequestHandler = async ({ locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await locals.supabase
        .from('api_tokens')
        .select('id, name, prefix, created_at, last_used_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return json(data);
};

/** POST /api/tokens { name } → { token } (shown once) */
export const POST: RequestHandler = async ({ request, locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json().catch(() => ({}));
    const label = typeof name === 'string' && name.trim() ? name.trim().slice(0, 60) : 'Claude';
    const { token, hash, prefix } = await generateToken();

    const { data, error } = await locals.supabase
        .from('api_tokens')
        .insert({ user_id: user.id, name: label, token_hash: hash, prefix })
        .select('id, name, prefix, created_at, last_used_at')
        .single();
    if (error) throw error;
    return json({ ...data, token });
};

/** DELETE /api/tokens { id } → revoke */
export const DELETE: RequestHandler = async ({ request, locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    const { error } = await locals.supabase.from('api_tokens').delete().eq('id', id);
    if (error) throw error;
    return json({ ok: true });
};
