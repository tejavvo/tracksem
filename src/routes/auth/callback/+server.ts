import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /auth/callback
 *
 * Supabase redirects here after a successful OAuth sign-in (Google, GitHub, etc.)
 * with a one-time `code` query param. We exchange that code for a real session
 * using the PKCE flow, then send the user on to the app.
 */
export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') ?? '/';

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Supabase SSR already wrote the session cookie via hooks.server.ts
            redirect(303, next);
        }
    }

    // Something went wrong — send the user back to the auth page with an error flag
    redirect(303, '/auth?error=oauth_callback_failed');
};