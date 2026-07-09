<script lang="ts">
	import { PlayerRow, Sheet, NumberInput, Button } from '$lib';
	import { calculateNet } from '$lib';
	import { cashOutSeat, closeSession } from '$lib';
	import type { Session, SeatWithPlayer } from '$lib';

	interface Props {
		session: Session;
		seats: SeatWithPlayer[];
		buyInTotals: Record<string, number>;
		myPlayerId: string | null;
		isHost: boolean;
		onCashOut?: () => void;
		onSessionClose?: () => void;
	}

	let { session, seats, buyInTotals, myPlayerId, isHost, onCashOut, onSessionClose }: Props = $props();

	interface SeatRow {
		seat: SeatWithPlayer;
		net: number;
		totalBuyIns: number;
	}

	const activeRows = $derived(
		seats
			.filter(s => !s.cashed_out)
			.map((seat): SeatRow => {
				const totalBuyIns = buyInTotals[seat.player_id] ?? 0;
				const net = calculateNet({ totalBuyIns, finalStack: seat.stack });
				return { seat, net, totalBuyIns };
			})
			.sort((a, b) => b.net - a.net)
	);

	const cashedOutRows = $derived(
		seats
			.filter(s => s.cashed_out)
			.map((seat): SeatRow => {
				const totalBuyIns = buyInTotals[seat.player_id] ?? 0;
				const net = calculateNet({ totalBuyIns, finalStack: seat.final_stack });
				return { seat, net, totalBuyIns };
			})
			.sort((a, b) => b.net - a.net)
	);

	let cashedOutExpanded = $state(false);

	// ── CashOut sheet ──────────────────────────────────────────────────────────

	let cashOutSheetOpen = $state(false);
	let cashOutTarget = $state<SeatWithPlayer | null>(null);
	let cashOutAmount = $state<number | null>(null);
	let cashingOut = $state(false);

	function openCashOutSheet(seat: SeatWithPlayer) {
		cashOutTarget = seat;
		cashOutAmount = seat.stack ?? null;
		cashOutSheetOpen = true;
	}

	async function handleCashOut() {
		if (!cashOutTarget || cashOutAmount === null || cashingOut) return;
		cashingOut = true;
		try {
			await cashOutSeat({ seatId: cashOutTarget.id, finalStack: cashOutAmount });
			cashOutSheetOpen = false;
			cashOutTarget = null;
			cashOutAmount = null;
			onCashOut?.();
		} finally {
			cashingOut = false;
		}
	}

	// ── End Session sheet ──────────────────────────────────────────────────────

	let endSessionSheetOpen = $state(false);
	let closingSession = $state(false);

	const uncashedOutSeats = $derived(seats.filter(s => !s.cashed_out));

	async function handleEndSession() {
		if (closingSession) return;
		closingSession = true;
		try {
			await closeSession(session.id);
			// Realtime session subscription will redirect all clients to /end
			endSessionSheetOpen = false;
			onSessionClose?.();
		} finally {
			closingSession = false;
		}
	}
</script>

