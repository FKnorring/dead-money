<script lang="ts">
	import { PlayerRow } from '$lib';
	import { calculateNet } from '$lib';
	import type { Seat, Session } from '$lib';

	interface SeatWithPlayer extends Seat {
		players: { id: string; name: string; swish_number: string | null };
	}

	interface Props {
		session: Session;
		seats: SeatWithPlayer[];
		buyInTotals: Record<string, number>;
		myPlayerId: string | null;
		isHost: boolean;
	}

	let { session, seats, buyInTotals, myPlayerId, isHost }: Props = $props();

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
								<a
									href="/session/{session.id}/cashout/{seat.id}"
									class="text-text-muted text-xs hover:text-red-light transition-colors px-1 py-1 shrink-0"
									aria-label="Cash out {seat.players.name}"
								>
									Cash Out
								</a>
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
</div>
