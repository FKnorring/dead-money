<script lang="ts">
	import { supabase, Button, Card, Badge, Sheet, NumberInput } from '$lib';
	import { claimSeat, upsertSeat, removeSeat, startSession, searchPlayers, findOrCreatePlayer } from '$lib';
	import { getMyPlayerId, isHost as getIsHost, setMyPlayerId } from '$lib';
	import { useSessionSync } from '$lib';
	import type { Seat, Player } from '$lib';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// ── Local state ─────────────────────────────────────────────────────────────

	// eslint-disable-next-line svelte/reactivity -- initial server data; updated via Realtime
	let session = $state({ ...data.session });
	// eslint-disable-next-line svelte/reactivity -- initial server data; updated via Realtime
	let seats = $state<Seat[]>([...data.seats]);

	// Identity — resolved from localStorage on mount
	let isHost = $state(false);
	let myPlayerId = $state<string | null>(null);
	let mySeat = $derived(seats.find(s => s.player_id === myPlayerId) ?? null);
	let hasJoined = $derived(!!mySeat);

	// Join overlay state
	let joinStep = $state<'claim' | 'search'>('claim');
	let searchQuery = $state('');
	let searchResults = $state<Player[]>([]);
	let selectedPlayer = $state<Player | null>(null);
	let joining = $state(false);
	let joinError = $state('');

	// Host: add player sheet
	let addPlayerOpen = $state(false);
	let addQuery = $state('');
	let addResults = $state<Player[]>([]);
	let addSelected = $state<Player | null>(null);
	let adding = $state(false);
	let addError = $state('');

	// Start game
	let starting = $state(false);

	// ── Init from localStorage ───────────────────────────────────────────────────

	$effect(() => {
		isHost = getIsHost(session.id);
		myPlayerId = getMyPlayerId(session.id);
		// If already joined and game is active, go straight to play
		if (myPlayerId && session.state === 'active') {
			goto(`/session/${session.id}/play`);
		}
	});

	// ── Realtime seats subscription ──────────────────────────────────────────────

	$effect(() => {
		const sync = useSessionSync(session.id, seats, (fresh) => { seats = fresh; });

		// Subscribe to session state changes (e.g. host starts or closes game)
		const sessionChannel = supabase
			.channel(`session:${session.id}`)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
				(payload) => {
					session = { ...session, ...payload.new };
					if (payload.new.state === 'active') {
						goto(`/session/${session.id}/play`);
					} else if (payload.new.state === 'closed') {
						goto(`/session/${session.id}/end`);
					}
				}
			)
			.subscribe();

		return () => {
			sync.destroy();
			supabase.removeChannel(sessionChannel);
		};
	});

	// ── Join: live search ────────────────────────────────────────────────────────

	$effect(() => {
		const q = searchQuery;
		if (!q.trim()) { searchResults = []; return; }
		searchPlayers(q).then(r => { searchResults = r; });
	});

	$effect(() => {
		const q = addQuery;
		if (!q.trim()) { addResults = []; return; }
		searchPlayers(q).then(r => { addResults = r; });
	});

	// ── Actions ──────────────────────────────────────────────────────────────────

	async function handleClaimSeat(seat: Seat) {
		joining = true;
		joinError = '';
		try {
			await claimSeat(seat.id);
			setMyPlayerId(session.id, seat.player_id);
			myPlayerId = seat.player_id;
			if (session.state === 'active') goto(`/session/${session.id}/play`);
		} catch (e) {
			joinError = e instanceof Error ? e.message : 'Failed to claim seat';
		} finally {
			joining = false;
		}
	}

	async function handleJoinFromSearch() {
		if (!searchQuery.trim()) { joinError = 'Enter your name'; return; }
		joining = true;
		joinError = '';
		try {
			const player = selectedPlayer ?? await findOrCreatePlayer(searchQuery.trim());
			await upsertSeat({ sessionId: session.id, playerId: player.id, claimed: true });
			setMyPlayerId(session.id, player.id);
			myPlayerId = player.id;
			if (session.state === 'active') goto(`/session/${session.id}/play`);
		} catch (e) {
			joinError = e instanceof Error ? e.message : 'Failed to join';
		} finally {
			joining = false;
		}
	}

	async function handleAddPlayer() {
		if (!addQuery.trim()) { addError = 'Enter a name'; return; }
		adding = true;
		addError = '';
		try {
			const player = addSelected ?? await findOrCreatePlayer(addQuery.trim());
			await upsertSeat({ sessionId: session.id, playerId: player.id, claimed: false });
			addPlayerOpen = false;
			addQuery = '';
			addSelected = null;
		} catch (e) {
			addError = e instanceof Error ? e.message : 'Failed to add player';
		} finally {
			adding = false;
		}
	}

	async function handleRemoveSeat(seatId: string) {
		await removeSeat(seatId);
	}

	async function handleStartGame() {
		starting = true;
		try {
			await startSession(session.id);
			// Realtime will redirect all clients via session subscription
		} catch (e) {
			starting = false;
		}
	}

	// ── Derived ──────────────────────────────────────────────────────────────────

	let claimedCount = $derived(seats.filter(s => s.cashed_out === false && s.claimed).length);
	let canStart = $derived(claimedCount >= 2);

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
	}
