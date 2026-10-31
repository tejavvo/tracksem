<script lang="ts">
	import "./layout.css";
	import { grades } from "$lib/stores/grades.svelte";
	import { createBrowserClient } from "@supabase/ssr";
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from "$env/static/public";
	import { invalidateAll, goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import { Toaster } from "$lib/components/ui/sonner";
	import { Spinner } from "$lib/components/ui/spinner";
	import * as Tooltip from "$lib/components/ui/tooltip";

	let { children, data } = $props();

	const supabase = browser
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
		: null;

	onMount(() => {
		if (!supabase) return;

		// Listen for auth state changes (sign-out in another tab, token refresh, etc.)
		// We intentionally ignore the session parameter — use getUser() server-side instead.
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event) => {
			if (event === "SIGNED_OUT") {
				invalidateAll();
			} else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
				invalidateAll();
			}
		});

		return () => subscription.unsubscribe();
	});
	$effect(() => {
		if (!browser) return;

		if (data.user === null) {
			grades.reset();
			if (page.url.pathname !== "/auth") {
				goto("/auth");
			}
			return;
		}

		if (!grades.loaded) {
			grades.load();
		}
	});
</script>

<svelte:head>
	<title>tracksem — sem 2 grades</title>
	<meta
		name="description"
		content="Track your semester 2 course grades and projections"
	/>
</svelte:head>

<Toaster theme="dark" />

<!-- Auth page renders immediately without the loading gate -->
<Tooltip.Provider>
	{#if data.user === null}
		{@render children()}
	{:else if grades.loaded}
		{@render children()}
	{:else}
		<div class="flex min-h-svh items-center justify-center">
			<Spinner />
		</div>
	{/if}
</Tooltip.Provider>
