<script lang="ts">
	import { ChipButton, Sheet, NumberInput } from '$lib';
	import { recordBuyIn, updateStack } from '$lib';
	import { calculateNet } from '$lib';
	import { krToBb } from '$lib';
	import type { Seat, Session } from '$lib';

	interface Props {
		session: Session;
		/** The seat being managed (own seat, or a seat the host chose) */
		seat: Seat & { players: { id: string; name: string; swish_number: string | null } };
		totalBuyIns: number;
		displayUnit: 'kr' | 'bb';
		/** Called when the seat's stack changes so the parent can update its state */
		onStackChange?: () => void;
	}

	let { session, seat, totalBuyIns, displayUnit, onStackChange }: Props = $props();

	const bbSize = $derived(session.bb_size);
	const buyIn = $derived(session.buy_in_amount);

	// ── Buy-in chip amounts ───────────────────────────────────────────────────

	const buyInAmounts = $derived([
		{ label: '0.5×', kr: buyIn * 0.5 },
		{ label: '1×',   kr: buyIn },
		{ label: '1.5×', kr: buyIn * 1.5 },
		{ label: '2×',   kr: buyIn * 2 },
	]);

	const buyInAmountsExtra = $derived([
		{ label: '0.25×', kr: buyIn * 0.25 },
		{ label: '2.5×',  kr: buyIn * 2.5 },
		{ label: '3×',    kr: buyIn * 3 },
	]);

	// ── Stack delta chip amounts ──────────────────────────────────────────────

	const stackDeltas = $derived([
		{ label: `–2BB`, delta: -bbSize * 2 },
		{ label: `–1BB`, delta: -bbSize },
		{ label: `+1BB`, delta: bbSize },
		{ label: `+2BB`, delta: bbSize * 2 },
	]);

	const stackDeltasExtra = $derived([
		{ label: `+0.5BB`, delta: bbSize * 0.5 },
		{ label: `+3BB`,   delta: bbSize * 3 },
		{ label: `+4BB`,   delta: bbSize * 4 },
	]);

	// ── Derived stats ─────────────────────────────────────────────────────────

	const stack = $derived(seat.stack);
	const net = $derived(calculateNet({ totalBuyIns, finalStack: stack }));
	const netClass = $derived(net > 0 ? 'net-positive' : net < 0 ? 'net-negative' : 'net-zero');
	const netSign = $derived(net > 0 ? '+' : '');

	function fmt(kr: number): string {
		if (displayUnit === 'bb') {
			const bb = krToBb(kr, { buyInKr: buyIn });
			return `${bb % 1 === 0 ? bb.toFixed(0) : bb.toFixed(1)} BB`;
		}
		return `${kr} kr`;
	}

	// ── Expanded rows ─────────────────────────────────────────────────────────

	let showExtraBuyIn = $state(false);
	let showExtraStack = $state(false);

	// ── Sheets ────────────────────────────────────────────────────────────────

	let buyInSheetOpen = $state(false);
	let buyInAmount = $state<number | null>(null);

	let stackSheetOpen = $state(false);
	let stackAmount = $state<number | null>(null);

	// ── Actions ───────────────────────────────────────────────────────────────

	let busy = $state(false);

	async function handleBuyIn(kr: number) {
		if (busy) return;
		busy = true;
		try {
			await recordBuyIn({
				seatId: seat.id,
				sessionId: session.id,
				playerId: seat.player_id,
				amount: kr,
			});
			onStackChange?.();
		} finally {
			busy = false;
		}
	}

	async function handleBuyInCustom() {
		if (!buyInAmount || busy) return;
		await handleBuyIn(buyInAmount);
		buyInSheetOpen = false;
		buyInAmount = null;
	}

	async function handleDelta(delta: number) {
		if (busy) return;
		const current = stack ?? 0;
		await handleSetStack(current + delta);
	}

	async function handleSetStack(newStack: number) {
		if (busy) return;
		busy = true;
		try {
			await updateStack({
				seatId: seat.id,
				sessionId: session.id,
				playerId: seat.player_id,
				stack: newStack,
			});
			onStackChange?.();
		} finally {
			busy = false;
		}
	}

	async function handleStackExact() {
		if (!stackAmount || busy) return;
		await handleSetStack(stackAmount);
		stackSheetOpen = false;
		stackAmount = null;
	}
</script>

