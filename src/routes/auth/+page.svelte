<script lang="ts">
    import { createBrowserClient } from "@supabase/ssr";
    import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from "$env/static/public";
    import { goto, invalidateAll } from "$app/navigation";
    import { browser } from "$app/environment";
    import { page } from "$app/state";
    import * as Card from "$lib/components/ui/card";
    import * as Field from "$lib/components/ui/field";
    import * as Tabs from "$lib/components/ui/tabs";
    import * as Alert from "$lib/components/ui/alert";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Spinner } from "$lib/components/ui/spinner";
    import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";

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

<div class="flex min-h-svh items-center justify-center p-6">
    <Card.Root class="w-full max-w-sm">
        <Card.Header>
            <Card.Title class="font-mono">tracksem</Card.Title>
            <Card.Description>semester grade tracker</Card.Description>
        </Card.Header>
        <Card.Content>
            <Field.FieldGroup>
                <Field.Field>
                    <Button
                        variant="outline"
                        onclick={() => signInWithOAuth("google")}
                        disabled={!!oauthLoading || loading}
                    >
                        {#if oauthLoading === "google"}
                            <Spinner data-icon="inline-start" />
                        {:else}
                            <svg data-icon="inline-start" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                        {/if}
                        Continue with Google
                    </Button>
                    <Button
                        variant="outline"
                        onclick={() => signInWithOAuth("github")}
                        disabled={!!oauthLoading || loading}
                    >
                        {#if oauthLoading === "github"}
                            <Spinner data-icon="inline-start" />
                        {:else}
                            <svg data-icon="inline-start" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                            </svg>
                        {/if}
                        Continue with GitHub
                    </Button>
                </Field.Field>

                <Field.FieldSeparator class="*:data-[slot=field-separator-content]:bg-card">or</Field.FieldSeparator>

                <Tabs.Root
                    value={mode}
                    onValueChange={(v) => { mode = v as "signin" | "signup"; error = null; }}
                >
                    <Tabs.List class="w-full">
                        <Tabs.Trigger value="signin">Sign in</Tabs.Trigger>
                        <Tabs.Trigger value="signup">Sign up</Tabs.Trigger>
                    </Tabs.List>
                </Tabs.Root>

                <form onsubmit={handleSubmit}>
                    <Field.FieldGroup>
                        <Field.Field>
                            <Field.FieldLabel for="email">Email</Field.FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                bind:value={email}
                                placeholder="you@example.com"
                                autocomplete="email"
                                required
                                disabled={loading || !!oauthLoading}
                            />
                        </Field.Field>
                        <Field.Field>
                            <Field.FieldLabel for="password">Password</Field.FieldLabel>
                            <Input
                                id="password"
                                type="password"
                                bind:value={password}
                                placeholder={mode === "signup" ? "Min 6 characters" : "••••••••"}
                                autocomplete={mode === "signin" ? "current-password" : "new-password"}
                                required
                                disabled={loading || !!oauthLoading}
                            />
                        </Field.Field>

                        {#if error}
                            <Alert.Root variant="destructive">
                                <CircleAlertIcon />
                                <Alert.Description>{error}</Alert.Description>
                            </Alert.Root>
                        {/if}

                        <Field.Field>
                            <Button type="submit" disabled={loading || !!oauthLoading}>
                                {#if loading}
                                    <Spinner data-icon="inline-start" />
                                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                                {:else}
                                    {mode === "signin" ? "Sign in" : "Create account"}
                                {/if}
                            </Button>
                        </Field.Field>
                    </Field.FieldGroup>
                </form>
            </Field.FieldGroup>
        </Card.Content>
    </Card.Root>
</div>
