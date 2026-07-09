<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase, loadBuyInTotals } from '$lib';
	import type { Seat } from '$lib';
	import type { PageData } from './$types';
	import MySession from './MySession.svelte';
	import TheTable from './TheTable.svelte';

	let { data }: { data: PageData } = $props();

	// ── Local state ───────────────────────────────────────────────────────────

	// eslint-disable-next-line svelte/reactivity -- initial server data; updated via Realtime
	let session = $state({ ...data.session });
	// eslint-disable-next-line svelte/reactivity -- initial server data; updated via Realtime
	let seats = $state<Seat[]>([...data.seats]);
	// eslint-disable-next-line svelte/reactivity -- initial server data; updated via Realtime
	let buyInTotals = $state<Record<string, number>>({ ...data.buyInTotals });

	// Identity — resolved from localStorage on mount
	let isHost = $state(false);
	let myPlayerId = $state<string | null>(null);

	const mySeat = $derived(seats.find(s => s.player_id === myPlayerId) ?? null);

	// Host: which seat is being managed (defaults to own seat)
	let managedPlayerId = $state<string | null>(null);
	const managedSeat = $derived(
		isHost && managedPlayerId
			? seats.find(s => s.player_id === managedPlayerId) ?? mySeat
			: mySeat
	);

	// kr/BB toggle — persisted in localStorage
	let displayUnit = $state<'kr' | 'bb'>('kr');

	// Active tab
	let activeTab = $state<'my-session' | 'the-table'>('my-session');

	// ── Init from localStorage ─────────────────────────────────────────────────

	$effect(() => {
		isHost = localStorage.getItem(`host_token_${session.id}`) === 'true';
		myPlayerId = localStorage.getItem(`player_id_${session.id}`);
		managedPlayerId = myPlayerId;

		const stored = localStorage.getItem('display_unit');
		if (stored === 'bb' || stored === 'kr') displayUnit = stored;
	});

	// ── Realtime subscriptions ─────────────────────────────────────────────────

	$effect(() => {
		const seatsChannel = supabase
			.channel(`play:seats:${session.id}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'seats', filter: `session_id=eq.${session.id}` },
				async () => {
					const { data: fresh } = await supabase
						.from('seats')
						.select('*, players(id, name, swish_number)')
						.eq('session_id', session.id)
						.order('joined_at');
					if (fresh) seats = fresh as Seat[];
				}
			)
			.subscribe();

		const buyInsChannel = supabase
			.channel(`play:buy_ins:${session.id}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'buy_ins', filter: `session_id=eq.${session.id}` },
				async () => {
					buyInTotals = await loadBuyInTotals(session.id);
				}
			)
			.subscribe();

		// Redirect back to lobby if session is no longer active
		const sessionChannel = supabase
			.channel(`play:session:${session.id}`)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
				(payload) => {
					session = { ...session, ...payload.new };
					if (payload.new.state !== 'active') {
						goto(`/session/${session.id}`);
					}
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(seatsChannel);
			supabase.removeChannel(buyInsChannel);
			supabase.removeChannel(sessionChannel);
		};
	});

	// ── Helpers ───────────────────────────────────────────────────────────────

	function toggleDisplayUnit() {
		displayUnit = displayUnit === 'kr' ? 'bb' : 'kr';
		localStorage.setItem('display_unit', displayUnit);
	}

	/** Re-fetch everything after a stack/buy-in mutation */
	async function handleChange() {
		const [freshSeats, freshTotals] = await Promise.all([
			supabase
				.from('seats')
				.select('*, players(id, name, swish_number)')
				.eq('session_id', session.id)
				.order('joined_at'),
			loadBuyInTotals(session.id),
		]);
		if (freshSeats.data) seats = freshSeats.data as Seat[];
		buyInTotals = freshTotals;
	}

	// Typed-cast for component props — we load with the player join
	type SeatWithPlayer = Seat & { players: { id: string; name: string; swish_number: string | null } };
	const seatsWithPlayer = $derived(seats as SeatWithPlayer[]);
