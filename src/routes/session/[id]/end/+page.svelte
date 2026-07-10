<script lang="ts">
	import { calculateNet, calculateSettlement, formatAmount, netClass as getNetClass, netSign as getNetSign } from '$lib';
	import { buildSwishLink, updatePlayerSwish } from '$lib';
	import { calculateAwards, buildChart, buildMultiChart } from '$lib';
	import { getMyPlayerId } from '$lib';
	import { useSessionSync } from '$lib';
	import { Sheet, StackChart, StackMultiChart } from '$lib';
	import type { SeatWithPlayer } from '$lib';
	import type { Transfer, Award } from '$lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// eslint-disable-next-line svelte/reactivity -- initial server data; updated via Realtime
	let session = $state({ ...data.session });
	// eslint-disable-next-line svelte/reactivity -- initial server data; updated via Realtime
	let seats = $state<SeatWithPlayer[]>([...data.seats]);
	// eslint-disable-next-line svelte/reactivity -- initial server data; updated via Realtime
	let buyInTotals = $state<Record<string, number>>({ ...data.buyInTotals });
	// eslint-disable-next-line svelte/reactivity -- static at load time; stack history does not change after session close
	const stackLows: Record<string, number> = { ...data.stackLows };
	// eslint-disable-next-line svelte/reactivity -- static at load time
	const buyInCounts: Record<string, number> = { ...data.buyInCounts };
	// eslint-disable-next-line svelte/reactivity -- static at load time; stack events are immutable once session closes
	const stackTimelines: Record<string, { amount: number; createdAt: string }[]> = { ...data.stackTimelines };

	let myPlayerId = $state<string | null>(null);

	$effect(() => {
		myPlayerId = getMyPlayerId(session.id);
	});

	// Keep seats live (players may still be filling in stacks)
	$effect(() => {
		const sync = useSessionSync(session.id, (fresh) => { seats = fresh; });
		return () => sync.destroy();
	});

	// ── Settlement computation ────────────────────────────────────────────────

	interface SeatResult {
		seat: SeatWithPlayer;
		totalBuyIns: number;
		net: number;
	}

	const sessionDate = $derived(
		new Date(session.closed_at ?? session.created_at).toISOString().slice(0, 10)
	);

	const seatResults = $derived(
		seats
			.map((seat): SeatResult => {
				const totalBuyIns = buyInTotals[seat.player_id] ?? 0;
				// Use final_stack only — calculateNet treats null as 0 (busted / no cash-out recorded)
				const net = calculateNet({ totalBuyIns, finalStack: seat.final_stack });
				return { seat, totalBuyIns, net };
			})
			.sort((a, b) => b.net - a.net)
	);

	const transfers = $derived.by((): Transfer[] => {
		const seatResultList = seatResults.map(r => ({ playerId: r.seat.player_id, net: r.net }));
		const raw = calculateSettlement(seatResultList);

		return raw.map(t => {
			const payee = seats.find(s => s.player_id === t.to);
			const swishNumber = payee?.players.swish_number;
			return {
				...t,
				swishLink: swishNumber
					? buildSwishLink({ swishNumber, amount: t.amount, date: sessionDate })
					: undefined,
			};
		});
	});

	// ── Awards ────────────────────────────────────────────────────────────────

	const awards = $derived<Award[]>(
		seatResults.length >= 2
			? calculateAwards(
					seatResults.map(({ seat, net }) => ({
						name: seat.players.name,
						net,
						finalStack: seat.final_stack,
						buyInCount: buyInCounts[seat.player_id] ?? 1,
						buyInAmount: session.buy_in_amount,
						cashedOutAt: seat.cashed_out_at,
						stackLow: stackLows[seat.player_id] ?? null,
					}))
				)
			: []
	);

	// ── Drama: biggest winner and biggest loser ───────────────────────────────

	const biggestWinner = $derived(seatResults.find(r => r.net > 0) ?? null);
	const biggestLoser = $derived([...seatResults].reverse().find(r => r.net < 0) ?? null);

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('sv-SE', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
		});
	}

	function playerName(playerId: string): string {
		return seats.find(s => s.player_id === playerId)?.players.name ?? playerId;
	}

	// ── Stack charts ─────────────────────────────────────────────────────────

	const playerCharts = $derived(
		seatResults
			.map(({ seat }) => {
				const timeline = stackTimelines[seat.player_id] ?? [];
				return { seat, chart: buildChart(timeline) };
			})
			.filter(entry => entry.chart !== null) as { seat: SeatWithPlayer; chart: NonNullable<ReturnType<typeof buildChart>> }[]
	);

	const multiChart = $derived.by(() => {
		const inputs = seatResults
			.filter(({ seat }) => (stackTimelines[seat.player_id]?.length ?? 0) >= 2)
			.map(({ seat }) => ({
				id: seat.player_id,
				label: seat.players.name,
				timeline: stackTimelines[seat.player_id],
			}));
		return inputs.length >= 2 ? buildMultiChart(inputs) : null;
	});

	// ── Suit symbols for award cards (presentational) ─────────────────────────

	const SUITS = ['♠', '♥', '♦', '♣'] as const;
	function suitFor(i: number): string { return SUITS[i % 4]; }

	// ── Add Swish number ──────────────────────────────────────────────────────

	let swishSheetOpen = $state(false);
	let swishInput = $state('');
	let savingSwish = $state(false);
	let swishError = $state('');

	// Show the swish nudge if the current player is owed money but has no swish number
	const mySwishNudge = $derived.by(() => {
		if (!myPlayerId) return false;
		const mySeat = seats.find(s => s.player_id === myPlayerId);
		if (!mySeat || mySeat.players.swish_number) return false;
		return transfers.some(t => t.to === myPlayerId);
	});

	async function handleSaveSwish() {
		if (!myPlayerId || !swishInput.trim() || savingSwish) return;
		savingSwish = true;
		swishError = '';
		try {
			await updatePlayerSwish(myPlayerId, swishInput.trim());
			// Update local state optimistically
			seats = seats.map(s =>
				s.player_id === myPlayerId
					? { ...s, players: { ...s.players, swish_number: swishInput.trim() } }
					: s
			);
			swishSheetOpen = false;
			swishInput = '';
		} catch (e) {
			swishError = e instanceof Error ? e.message : 'Failed to save';
		} finally {
			savingSwish = false;
		}
	}

	// ── Copy to clipboard fallback ────────────────────────────────────────────

	let copiedTransferIndex = $state<number | null>(null);

	async function copyAmount(amount: number, index: number) {
		await navigator.clipboard.writeText(String(amount));
		copiedTransferIndex = index;
		setTimeout(() => { copiedTransferIndex = null; }, 2000);
	}
