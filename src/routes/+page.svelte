<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button, Card, Sheet, NumberInput } from '$lib';
	import { createSession, searchPlayers, findOrCreatePlayer } from '$lib';
	import type { Player } from '$lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Sheet state
	let newGameOpen = $state(false);

	// Step 1: who are you?
	let nameQuery = $state('');
	let searchResults = $state<Player[]>([]);
	let selectedPlayer = $state<Player | null>(null);
	let searching = $state(false);

	// Step 2: configure
	let buyInAmount = $state<number | null>(200);
	let sessionLabel = $state('');
	let sessionLocation = $state('');
	let creating = $state(false);
	let error = $state('');

	let step = $state<'who' | 'config'>('who');

	// Live search registry as user types
	$effect(() => {
		const q = nameQuery;
		if (!q.trim()) { searchResults = []; return; }
		searching = true;
		searchPlayers(q).then(r => { searchResults = r; searching = false; });
	});

	function selectPlayer(player: Player) {
		selectedPlayer = player;
		nameQuery = player.name;
		searchResults = [];
	}

	function proceedToConfig() {
		if (!nameQuery.trim()) { error = 'Enter your name'; return; }
		error = '';
		step = 'config';
	}

	async function handleCreate() {
		if (!buyInAmount || buyInAmount < 10) { error = 'Buy-in must be at least 10 kr'; return; }
		creating = true;
		error = '';
		try {
			const player = selectedPlayer ?? await findOrCreatePlayer(nameQuery.trim());
			const session = await createSession({
				hostPlayerId: player.id,
				buyInAmount,
				label: sessionLabel.trim() || undefined,
				location: sessionLocation.trim() || undefined
			});
			goto(`/session/${session.id}`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
			creating = false;
		}
	}

	function resetSheet() {
		step = 'who';
		nameQuery = '';
		selectedPlayer = null;
		searchResults = [];
		buyInAmount = 200;
		sessionLabel = '';
		sessionLocation = '';
		error = '';
		creating = false;
	}

	const bbSize = $derived(buyInAmount ? Math.round(buyInAmount / 100) : 2);

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<main class="min-h-dvh bg-bg text-text flex flex-col max-w-md mx-auto">

	<!-- ── Hero ── -->
	<header class="felt p-8 flex flex-col gap-3 animate-fade-in">
		<p class="text-text-muted text-sm tracking-widest">♠ ♥ ♦ ♣</p>
		<h1 class="font-display text-6xl tracking-wider leading-none">dead-money</h1>
		<p class="text-text-muted text-sm">No-limit hold'em tracker</p>
	</header>

	<!-- ── New game ── -->
	<div class="p-5 flex flex-col gap-5">
		<Button size="lg" class="w-full" onclick={() => { resetSheet(); newGameOpen = true; }}>
			New Game
		</Button>

		<!-- ── Recent sessions ── -->
		{#if data.recentSessions.length > 0}
			<section class="flex flex-col gap-2">
				<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">Recent Games</h2>
				<Card class="p-0 divide-y divide-border">
					{#each data.recentSessions as session}
						<a
							href="/session/{session.id}"
							class="flex items-center justify-between px-4 py-3 hover:bg-surface-high transition-colors"
						>
							<div class="flex flex-col gap-0.5">
								<span class="text-text font-medium text-sm">
									{session.label ?? formatDate(session.created_at)}
								</span>
								<span class="text-text-muted text-xs">{formatDate(session.created_at)}</span>
							</div>
							<span class="tabular text-text-muted text-sm">{session.buy_in_amount} kr</span>
						</a>
					{/each}
				</Card>
			</section>
		{:else}
			<p class="text-text-muted text-sm text-center py-8">No games yet. Start one!</p>
		{/if}
	</div>
</main>

<!-- ── New Game Sheet ── -->
<Sheet
	bind:open={newGameOpen}
	title={step === 'who' ? 'Who are you?' : 'Set up the game'}
	onclose={resetSheet}
>
	{#if step === 'who'}
		<!-- Step 1: identity -->
		<div class="flex flex-col gap-4">
			<p class="text-text-muted text-sm">Search for your name or enter a new one.</p>

			<div class="relative">
				<input
					type="text"
					bind:value={nameQuery}
					placeholder="Your name…"
					class="w-full h-tap px-3 bg-surface-high border border-border rounded-sm text-text placeholder:text-text-muted focus:outline-none focus:border-green"
				/>
				{#if searching}
					<span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">…</span>
				{/if}
			</div>

			<!-- Registry search results -->
			{#if searchResults.length > 0}
				<div class="flex flex-col rounded-card border border-border overflow-hidden">
					{#each searchResults as player}
						<button
							onclick={() => selectPlayer(player)}
							class="flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-high transition-colors border-b border-border last:border-0
								{selectedPlayer?.id === player.id ? 'bg-green-dim text-green-light' : 'text-text'}"
						>
							<span class="font-medium">{player.name}</span>
							{#if selectedPlayer?.id === player.id}
								<span class="ml-auto text-xs text-green-light">✓ Selected</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}

			{#if error}
				<p class="text-red-light text-sm">{error}</p>
			{/if}
		</div>

	{:else}
		<!-- Step 2: configure -->
		<div class="flex flex-col gap-4">
			<div class="flex items-center gap-3 p-3 rounded-card bg-surface-high border border-border">
				<span class="text-text-muted text-sm">Playing as</span>
				<span class="font-semibold text-green-light">{nameQuery}</span>
				<button
					onclick={() => { step = 'who'; error = ''; }}
					class="ml-auto text-text-muted text-xs hover:text-text transition-colors"
				>
					Change
				</button>
			</div>

			<div class="flex flex-col gap-1">
				<label for="buy-in" class="text-text-muted text-xs font-medium uppercase tracking-wider">
					Buy-in amount (kr)
				</label>
				<NumberInput id="buy-in" bind:value={buyInAmount} placeholder="200" />
				<p class="text-text-muted text-xs">1 BB = {bbSize} kr &nbsp;·&nbsp; 100 BB = {buyInAmount ?? '—'} kr</p>
			</div>

			<div class="flex flex-col gap-1">
				<label for="session-label" class="text-text-muted text-xs font-medium uppercase tracking-wider">
					Label <span class="normal-case font-normal">(optional)</span>
				</label>
				<input
					id="session-label"
					type="text"
					bind:value={sessionLabel}
					placeholder="e.g. Friday Night"
					class="h-tap px-3 bg-surface-high border border-border rounded-sm text-text placeholder:text-text-muted focus:outline-none focus:border-green"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label for="session-location" class="text-text-muted text-xs font-medium uppercase tracking-wider">
					Location <span class="normal-case font-normal">(optional)</span>
				</label>
				<input
					id="session-location"
					type="text"
					bind:value={sessionLocation}
					placeholder="e.g. Erik's place"
					class="h-tap px-3 bg-surface-high border border-border rounded-sm text-text placeholder:text-text-muted focus:outline-none focus:border-green"
				/>
			</div>

			{#if error}
				<p class="text-red-light text-sm">{error}</p>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		<div class="flex gap-3">
			<Button variant="ghost" class="flex-1" onclick={() => (newGameOpen = false)}>Cancel</Button>
			{#if step === 'who'}
				<Button class="flex-1" onclick={proceedToConfig} disabled={!nameQuery.trim()}>
					Next →
				</Button>
			{:else}
				<Button class="flex-1" onclick={handleCreate} disabled={creating || !buyInAmount}>
					{creating ? 'Creating…' : 'Create Game ♠'}
				</Button>
			{/if}
		</div>
	{/snippet}
</Sheet>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(-8px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in {
		animation: fade-in 400ms var(--ease-out-back) both;
	}
</style>
