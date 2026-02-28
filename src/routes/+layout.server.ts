import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, url }) => {
    const { user } = await safeGetSession();

    // Redirect unauthenticated users to the auth page (except when already there)
    if (!user && url.pathname !== '/auth') {
        redirect(303, '/auth');
    }

    // Redirect authenticated users away from the auth page
    if (user && url.pathname === '/auth') {
        redirect(303, '/');
    }

    return { user };
};