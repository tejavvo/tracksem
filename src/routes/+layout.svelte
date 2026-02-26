<script lang="ts">
	import "./layout.css";
	import { grades } from "$lib/stores/grades.svelte";
	import { onMount } from "svelte";

	let { children } = $props();

	onMount(() => {
		grades.load();
	});
</script>

<svelte:head>
	<title>tracksem — sem 2 grades</title>
	<meta
		name="description"
		content="Track your semester 2 course grades and projections"
	/>
</svelte:head>

{#if grades.loaded}
	{@render children()}
{:else}
	<div
		style="display: flex; align-items: center; justify-content: center; min-height: 100vh; color: oklch(0.5 0.02 265); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;"
	>
		loading…
	</div>
{/if}
