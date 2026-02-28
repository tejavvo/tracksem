<script lang="ts">
    import { createBrowserClient } from "@supabase/ssr";
    import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from "$env/static/public";
    import { goto, invalidateAll } from "$app/navigation";
    import { browser } from "$app/environment";
    import { page } from "$app/state";

    const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

    let mode = $state<"signin" | "signup">("signin");
    let email = $state("");
    let password = $state("");
    let loading = $state(false);
    let oauthLoading = $state<"google" | "github" | null>(null);
    // Pre-populate error from ?error= query param (e.g. OAuth callback failure)
    let error = $state<string | null>(
        page.url.searchParams.get("error") === "oauth_callback_failed"
            ? "OAuth sign-in failed. Please try again."
            : null
    );

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = null;
        loading = true;

        try {
            if (mode === "signin") {
                const { error: err } = await supabase.auth.signInWithPassword({ email, password });
                if (err) { error = err.message; return; }
                await invalidateAll();
                goto("/");
            } else {
                // Sign up then immediately sign in — requires email confirmations
                // to be disabled in Supabase Auth settings.
                const { error: signUpErr } = await supabase.auth.signUp({ email, password });
                if (signUpErr) { error = signUpErr.message; return; }

                const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
                if (signInErr) {
                    // Email confirmation is still enabled in Supabase settings
                    error = "Account created — but email confirmation is required. Check your inbox, then sign in.";
                    mode = "signin";
                    password = "";
                    return;
                }
                await invalidateAll();
                goto("/");
            }
        } finally {
            loading = false;
        }
    }

    async function signInWithOAuth(provider: "google" | "github") {
        if (!browser) return;
        error = null;
        oauthLoading = provider;
        try {
            const { error: err } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (err) error = err.message;
        } finally {
            oauthLoading = null;
        }
    }
</script>