</script>

<div class="min-h-dvh bg-bg text-text flex flex-col max-w-md mx-auto">

	<!-- ── Hero (ceremonial felt header) ─────────────────────────────────── -->
	<header class="felt px-6 pt-8 pb-6 flex flex-col gap-3">
		<div class="flex items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="font-display text-5xl tracking-wider leading-none text-text">
					{session.label ?? 'Game Over'}
				</h1>
				<p class="text-text-muted text-sm">{formatDate(session.closed_at ?? session.created_at)}</p>
			</div>
			<div class="flex flex-col items-end gap-2 shrink-0 mt-1">
				<span class="text-3xl leading-none" aria-hidden="true">♠</span>
				<a
					href="/"
					class="flex items-center gap-1.5 bg-surface/40 hover:bg-surface/70 transition-colors
						text-text-muted hover:text-text text-sm font-medium rounded-chip px-3 py-1.5"
				>← Home</a>
			</div>
		</div>

		{#if biggestWinner}
			<p class="text-green-light text-sm font-medium">
				{biggestWinner.seat.players.name} won big tonight
				<span class="tabular font-semibold">+{biggestWinner.net} kr</span>
			</p>
		{/if}
		{#if biggestLoser && biggestLoser !== biggestWinner}
			<p class="text-red-light text-sm">
				{biggestLoser.seat.players.name} takes the hit
				<span class="tabular">{biggestLoser.net} kr</span>
			</p>
		{/if}
	</header>

	<div class="flex-1 flex flex-col gap-6 p-5 pb-10">

		<!-- ── Net results ───────────────────────────────────────────────────── -->
		<section>
			<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
				Results
			</h2>
			<div class="bg-surface rounded-card divide-y divide-border overflow-hidden">
				{#each seatResults as { seat, net, totalBuyIns }, i (seat.id)}
					<div
						class="flex items-center justify-between gap-3 px-4 py-3 result-row"
						style="animation-delay: {i * 100}ms"
					>
						<div class="flex flex-col gap-0.5 min-w-0">
							<span class="font-medium text-text truncate">
								{seat.players.name}
								{#if seat.player_id === myPlayerId}
									<span class="text-text-muted text-xs font-normal"> (you)</span>
								{/if}
							</span>
							<span class="text-text-muted text-xs tabular">
								{formatAmount(totalBuyIns, 'kr', session)} bought in
								· stack {seat.final_stack ?? seat.stack ?? '—'} kr
							</span>
						</div>
						<span class={['tabular font-semibold text-lg shrink-0', getNetClass(net)]}>
							{getNetSign(net)}{net} kr
						</span>
					</div>
				{/each}
			</div>
		</section>

		<!-- ── Suits divider ─────────────────────────────────────────────────── -->
		{#if transfers.length > 0}
			<div class="flex items-center gap-3">
				<div class="flex-1 border-t border-border"></div>
				<span class="text-text-muted text-base leading-none">♥ ♠ ♦ ♣</span>
				<div class="flex-1 border-t border-border"></div>
			</div>

			<!-- ── Transfers ─────────────────────────────────────────────────────── -->
			<section>
				<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
					Settle Up
				</h2>
				<div class="flex flex-col gap-3">
					{#each transfers as transfer, i (i)}
						<div class="bg-surface rounded-card p-4 flex flex-col gap-3">
							<p class="text-text text-sm font-medium">
								<span class="text-red-light">{playerName(transfer.from)}</span>
								<span class="text-text-muted"> pays </span>
								<span class="text-green-light">{playerName(transfer.to)}</span>
							</p>
							<div class="flex items-center justify-between gap-3">
								<span class="tabular text-2xl font-semibold text-text">
									{transfer.amount} kr
								</span>
								{#if transfer.swishLink}
									<a
										href={transfer.swishLink}
										class="flex items-center gap-2 bg-green text-text text-sm font-semibold
											px-4 h-tap rounded-chip hover:bg-green-light transition-colors"
									>
										Swish ↗
									</a>
								{:else}
									<button
										onclick={() => copyAmount(transfer.amount, i)}
										class="flex items-center gap-2 bg-surface-high text-text-muted text-sm font-medium
											px-4 h-tap rounded-chip border border-border hover:text-text transition-colors"
									>
										{copiedTransferIndex === i ? 'Copied ✓' : 'Copy amount'}
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{:else}
			<p class="text-text-muted text-sm text-center py-4">Everyone broke even — no transfers needed.</p>
		{/if}

		<!-- ── Awards ──────────────────────────────────────────────────────── -->
		{#if awards.length > 0}
			<div class="flex items-center gap-3">
				<div class="flex-1 border-t border-border"></div>
				<span class="text-text-muted text-base leading-none">♣ ♦ ♥ ♠</span>
				<div class="flex-1 border-t border-border"></div>
			</div>

			<section>
				<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
					Awards
				</h2>
				<div class="flex flex-col gap-3">
					{#each awards as award, i (award.id + award.recipientName)}
						<div
							class="award-card bg-surface rounded-card p-4 flex flex-col gap-2 border border-border"
							style="--card-delay: {i * 100}ms; animation-delay: {i * 100}ms"
						>
							<span class="award-suit" style="--card-delay: {i * 100}ms">{suitFor(i)}</span>
							<div class="flex items-start justify-between gap-3">
								<h3 class="font-display text-2xl tracking-wider leading-none text-gold-light">
									{award.icon} {award.title}
								</h3>
								<span class="tabular text-xs text-text-muted font-medium shrink-0 mt-1">
									{award.stat}
								</span>
							</div>
							<p class="text-text font-semibold text-sm leading-snug">
								{award.recipientName}
							</p>
							<p class="text-text-muted text-xs leading-relaxed">
								{award.description}
							</p>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- ── Stack history charts ─────────────────────────────────────────── -->
		{#if playerCharts.length > 0}
			<div class="flex items-center gap-3">
				<div class="flex-1 border-t border-border"></div>
				<span class="text-text-muted text-base leading-none">♠ ♣ ♥ ♦</span>
				<div class="flex-1 border-t border-border"></div>
			</div>

			<section>
				<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
					Stack history
				</h2>

				<!-- Merged chart (all players) -->
				{#if multiChart}
					<div class="bg-surface rounded-card border border-border overflow-hidden mb-3">
						<div class="px-4 pt-3 pb-1">
							<p class="text-text-muted text-xs mb-2">All players</p>
							<StackMultiChart
								chart={multiChart}
								ariaLabel="All players stack history"
							/>
						</div>
					</div>
				{/if}

				<!-- Per-player charts -->
				<div class="flex flex-col gap-3">
					{#each playerCharts as { seat, chart } (seat.id)}
						<div class="bg-surface rounded-card border border-border overflow-hidden">
							<div class="px-4 pt-3 pb-2">
								<p class="text-text text-xs font-medium mb-2">{seat.players.name}</p>
								<StackChart
									{chart}
									ariaLabel="Stack history for {seat.players.name}"
								/>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- ── Add Swish number nudge ──────────────────────────────────────── -->
		{#if mySwishNudge}
			<div class="bg-surface-high rounded-card p-4 flex flex-col gap-2 border border-border">
				<p class="text-text text-sm font-medium">Add your Swish number</p>
				<p class="text-text-muted text-xs">
					So payers can settle up in one tap — your Swish number will be saved to your profile.
				</p>
				<button
					onclick={() => { swishSheetOpen = true; }}
					class="self-start mt-1 text-green-light text-sm font-medium underline underline-offset-2"
				>
					Add Swish number →
				</button>
			</div>
		{/if}

	</div>
</div>

<!-- ── Add Swish number sheet ─────────────────────────────────────────────── -->
<Sheet bind:open={swishSheetOpen} title="Add Swish number">
	<div class="flex flex-col gap-3">
		<p class="text-text-muted text-sm">
			Your number is saved to your profile and used to generate payment links in future sessions.
		</p>
		<input
			type="text"
			inputmode="numeric"
			bind:value={swishInput}
			placeholder="e.g. 0701234567"
			class="tabular bg-surface-high border border-border rounded-sm h-tap px-3
				text-text w-full focus:outline-none focus:border-green
				placeholder:text-text-muted"
		/>
		{#if swishError}
			<p class="text-red-light text-sm">{swishError}</p>
		{/if}
	</div>
	{#snippet footer()}
		<div class="flex gap-3">
			<button
				class="flex-1 h-tap rounded-sm bg-surface-high text-text-muted text-sm font-medium"
				onclick={() => { swishSheetOpen = false; swishInput = ''; swishError = ''; }}
			>Cancel</button>
			<button
				class="flex-1 h-tap rounded-sm bg-green text-text text-sm font-semibold disabled:opacity-40"
				disabled={!swishInput.trim() || savingSwish}
				onclick={handleSaveSwish}
			>
				{savingSwish ? 'Saving…' : 'Save'}
			</button>
		</div>
	{/snippet}
</Sheet>

<style>
	/* Staggered entrance animation for result rows */
	@keyframes slam-in {
		0%   { opacity: 0; transform: translateY(12px) scale(0.97); }
		60%  { opacity: 1; transform: translateY(-2px) scale(1.005); }
		100% { opacity: 1; transform: translateY(0) scale(1); }
	}

	.result-row {
		opacity: 0;
		animation: slam-in 350ms var(--ease-out-back, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards;
	}

	/* Award cards: dramatic reveal from below with a slight overshoot */
	@keyframes award-reveal {
		0%   { opacity: 0; transform: translateY(20px) scale(0.95); }
		55%  { opacity: 1; transform: translateY(-3px) scale(1.01); }
		100% { opacity: 1; transform: translateY(0) scale(1); }
	}

	.award-card {
		opacity: 0;
		animation: award-reveal 450ms var(--ease-out-back, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards;
	}

	/* Suit symbol: independent entrance, slightly offset from card body */
	@keyframes suit-drop {
		0%   { opacity: 0; transform: translateY(-8px) scale(1.4); }
		60%  { opacity: 1; transform: translateY(2px) scale(0.95); }
		100% { opacity: 1; transform: translateY(0) scale(1); }
	}

	.award-suit {
		display: block;
		opacity: 0;
		font-size: 1.5rem;
		line-height: 1;
		color: var(--color-gold-light, #d4a847);
		animation: suit-drop 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
		/* Slightly offset from the card body entrance */
		animation-delay: calc(var(--card-delay, 0ms) + 80ms);
	}
</style>