</script>

<div class="min-h-dvh bg-bg text-text flex flex-col max-w-md mx-auto">

	<!-- ── Session header (ceremonial) ───────────────────────────────────────── -->
	<header class="felt p-6 flex flex-col gap-2">
		<div class="flex items-start justify-between">
			<div class="flex flex-col gap-1">
				<h1 class="font-display text-4xl tracking-wider leading-none">
					{session.label ?? formatDate(session.created_at)}
				</h1>
				{#if session.label}
					<p class="text-text-muted text-xs">{formatDate(session.created_at)}</p>
				{/if}
			</div>
			<Badge>{session.state === 'lobby' ? '⏳ Lobby' : '🃏 Active'}</Badge>
		</div>
		<div class="flex gap-4 text-text-muted text-sm">
			<span class="tabular">Buy-in: <span class="text-text font-medium">{session.buy_in_amount} kr</span></span>
			<span class="tabular">1 BB = <span class="text-text font-medium">{session.bb_size} kr</span></span>
		</div>
		{#if session.location}
			<p class="text-text-muted text-xs">📍 {session.location}</p>
		{/if}
	</header>

	<div class="flex-1 p-5 flex flex-col gap-4">

		<!-- ── Seat list ───────────────────────────────────────────────────────── -->
		<section class="flex flex-col gap-2">
			<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">
				Players · {seats.length}
			</h2>

			{#if seats.length > 0}
				<Card class="p-0 divide-y divide-border">
					{#each seats as seat (seat.id)}
						<div class="flex items-center justify-between gap-3 py-3 px-4
							{seat.player_id === myPlayerId ? 'border-l-2 border-green pl-3' : ''}">
							<span class="font-medium {seat.player_id === myPlayerId ? 'text-green-light' : 'text-text'}">
								{seat.players.name}
								{#if seat.player_id === myPlayerId}<span class="text-text-muted text-xs font-normal"> (you)</span>{/if}
							</span>
							<div class="flex items-center gap-2 shrink-0">
								{#if seat.claimed}
									<Badge variant="positive">Ready ✓</Badge>
								{:else}
									<Badge>Waiting…</Badge>
								{/if}
								{#if isHost && seat.player_id !== myPlayerId}
									<button
										onclick={() => handleRemoveSeat(seat.id)}
										class="text-text-muted hover:text-red-light transition-colors text-xs px-1"
										aria-label="Remove {seat.players.name}"
									>✕</button>
								{/if}
							</div>
						</div>
					{/each}
				</Card>
			{:else}
				<Card>
					<p class="text-text-muted text-sm text-center py-2">No players yet</p>
				</Card>
			{/if}
		</section>

		<!-- ── Host controls ────────────────────────────────────────────────────── -->
		{#if isHost && session.state === 'lobby'}
			<section class="flex flex-col gap-3">
				<Button variant="secondary" onclick={() => { addPlayerOpen = true; addQuery = ''; addSelected = null; addError = ''; }}>
					+ Add Player
				</Button>
				<Button
					size="lg"
					class="w-full"
					disabled={!canStart || starting}
					onclick={handleStartGame}
				>
					{starting ? 'Starting…' : `Start Game ♠  (${claimedCount} ready)`}
				</Button>
				{#if !canStart}
					<p class="text-text-muted text-xs text-center">Need at least 2 players to start</p>
				{/if}
			</section>
		{/if}

		<!-- ── Player waiting message ─────────────────────────────────────────── -->
		{#if !isHost && hasJoined && session.state === 'lobby'}
			<p class="text-text-muted text-sm text-center py-2">Waiting for host to start the game…</p>
		{/if}

	</div>
</div>

<!-- ── Join overlay ───────────────────────────────────────────────────────────
     Shown until the user has identified themselves in this session           -->
{#if !hasJoined}
	<div class="fixed inset-0 bg-bg/95 backdrop-blur-sm flex flex-col justify-end z-40">
		<div class="bg-surface rounded-t-card border-t border-border p-5 flex flex-col gap-4 max-w-md mx-auto w-full pb-safe">

			<h2 class="font-semibold text-text text-lg">Who are you?</h2>

			{#if joinStep === 'claim' && seats.length > 0}
				<!-- Show unclaimed seats to tap -->
				<div class="flex flex-col gap-2">
					<p class="text-text-muted text-sm">Tap your name:</p>
					<div class="flex flex-col rounded-card border border-border overflow-hidden">
						{#each seats as seat (seat.id)}
							<button
								onclick={() => handleClaimSeat(seat)}
								disabled={joining}
								class="flex items-center justify-between px-4 py-3 text-left hover:bg-surface-high transition-colors border-b border-border last:border-0 disabled:opacity-50"
							>
								<span class="font-medium text-text">{seat.players.name}</span>
								{#if seat.claimed}
									<span class="text-text-muted text-xs">taken</span>
								{:else}
									<span class="text-green-light text-xs">→ Join</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
				<Button variant="ghost" onclick={() => (joinStep = 'search')}>
					I'm not listed
				</Button>

			{:else}
				<!-- Search / new player flow -->
				{#if seats.length > 0}
					<button onclick={() => (joinStep = 'claim')} class="text-text-muted text-xs text-left hover:text-text transition-colors">
						← Back to player list
					</button>
				{/if}
				<div class="flex flex-col gap-3">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search your name…"
						class="w-full h-tap px-3 bg-surface-high border border-border rounded-sm text-text placeholder:text-text-muted focus:outline-none focus:border-green"
					/>
					{#if searchResults.length > 0}
						<div class="flex flex-col rounded-card border border-border overflow-hidden">
							{#each searchResults as player (player.id)}
								<button
									onclick={() => { selectedPlayer = player; searchQuery = player.name; searchResults = []; }}
									class="flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-high transition-colors border-b border-border last:border-0
										{selectedPlayer?.id === player.id ? 'bg-green-dim' : ''}"
								>
									<span class="font-medium text-text">{player.name}</span>
									{#if selectedPlayer?.id === player.id}
										<span class="ml-auto text-green-light text-xs">✓</span>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if joinError}
				<p class="text-red-light text-sm">{joinError}</p>
			{/if}

			{#if joinStep === 'search' || seats.length === 0}
				<Button
					class="w-full"
					onclick={handleJoinFromSearch}
					disabled={joining || !searchQuery.trim()}
				>
					{joining ? 'Joining…' : 'Join Game'}
				</Button>
			{/if}
		</div>
	</div>
{/if}

<!-- ── Add Player sheet (host only) ──────────────────────────────────────── -->
<Sheet bind:open={addPlayerOpen} title="Add Player">
	<div class="flex flex-col gap-3">
		<p class="text-text-muted text-sm">Search the registry or add a new player.</p>
		<input
			type="text"
			bind:value={addQuery}
			placeholder="Search by name…"
			class="w-full h-tap px-3 bg-surface-high border border-border rounded-sm text-text placeholder:text-text-muted focus:outline-none focus:border-green"
		/>
		{#if addResults.length > 0}
			<div class="flex flex-col rounded-card border border-border overflow-hidden">
				{#each addResults as player (player.id)}
					<button
						onclick={() => { addSelected = player; addQuery = player.name; addResults = []; }}
						class="flex items-center justify-between px-4 py-3 text-left hover:bg-surface-high border-b border-border last:border-0
							{addSelected?.id === player.id ? 'bg-green-dim text-green-light' : 'text-text'}"
					>
						<span>{player.name}</span>
						{#if addSelected?.id === player.id}<span class="text-xs">✓</span>{/if}
					</button>
				{/each}
			</div>
		{/if}
		{#if addError}<p class="text-red-light text-sm">{addError}</p>{/if}
	</div>
	{#snippet footer()}
		<div class="flex gap-3">
			<Button variant="ghost" class="flex-1" onclick={() => (addPlayerOpen = false)}>Cancel</Button>
			<Button class="flex-1" onclick={handleAddPlayer} disabled={adding || !addQuery.trim()}>
				{adding ? 'Adding…' : 'Add to Game'}
			</Button>
		</div>
	{/snippet}
</Sheet>