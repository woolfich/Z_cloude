<script lang="ts">
	import BottomNav from '$lib/components/BottomNav.svelte';
	import '../app.css';
</script>

<svelte:head>
	<title>WeldTrack</title>
	<meta name="description" content="Приложение для учета работы сварщиков" />
</svelte:head>

<div class="app-container">
	<main class="main-content">
		<slot />
	</main>
	<BottomNav />
</div>

<style>
	.app-container {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background-color: var(--color-bg-primary);
	}
	
	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
</style>