<div class="flex flex-col gap-6 p-5 pb-24">

	<!-- ── Stats bar ─────────────────────────────────────────────────────── -->
	<section class="bg-surface rounded-card p-4 flex flex-col gap-3">
		<div class="flex items-baseline justify-between gap-3">
			<span class="text-text-muted text-sm">Stack</span>
			<span class="tabular text-3xl font-semibold text-text stack-value">
				{stack !== null ? fmt(stack) : '—'}
			</span>
		</div>
		<div class="flex items-center justify-between gap-3 text-sm">
			<span class="text-text-muted">Bought in</span>
			<span class="tabular text-text">{fmt(totalBuyIns)}</span>
		</div>
		<div class="flex items-center justify-between gap-3 text-sm border-t border-border pt-3">
			<span class="text-text-muted">Net</span>
			<span class={['tabular font-semibold', netClass]}>
				{netSign}{fmt(net)}
			</span>
		</div>
	</section>

	<!-- ── Buy-in section ────────────────────────────────────────────────── -->
	<section class="flex flex-col gap-3">
		<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">
			Buy In / Top Up
		</h2>
		<div class="flex gap-3 flex-wrap">
			{#each buyInAmounts as { label, kr } (label)}
				<ChipButton
					{label}
					disabled={busy}
					onclick={() => handleBuyIn(kr)}
				/>
			{/each}
			<ChipButton
				label="…"
				tone="muted"
				onclick={() => { showExtraBuyIn = !showExtraBuyIn; }}
			/>
		</div>

		{#if showExtraBuyIn}
			<div class="flex gap-3 flex-wrap">
				{#each buyInAmountsExtra as { label, kr } (label)}
					<ChipButton
						{label}
						tone="muted"
						disabled={busy}
						onclick={() => handleBuyIn(kr)}
					/>
				{/each}
				<ChipButton
					label="Other"
					tone="muted"
					onclick={() => { buyInSheetOpen = true; }}
				/>
			</div>
		{/if}
	</section>

	<!-- ── Stack section ─────────────────────────────────────────────────── -->
	<section class="flex flex-col gap-3">
		<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">
			Adjust Stack
		</h2>
		<div class="flex gap-3 flex-wrap">
			{#each stackDeltas as { label, delta } (label)}
				<ChipButton
					{label}
					tone={delta < 0 ? 'red' : 'green'}
					disabled={busy}
					onclick={() => handleDelta(delta)}
				/>
			{/each}
			<ChipButton
				label="…"
				tone="muted"
				onclick={() => { showExtraStack = !showExtraStack; }}
			/>
		</div>

		{#if showExtraStack}
			<div class="flex gap-3 flex-wrap">
				{#each stackDeltasExtra as { label, delta } (label)}
					<ChipButton
						{label}
						tone="muted"
						disabled={busy}
						onclick={() => handleDelta(delta)}
					/>
				{/each}
				<ChipButton
					label="Set exact"
					tone="muted"
					onclick={() => { stackSheetOpen = true; }}
				/>
			</div>
		{/if}
	</section>
</div>

<!-- ── Buy-in custom amount sheet ────────────────────────────────────────── -->
<Sheet bind:open={buyInSheetOpen} title="Custom Buy In">
	<div class="flex flex-col gap-3">
		<p class="text-text-muted text-sm">Enter the buy-in amount in kr.</p>
		<NumberInput
			bind:value={buyInAmount}
			placeholder="e.g. 250"
		/>
	</div>
	{#snippet footer()}
		<div class="flex gap-3">
			<button
				class="flex-1 h-tap rounded-sm bg-surface-high text-text-muted text-sm font-medium"
				onclick={() => { buyInSheetOpen = false; buyInAmount = null; }}
			>Cancel</button>
			<button
				class="flex-1 h-tap rounded-sm bg-green text-text text-sm font-semibold disabled:opacity-40"
				disabled={!buyInAmount || busy}
				onclick={handleBuyInCustom}
			>Add Buy In</button>
		</div>
	{/snippet}
</Sheet>

<!-- ── Set exact stack sheet ─────────────────────────────────────────────── -->
<Sheet bind:open={stackSheetOpen} title="Set Exact Stack">
	<div class="flex flex-col gap-3">
		<p class="text-text-muted text-sm">Enter your current chip count in kr.</p>
		<NumberInput
			bind:value={stackAmount}
			placeholder="e.g. 480"
		/>
	</div>
	{#snippet footer()}
		<div class="flex gap-3">
			<button
				class="flex-1 h-tap rounded-sm bg-surface-high text-text-muted text-sm font-medium"
				onclick={() => { stackSheetOpen = false; stackAmount = null; }}
			>Cancel</button>
			<button
				class="flex-1 h-tap rounded-sm bg-green text-text text-sm font-semibold disabled:opacity-40"
				disabled={!stackAmount || busy}
				onclick={handleStackExact}
			>Set Stack</button>
		</div>
	{/snippet}
</Sheet>

<style>
	/* 200ms count-roll animation on stack value change */
	@keyframes stack-roll {
		0%   { opacity: 0.3; transform: translateY(-6px); }
		100% { opacity: 1;   transform: translateY(0); }
	}

	.stack-value {
		animation: stack-roll 200ms ease-out;
	}
</style>
