<script lang="ts">
	import { page } from '$app/stores';
	
	$: currentPath = $page.url.pathname;
	
	const navItems = [
		{ path: '/', label: 'Главная', icon: 'home' },
		{ path: '/rates', label: 'Нормы', icon: 'clock' },
		{ path: '/plan', label: 'План', icon: 'target' }
	] as const;
	
	function isActive(path: string): boolean {
		if (path === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(path);
	}
</script>

<nav class="bottom-nav">
	{#each navItems as item}
		<a 
			href={item.path} 
			class="nav-item" 
			class:active={isActive(item.path)}
		>
			<span class="nav-icon">
				{#if item.icon === 'home'}
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
						<polyline points="9 22 9 12 15 12 15 22"></polyline>
					</svg>
				{:else if item.icon === 'clock'}
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12 6 12 12 16 14"></polyline>
					</svg>
				{:else if item.icon === 'target'}
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<circle cx="12" cy="12" r="6"></circle>
						<circle cx="12" cy="12" r="2"></circle>
					</svg>
				{/if}
			</span>
			<span class="nav-label">{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-around;
		align-items: center;
		background: linear-gradient(to top, #1e293b, #334155);
		border-top: 1px solid #475569;
		padding: 0.5rem 0;
		padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
		z-index: 1000;
		box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.3);
	}
	
	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		text-decoration: none;
		color: #94a3b8;
		transition: all 0.2s ease;
		min-width: 70px;
		min-height: 44px;
		border-radius: 0.5rem;
	}
	
	.nav-item:hover {
		color: #e2e8f0;
		background: rgba(255, 255, 255, 0.05);
	}
	
	.nav-item.active {
		color: #38bdf8;
		background: rgba(56, 189, 248, 0.1);
	}
	
	.nav-item.active .nav-icon {
		transform: scale(1.1);
	}
	
	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s ease;
	}
	
	.nav-label {
		font-size: 0.75rem;
		font-weight: 500;
		margin-top: 0.25rem;
	}
</style>
