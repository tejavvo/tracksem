<script lang="ts">
	import "./layout.css";
	import { grades } from "$lib/stores/grades.svelte";
	import { createBrowserClient } from "@supabase/ssr";
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from "$env/static/public";
	import { invalidateAll, goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { page } from "$app/state";

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

<!-- Auth page renders immediately without the loading gate -->
{#if data.user === null}
	{@render children()}
{:else if grades.loaded}
	{@render children()}
{:else}
	<div class="loading">
		<span class="mono">loading…</span>
	</div>
{/if}

<style>
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		color: oklch(0.5 0.02 265);
		font-family: "JetBrains Mono", monospace;
		font-size: 0.8rem;
	}
</style>