<div class="flex flex-col gap-4 p-5 pb-24">

	<!-- ── Active seats ───────────────────────────────────────────────────── -->
	<section>
		<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
			At the Table · {activeRows.length}
		</h2>

		{#if activeRows.length === 0}
			<p class="text-text-muted text-sm text-center py-4">No active players</p>
		{:else}
			<div class="bg-surface rounded-card divide-y divide-border overflow-hidden">
				{#each activeRows as { seat, net, totalBuyIns } (seat.id)}
					<PlayerRow
						name={seat.players.name}
						{totalBuyIns}
						stack={seat.stack}
						{net}
						isYou={seat.player_id === myPlayerId}
					>
						{#snippet trailing()}
							{#if isHost}
								<button
									onclick={() => openCashOutSheet(seat)}
									class="text-text-muted text-xs hover:text-red-light transition-colors px-1 py-1 shrink-0"
									aria-label="Cash out {seat.players.name}"
								>
									Cash Out
								</button>
							{/if}
						{/snippet}
					</PlayerRow>
				{/each}
			</div>
		{/if}
	</section>

	<!-- ── Cashed-out section (collapsed) ────────────────────────────────── -->
	{#if cashedOutRows.length > 0}
		<section>
			<button
				class="w-full flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-widest mb-3 hover:text-text transition-colors"
				onclick={() => { cashedOutExpanded = !cashedOutExpanded; }}
			>
				<span>Cashed Out · {cashedOutRows.length}</span>
				<span>{cashedOutExpanded ? '▲' : '▼'}</span>
			</button>

			{#if cashedOutExpanded}
				<div class="bg-surface rounded-card divide-y divide-border overflow-hidden opacity-60">
					{#each cashedOutRows as { seat, net, totalBuyIns } (seat.id)}
						<PlayerRow
							name={seat.players.name}
							{totalBuyIns}
							stack={seat.final_stack}
							{net}
							isYou={seat.player_id === myPlayerId}
						/>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- ── End session (host only) ───────────────────────────────────────── -->
	{#if isHost}
		<section class="pt-2">
			<Button
				variant="danger"
				class="w-full"
				onclick={() => { endSessionSheetOpen = true; }}
			>
				End Session
			</Button>
		</section>
	{/if}
</div>

<!-- ── CashOut sheet ──────────────────────────────────────────────────────── -->
{#if cashOutTarget}
	<Sheet bind:open={cashOutSheetOpen} title="Cash out {cashOutTarget.players.name}?">
		<div class="flex flex-col gap-3">
			<p class="text-text-muted text-sm">Enter their final stack to lock in the result.</p>
			<NumberInput
				bind:value={cashOutAmount}
				placeholder="Final stack (kr)"
			/>
		</div>
		{#snippet footer()}
			<div class="flex gap-3">
				<button
					class="flex-1 h-tap rounded-sm bg-surface-high text-text-muted text-sm font-medium"
					onclick={() => { cashOutSheetOpen = false; cashOutTarget = null; cashOutAmount = null; }}
				>Cancel</button>
				<button
					class="flex-1 h-tap rounded-sm bg-red text-text text-sm font-semibold disabled:opacity-40"
					disabled={cashOutAmount === null || cashingOut}
					onclick={handleCashOut}
				>
					{cashingOut ? 'Locking…' : 'Confirm Cash Out'}
				</button>
			</div>
		{/snippet}
	</Sheet>
{/if}

<!-- ── End Session confirmation sheet ────────────────────────────────────── -->
<Sheet bind:open={endSessionSheetOpen} title="End the session?">
	<div class="flex flex-col gap-3">
		{#if uncashedOutSeats.length > 0}
			<p class="text-text-muted text-sm">
				{uncashedOutSeats.length === 1
					? `${uncashedOutSeats[0].players.name} hasn't cashed out yet.`
					: `${uncashedOutSeats.length} players haven't cashed out yet.`}
				Their final stacks will be treated as their current stack (or 0 if unknown).
			</p>
			<ul class="text-sm text-text flex flex-col gap-1">
				{#each uncashedOutSeats as seat (seat.id)}
					<li class="flex items-center justify-between">
						<span>{seat.players.name}</span>
						<span class="text-text-muted tabular">{seat.stack ?? '—'} kr</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-text-muted text-sm">All players have cashed out. Ready to close the session.</p>
		{/if}
	</div>
	{#snippet footer()}
		<div class="flex gap-3">
			<button
				class="flex-1 h-tap rounded-sm bg-surface-high text-text-muted text-sm font-medium"
				onclick={() => { endSessionSheetOpen = false; }}
			>Cancel</button>
			<button
				class="flex-1 h-tap rounded-sm bg-red text-text text-sm font-semibold disabled:opacity-40"
				disabled={closingSession}
				onclick={handleEndSession}
			>
				{closingSession ? 'Closing…' : 'End Session'}
			</button>
		</div>
	{/snippet}
</Sheet>
