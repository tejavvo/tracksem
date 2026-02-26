<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>tracksem — sem 2 grades</title>
	<meta name="description" content="Track your semester 2 course grades and projections" />
</svelte:head>

{@render children()}