</script>

<div class="min-h-dvh bg-bg text-text flex flex-col max-w-md mx-auto">

	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<header class="bg-surface border-b border-border px-5 py-3 flex items-center justify-between shrink-0">
		<div class="flex flex-col gap-0.5">
			<h1 class="font-semibold text-text leading-tight">
				{session.label ?? 'Game'}
			</h1>
			<p class="text-text-muted text-xs tabular">
				{session.buy_in_amount} kr · 1BB = {session.bb_size} kr
			</p>
		</div>

		<!-- kr / BB toggle -->
		<button
			onclick={toggleDisplayUnit}
			class="flex items-center gap-1 bg-surface-high rounded-chip px-3 py-1.5 text-sm font-medium
				text-text-muted hover:text-text transition-colors border border-border"
			aria-label="Toggle display unit"
		>
			<span class={displayUnit === 'kr' ? 'text-text' : 'text-text-muted'}>kr</span>
			<span class="text-border">/</span>
			<span class={displayUnit === 'bb' ? 'text-text' : 'text-text-muted'}>BB</span>
		</button>
	</header>

	<!-- ── Host seat picker ───────────────────────────────────────────────── -->
	{#if isHost && activeTab === 'my-session'}
		<div class="bg-surface-high border-b border-border px-5 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
			<span class="text-text-muted text-xs shrink-0">Managing:</span>
			{#each seatsWithPlayer.filter(s => !s.cashed_out) as s (s.id)}
				<button
					onclick={() => { managedPlayerId = s.player_id; }}
					class={[
						'shrink-0 text-sm px-3 py-1 rounded-chip border transition-colors',
						managedPlayerId === s.player_id
							? 'bg-green border-green text-text font-semibold'
							: 'bg-surface border-border text-text-muted hover:text-text',
					]}
				>
					{s.players.name}
					{#if s.player_id === myPlayerId}<span class="text-xs opacity-70"> (you)</span>{/if}
				</button>
			{/each}
		</div>
	{/if}

	<!-- ── Tab content ────────────────────────────────────────────────────── -->
	<div class="flex-1 overflow-y-auto">
		{#if activeTab === 'my-session'}
			{#if managedSeat}
				<MySession
					{session}
					seat={managedSeat as SeatWithPlayer}
					totalBuyIns={buyInTotals[managedSeat.player_id] ?? 0}
					{displayUnit}
					onStackChange={handleChange}
				/>
			{:else}
				<div class="p-5 text-text-muted text-sm text-center py-12">
					<p>You haven't joined this session.</p>
					<a href="/session/{session.id}" class="text-green-light underline mt-2 block">Back to Lobby</a>
				</div>
			{/if}
		{:else}
			<TheTable
				{session}
				seats={seatsWithPlayer}
				{buyInTotals}
				{myPlayerId}
				{isHost}
			/>
		{/if}
	</div>

	<!-- ── Bottom tab bar ─────────────────────────────────────────────────── -->
	<nav class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface border-t border-border
		flex z-10 pb-safe">
		<button
			onclick={() => { activeTab = 'my-session'; }}
			class={[
				'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors border-t-2',
				activeTab === 'my-session'
					? 'text-green-light border-green-light'
					: 'text-text-muted hover:text-text border-transparent',
			]}
			aria-current={activeTab === 'my-session' ? 'page' : undefined}
		>
			<span class="text-lg leading-none">🎯</span>
			My Session
		</button>
		<button
			onclick={() => { activeTab = 'the-table'; }}
			class={[
				'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors border-t-2',
				activeTab === 'the-table'
					? 'text-green-light border-green-light'
					: 'text-text-muted hover:text-text border-transparent',
			]}
			aria-current={activeTab === 'the-table' ? 'page' : undefined}
		>
			<span class="text-lg leading-none">🏆</span>
			The Table
		</button>
	</nav>
</div>
