import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return event.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) =>
                    event.cookies.set(name, value, { ...options, path: '/' })
                );
            }
        }
    });

    /**
     * Use getUser() instead of getSession() — getUser() validates the JWT by
     * contacting the Supabase Auth server, so it is safe to trust server-side.
     * getSession() only reads from the cookie and must never be trusted directly.
     */
    event.locals.safeGetSession = async () => {
        const {
            data: { user },
            error
        } = await event.locals.supabase.auth.getUser();

        if (error || !user) return { user: null };
        return { user };
    };

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range' || name === 'x-supabase-api-version';
        }
    });
};