<script lang="ts">
	import { ChipButton, Sheet, NumberInput } from "$lib";
	import { recordBuyIn, updateStack, cashOutSeat } from "$lib";
	import {
		calculateNet,
		formatAmount,
		netClass as getNetClass,
		netSign as getNetSign,
	} from "$lib";
	import type { Session, SeatWithPlayer } from "$lib";

	interface Props {
		session: Session;
		/** The seat being managed (own seat, or a seat the host chose) */
		seat: SeatWithPlayer;
		totalBuyIns: number;
		displayUnit: "kr" | "bb";
		/** Called when the seat's stack changes so the parent can update its state */
		onStackChange?: () => void;
		/** Called specifically after a successful cash-out */
		onCashOut?: () => void;
	}

	let {
		session,
		seat,
		totalBuyIns,
		displayUnit,
		onStackChange,
		onCashOut,
	}: Props = $props();

	const buyIn = $derived(session.buy_in_amount);
	const bbSize = $derived(session.bb_size);

	// ── Buy-in chip amounts ───────────────────────────────────────────────────

	const buyInAmounts = $derived([
		{ label: "0.5×", kr: buyIn * 0.5 },
		{ label: "1×", kr: buyIn },
		{ label: "1.5×", kr: buyIn * 1.5 },
		{ label: "2×", kr: buyIn * 2 },
	]);

	const buyInAmountsExtra = $derived([
		{ label: "0.25×", kr: buyIn * 0.25 },
		{ label: "2.5×", kr: buyIn * 2.5 },
		{ label: "3×", kr: buyIn * 3 },
	]);

	// ── Stack delta chip amounts ──────────────────────────────────────────────

	const stackDeltasPos = $derived([
		{ delta: bbSize * 1 },
		{ delta: bbSize * 5 },
		{ delta: bbSize * 10 },
	]);

	const stackDeltasNeg = $derived([
		{ delta: -bbSize * 1 },
		{ delta: -bbSize * 5 },
		{ delta: -bbSize * 10 },
	]);

	// ── Derived stats ─────────────────────────────────────────────────────────

	const stack = $derived(seat.stack);

	let pendingDelta = $state(0);
	const previewStack = $derived((seat.stack ?? 0) + pendingDelta);
	const hasPending = $derived(pendingDelta !== 0);

	const net = $derived(
		calculateNet({ totalBuyIns, finalStack: previewStack }),
	);
	const netCls = $derived(getNetClass(net));
	const netPfx = $derived(getNetSign(net));

	function fmt(kr: number): string {
		return formatAmount(kr, displayUnit, session);
	}

	function fmtDelta(delta: number): string {
		if (delta >= 0) return `+${fmt(delta)}`;
		return `–${fmt(-delta)}`;
	}

	// ── Reset pending delta only when seat.stack VALUE changes (not just prop ref) ──

	let _prevStack = $state(seat.stack);
	$effect(() => {
		const current = seat.stack;
		if (current !== _prevStack) {
			_prevStack = current;
			pendingDelta = 0;
		}
	});

	// ── Expanded rows ─────────────────────────────────────────────────────────

	let showExtraBuyIn = $state(false);

	// ── Sheets ────────────────────────────────────────────────────────────────

	let buyInSheetOpen = $state(false);
	let buyInAmount = $state<number | null>(null);

	let stackSheetOpen = $state(false);
	let stackAmount = $state<number | null>(null);

	let cashOutSheetOpen = $state(false);
	let cashOutAmount = $state<number | null>(null);

	// ── Actions ───────────────────────────────────────────────────────────────

	let busy = $state(false);

	async function handleBuyIn(kr: number) {
		if (busy) return;
		busy = true;
		try {
			const newStack = (seat.stack ?? 0) + pendingDelta + kr;
			await recordBuyIn({
				seatId: seat.id,
				sessionId: session.id,
				playerId: seat.player_id,
				amount: kr,
				newStack,
			});
			pendingDelta = 0;
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

	function applyDelta(delta: number) {
		pendingDelta += delta;
	}

	async function handleConfirm() {
		if (!hasPending || busy) return;
		busy = true;
		try {
			await updateStack({
				seatId: seat.id,
				sessionId: session.id,
				playerId: seat.player_id,
				stack: previewStack,
			});
			pendingDelta = 0;
			onStackChange?.();
		} finally {
			busy = false;
		}
	}

	function handleReset() {
		pendingDelta = 0;
	}

	function handleBust() {
		pendingDelta = -(seat.stack ?? 0);
	}

	async function handleStackExact() {
		if (stackAmount === null || busy) return;
		busy = true;
		try {
			await updateStack({
				seatId: seat.id,
				sessionId: session.id,
				playerId: seat.player_id,
				stack: stackAmount,
			});
			pendingDelta = 0;
			stackSheetOpen = false;
			stackAmount = null;
			onStackChange?.();
		} finally {
			busy = false;
		}
	}

	async function handleCashOut() {
		if (cashOutAmount === null || busy) return;
		busy = true;
		try {
			await cashOutSeat({ seatId: seat.id, finalStack: cashOutAmount });
			cashOutSheetOpen = false;
			cashOutAmount = null;
			onStackChange?.();
			onCashOut?.();
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-6 p-5 pb-24">
	<!-- ── Stats bar ─────────────────────────────────────────────────────── -->
	<section class="bg-surface rounded-card p-4 flex flex-col gap-3">
		<div class="flex items-baseline justify-between gap-3">
			<span class="text-text-muted text-sm">Stack</span>
			<div class="flex flex-col items-end gap-0.5">
				{#key previewStack}
					<span
						class={[
							"tabular text-3xl font-semibold stack-value",
							hasPending ? "text-yellow-300" : "text-text",
						]}
					>
						{fmt(previewStack)}
					</span>
				{/key}
				{#if hasPending}
					<span class="tabular text-xs text-yellow-300">
						{fmtDelta(pendingDelta)} pending
					</span>
				{/if}
			</div>
		</div>
		<div class="flex items-center justify-between gap-3 text-sm">
			<span class="text-text-muted">Bought in</span>
			<span class="tabular text-text">{fmt(totalBuyIns)}</span>
		</div>
		<div
			class="flex items-center justify-between gap-3 text-sm border-t border-border pt-3"
		>
			<span class="text-text-muted">Net</span>
			<span class={["tabular font-semibold", netCls]}>
				{netPfx}{fmt(net)}
			</span>
		</div>
	</section>

	<!-- ── Stack section ─────────────────────────────────────────────────── -->
	<section class="flex flex-col gap-3">
		<h2
			class="text-text-muted text-xs font-semibold uppercase tracking-widest"
		>
			Adjust Stack
		</h2>

		<!-- Positive row -->
		<div class="flex gap-3 flex-wrap">
			{#each stackDeltasPos as { delta } (delta)}
				<ChipButton
					label={fmtDelta(delta)}
					tone="green"
					disabled={busy}
					onclick={() => applyDelta(delta)}
				/>
			{/each}
			<ChipButton
				label="Set"
				tone="muted"
				onclick={() => {
					stackSheetOpen = true;
				}}
			/>
		</div>

		<!-- Negative row -->
		<div class="flex gap-3 flex-wrap">
			{#each stackDeltasNeg as { delta } (delta)}
				<ChipButton
					label={fmtDelta(delta)}
					tone="red"
					disabled={busy}
					onclick={() => applyDelta(delta)}
				/>
			{/each}
			<ChipButton
				label="Bust"
				tone="red"
				disabled={busy || !seat.stack}
				onclick={handleBust}
			/>
		</div>

		<!-- Confirm / Reset — only when there's a pending delta -->
		{#if hasPending}
			<div class="flex gap-3 mt-1">
				<button
					class="flex-1 h-tap rounded-sm bg-surface-high text-text-muted text-sm font-medium
						hover:text-text transition-colors disabled:opacity-40 disabled:pointer-events-none"
					onclick={handleReset}
					disabled={busy}>Reset</button
				>
				<button
					class="flex-1 h-tap rounded-sm bg-green text-text text-sm font-semibold
						disabled:opacity-40 disabled:pointer-events-none"
					onclick={handleConfirm}
					disabled={busy}
				>
					{busy ? "Saving…" : "Confirm"}
				</button>
			</div>
		{/if}
	</section>

	<!-- ── Buy-in section ────────────────────────────────────────────────── -->
	<section class="flex flex-col gap-3">
		<h2
			class="text-text-muted text-xs font-semibold uppercase tracking-widest"
		>
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
				onclick={() => {
					showExtraBuyIn = !showExtraBuyIn;
				}}
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
					onclick={() => {
						buyInSheetOpen = true;
					}}
				/>
			</div>
		{/if}
	</section>

	<!-- ── Cash Out section ──────────────────────────────────────────────── -->
	<section class="flex flex-col gap-3 border-t border-border pt-4">
		<h2
			class="text-text-muted text-xs font-semibold uppercase tracking-widest"
		>
			Cash Out
		</h2>
		<button
			onclick={() => {
				cashOutAmount = stack ?? null;
				cashOutSheetOpen = true;
			}}
			disabled={busy}
			class="w-full h-tap rounded-sm bg-surface border border-red text-red-light text-sm font-semibold
				hover:bg-red-dim transition-colors disabled:opacity-40 disabled:pointer-events-none"
		>
			Cash Out
		</button>
	</section>
</div>

<!-- ── Buy-in custom amount sheet ────────────────────────────────────────── -->
<Sheet bind:open={buyInSheetOpen} title="Custom Buy In">
	<div class="flex flex-col gap-3">
		<p class="text-text-muted text-sm">Enter the buy-in amount in kr.</p>
		<NumberInput bind:value={buyInAmount} placeholder="e.g. 250" />
	</div>
	{#snippet footer()}
		<div class="flex gap-3">
			<button
				class="flex-1 h-tap rounded-sm bg-surface-high text-text-muted text-sm font-medium"
				onclick={() => {
					buyInSheetOpen = false;
					buyInAmount = null;
				}}>Cancel</button
			>
			<button
				class="flex-1 h-tap rounded-sm bg-green text-text text-sm font-semibold disabled:opacity-40"
				disabled={!buyInAmount || busy}
				onclick={handleBuyInCustom}>Add Buy In</button
			>
		</div>
	{/snippet}
</Sheet>

<!-- ── Set exact stack sheet ─────────────────────────────────────────────── -->
<Sheet bind:open={stackSheetOpen} title="Set Exact Stack">
	<div class="flex flex-col gap-3">
		<p class="text-text-muted text-sm">
			Enter your current chip count in kr.
		</p>
		<NumberInput bind:value={stackAmount} placeholder="e.g. 480" />
	</div>
	{#snippet footer()}
		<div class="flex gap-3">
			<button
				class="flex-1 h-tap rounded-sm bg-surface-high text-text-muted text-sm font-medium"
				onclick={() => {
					stackSheetOpen = false;
					stackAmount = null;
				}}>Cancel</button
			>
			<button
				class="flex-1 h-tap rounded-sm bg-green text-text text-sm font-semibold disabled:opacity-40"
				disabled={!stackAmount || busy}
				onclick={handleStackExact}>Set Stack</button
			>
		</div>
	{/snippet}
</Sheet>

<!-- ── Cash Out sheet ────────────────────────────────────────────────────── -->
<Sheet bind:open={cashOutSheetOpen} title="Cash out {seat.players.name}?">
	<div class="flex flex-col gap-3">
		<p class="text-text-muted text-sm">
			Enter your final stack to lock in your result and leave.
		</p>
		<NumberInput
			bind:value={cashOutAmount}
			placeholder="Final stack (kr)"
		/>
	</div>
	{#snippet footer()}
		<div class="flex gap-3">
			<button
				class="flex-1 h-tap rounded-sm bg-surface-high text-text-muted text-sm font-medium"
				onclick={() => {
					cashOutSheetOpen = false;
					cashOutAmount = null;
				}}>Cancel</button
			>
			<button
				class="flex-1 h-tap rounded-sm bg-red text-text text-sm font-semibold disabled:opacity-40"
				disabled={cashOutAmount === null || busy}
				onclick={handleCashOut}
			>
				{busy ? "Locking…" : "Confirm Cash Out"}
			</button>
		</div>
	{/snippet}
</Sheet>

<style>
	/* 200ms count-roll animation on stack value change */
	@keyframes stack-roll {
		0% {
			opacity: 0.3;
			transform: translateY(-6px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.stack-value {
		animation: stack-roll 200ms ease-out;
	}
</style>
