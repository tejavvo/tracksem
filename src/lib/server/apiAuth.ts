import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { error } from '@sveltejs/kit';

/**
 * Service-role client for the token API. It bypasses row-level security, so
 * every query made with it MUST be scoped to the token owner's user id.
 */
let admin: SupabaseClient | null = null;
export function adminClient(): SupabaseClient {
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) error(503, 'API not configured: SUPABASE_SERVICE_ROLE_KEY is not set on the server.');
    admin ??= createClient(PUBLIC_SUPABASE_URL, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return admin;
}

export const TOKEN_PREFIX = 'tsk_';

function toBase64Url(bytes: Uint8Array): string {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashToken(token: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A new random token. Only its hash is stored. */
export async function generateToken(): Promise<{ token: string; hash: string; prefix: string }> {
    const token = TOKEN_PREFIX + toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    return { token, hash: await hashToken(token), prefix: token.slice(0, TOKEN_PREFIX.length + 6) };
}

/** Resolve `Authorization: Bearer tsk_…` to the owning user id, or throw 401. */
export async function requireTokenUser(request: Request): Promise<{ userId: string; supabase: SupabaseClient }> {
    const header = request.headers.get('authorization') ?? '';
    const match = header.match(/^Bearer\s+(tsk_[A-Za-z0-9_-]+)$/);
    if (!match) error(401, 'Missing or malformed token. Send "Authorization: Bearer tsk_…".');

    const supabase = adminClient();
    const { data, error: dbErr } = await supabase
        .from('api_tokens')
        .select('id, user_id')
        .eq('token_hash', await hashToken(match[1]))
        .maybeSingle();
    if (dbErr) throw dbErr;
    if (!data) error(401, 'Invalid or revoked token.');

    await supabase.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
    return { userId: data.user_id, supabase };
}