<div class="page">
    <div class="card">
        <!-- Brand -->
        <div class="brand">
            <div class="brand-icon mono">&gt;_</div>
            <div>
                <div class="brand-title mono">tracksem</div>
                <div class="brand-sub mono">semester grade tracker</div>
            </div>
        </div>

        <!-- OAuth buttons -->
        <div class="oauth-group">
            <button
                class="oauth-btn mono"
                onclick={() => signInWithOAuth("google")}
                disabled={!!oauthLoading || loading}
            >
                {#if oauthLoading === "google"}
                    <span class="spinner"></span>
                {:else}
                    <svg class="oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                {/if}
                continue with google
            </button>

            <button
                class="oauth-btn mono"
                onclick={() => signInWithOAuth("github")}
                disabled={!!oauthLoading || loading}
            >
                {#if oauthLoading === "github"}
                    <span class="spinner"></span>
                {:else}
                    <svg class="oauth-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                {/if}
                continue with github
            </button>
        </div>

        <!-- Divider -->
        <div class="divider">
            <span class="divider-line"></span>
            <span class="divider-text mono">or</span>
            <span class="divider-line"></span>
        </div>

        <!-- Tab toggle -->
        <div class="tabs">
            <button
                class="tab mono"
                class:active={mode === "signin"}
                onclick={() => { mode = "signin"; error = null; }}
            >
                sign_in
            </button>
            <button
                class="tab mono"
                class:active={mode === "signup"}
                onclick={() => { mode = "signup"; error = null; }}
            >
                sign_up
            </button>
        </div>

        <!-- Email / password form -->
        <form onsubmit={handleSubmit}>
            <div class="field">
                <label class="label mono" for="email">// email</label>
                <input
                    id="email"
                    class="input mono"
                    type="email"
                    bind:value={email}
                    placeholder="you@example.com"
                    autocomplete="email"
                    required
                    disabled={loading || !!oauthLoading}
                />
            </div>

            <div class="field">
                <label class="label mono" for="password">// password</label>
                <input
                    id="password"
                    class="input mono"
                    type="password"
                    bind:value={password}
                    placeholder={mode === "signup" ? "min 6 characters" : "••••••••"}
                    autocomplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    disabled={loading || !!oauthLoading}
                />
            </div>

            {#if error}
                <div class="msg error mono">! {error}</div>
            {/if}

            <button class="submit mono" type="submit" disabled={loading || !!oauthLoading}>
                {#if loading}
                    <span class="spinner"></span>
                    {mode === "signin" ? "signing in…" : "creating account…"}
                {:else}
                    {mode === "signin" ? "> sign in" : "> create account"}
                {/if}
            </button>
        </form>

        <p class="hint mono">
            {mode === "signin" ? "no account yet?" : "already have an account?"}
            <button
                class="link mono"
                onclick={() => { mode = mode === "signin" ? "signup" : "signin"; error = null; }}
            >
                {mode === "signin" ? "sign_up" : "sign_in"}
            </button>
        </p>
    </div>
</div>

<style>
    .page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: oklch(0.08 0.02 265);
    }

    .card {
        width: 100%;
        max-width: 400px;
        background: oklch(0.11 0.02 265);
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 12px;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    @media (max-width: 480px) {
        .page {
            padding: 1rem 0.75rem;
        }

        .card {
            padding: 1.25rem;
            gap: 1rem;
            border-radius: 10px;
        }

        .brand-icon {
            font-size: 1.25rem;
        }

        .brand-title {
            font-size: 1rem;
        }

        .oauth-btn {
            padding: 0.6rem 0.75rem;
            font-size: 0.75rem;
        }

        .input {
            padding: 0.6rem 0.7rem;
            font-size: 0.82rem;
        }

        .submit {
            padding: 0.65rem 0.75rem;
            font-size: 0.8rem;
        }
    }

    /* ── Brand ───────────────────────────────── */

    .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .brand-icon {
        font-size: 1.5rem;
        color: #22d3ee;
        line-height: 1;
    }

    .brand-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: oklch(0.95 0.01 265);
        letter-spacing: -0.02em;
    }

    .brand-sub {
        font-size: 0.7rem;
        color: oklch(0.45 0.02 265);
        margin-top: 2px;
    }

    /* ── OAuth ───────────────────────────────── */

    .oauth-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .oauth-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 0.65rem 1rem;
        background: oklch(0.14 0.015 265);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 8px;
        color: oklch(0.75 0.01 265);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.15s ease;
        width: 100%;
    }

    .oauth-btn:hover:not(:disabled) {
        background: oklch(0.18 0.02 265);
        border-color: oklch(1 0 0 / 16%);
        color: oklch(0.9 0.01 265);
    }

    .oauth-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .oauth-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        color: oklch(0.75 0.01 265);
    }

    /* ── Divider ─────────────────────────────── */

    .divider {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .divider-line {
        flex: 1;
        height: 1px;
        background: oklch(1 0 0 / 8%);
    }

    .divider-text {
        font-size: 0.68rem;
        color: oklch(0.35 0.02 265);
    }

    /* ── Tabs ────────────────────────────────── */

    .tabs {
        display: flex;
        gap: 0.25rem;
        background: oklch(0.08 0.02 265);
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 8px;
        padding: 0.25rem;
    }

    .tab {
        flex: 1;
        padding: 0.4rem 0.75rem;
        font-size: 0.75rem;
        background: transparent;
        border: none;
        border-radius: 6px;
        color: oklch(0.45 0.02 265);
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .tab:hover {
        color: oklch(0.75 0.02 265);
    }

    .tab.active {
        background: oklch(0.16 0.02 265);
        color: #22d3ee;
        border: 1px solid oklch(1 0 0 / 8%);
    }

    /* ── Form ────────────────────────────────── */

    form {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .label {
        font-size: 0.7rem;
        color: oklch(0.45 0.02 265);
        letter-spacing: 0.04em;
    }

    .input {
        background: oklch(0.08 0.02 265);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 6px;
        padding: 0.65rem 0.85rem;
        font-size: 0.85rem;
        color: oklch(0.9 0.01 265);
        outline: none;
        transition: border-color 0.15s ease;
        width: 100%;
        box-sizing: border-box;
    }

    .input::placeholder {
        color: oklch(0.3 0.02 265);
    }

    .input:focus {
        border-color: #22d3ee55;
    }

    .input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .msg {
        font-size: 0.75rem;
        padding: 0.6rem 0.85rem;
        border-radius: 6px;
        line-height: 1.4;
    }

    .msg.error {
        background: oklch(0.3 0.12 25 / 20%);
        border: 1px solid oklch(0.5 0.15 25 / 40%);
        color: #f87171;
    }

    .submit {
        padding: 0.7rem 1rem;
        background: oklch(0.16 0.04 215);
        border: 1px solid #22d3ee44;
        border-radius: 6px;
        color: #22d3ee;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }

    .submit:hover:not(:disabled) {
        background: oklch(0.2 0.05 215);
        border-color: #22d3ee88;
    }

    .submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* ── Spinner ─────────────────────────────── */

    .spinner {
        width: 12px;
        height: 12px;
        border: 2px solid #22d3ee33;
        border-top-color: #22d3ee;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        display: inline-block;
        flex-shrink: 0;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* ── Footer hint ─────────────────────────── */

    .hint {
        text-align: center;
        font-size: 0.72rem;
        color: oklch(0.4 0.02 265);
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
    }

    .link {
        background: none;
        border: none;
        color: #22d3ee;
        cursor: pointer;
        font-size: 0.72rem;
        padding: 0;
        text-decoration: underline;
        text-underline-offset: 2px;
    }

    .link:hover {
        color: #67e8f9;
    }

    .mono {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
</style>