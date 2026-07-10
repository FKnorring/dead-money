<script lang="ts">
	import { netClass as getNetClass, formatNet, formatPercent } from "$lib";
	import type { LeaderboardEntry } from "$lib";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const topWinner = $derived(
		[...data.entries].sort((a, b) => b.biggestWin - a.biggestWin)[0] ??
			null,
	);
	const topLoser = $derived(
		[...data.entries].sort((a, b) => a.worstNet - b.worstNet)[0] ?? null,
	);

	/** Ordinal rank suffix — 1st, 2nd, 3rd, 4th… */
	function rankLabel(i: number): string {
		const n = i + 1;
		const s = ["th", "st", "nd", "rd"];
		const v = n % 100;
		return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
	}
</script>

<div class="min-h-dvh bg-bg text-text flex flex-col max-w-md mx-auto">
	<!-- ── Ceremonial header ────────────────────────────────────────────────── -->
	<header class="felt px-6 pt-8 pb-6 flex flex-col gap-3 header-in">
		<p class="text-text-muted text-sm tracking-widest" aria-hidden="true">
			♠ ♥ ♦ ♣
		</p>
		<h1 class="font-display text-6xl tracking-wider leading-none">
			Leaderboard
		</h1>
		{#if data.entries.length > 0}
			<p class="text-text-muted text-sm">
				{data.entries.length} player{data.entries.length === 1
					? ""
					: "s"} · all-time
			</p>
		{/if}
	</header>

	<div class="flex-1 flex flex-col gap-6 p-5 pb-10">
		{#if data.entries.length === 0}
			<!-- Empty state -->
			<div
				class="flex flex-col items-center justify-center gap-3 py-16 text-center"
			>
				<p class="text-4xl" aria-hidden="true">♠</p>
				<p class="text-text-muted text-sm">
					No completed sessions yet.
				</p>
				<p class="text-text-muted text-xs">
					Close a session to see stats here.
				</p>
			</div>
		{:else}
			<!-- ── Ranked player list ──────────────────────────────────────────── -->
			<section>
				<div
					class="bg-surface rounded-card divide-y divide-border overflow-hidden"
				>
					{#each data.entries as entry, i (entry.playerId)}
						<a
							href="/player/{entry.playerId}"
							class="player-row flex items-center gap-4 px-4 min-h-tap py-1 grow
								hover:bg-surface-high transition-colors
								{i === 0 ? 'gold-row' : ''}"
							style="animation-delay: {i * 80}ms"
						>
							<!-- Rank -->
							<span
								class="font-display text-3xl leading-none w-10 shrink-0 tabular
									{i === 0 ? 'text-gold-light' : 'text-text-muted'}"
								aria-label="Rank {rankLabel(i)}"
							>
								{i + 1}
							</span>

							<!-- Player name + session stats -->
							<div
								class="flex flex-col gap-0.5 min-w-0 flex-1 grow"
							>
								<span
									class="font-semibold text-text truncate {i ===
									0
										? 'text-gold-light'
										: ''}"
								>
									{entry.playerName}
								</span>
								<span class="text-text-muted text-xs tabular">
									{entry.sessionsPlayed} session{entry.sessionsPlayed ===
									1
										? ""
										: "s"}
									&nbsp;·&nbsp;
									{formatPercent(entry.winRate)} wins
									{#if entry.biggestWin > 0}
										&nbsp;·&nbsp;best {formatNet(
											entry.biggestWin,
										)}
									{/if}
									{#if entry.worstNet < 0}
										&nbsp;·&nbsp;worst {formatNet(
											entry.worstNet,
										)}
									{/if}
								</span>
							</div>

							<!-- Total net -->
							<span
								class={[
									"tabular font-semibold text-lg shrink-0",
									getNetClass(entry.totalNet),
								]}
							>
								{formatNet(entry.totalNet)}
							</span>
						</a>
					{/each}
				</div>
			</section>

			<!-- ── Suit divider ───────────────────────────────────────────────── -->
			<div class="flex items-center gap-3">
				<div class="flex-1 border-t border-border"></div>
				<span
					class="text-text-muted text-base leading-none"
					aria-hidden="true">♥ ♠ ♦ ♣</span
				>
				<div class="flex-1 border-t border-border"></div>
			</div>

			<!-- ── Records ───────────────────────────────────────────────────── -->
			<section class="flex flex-col gap-3">
				<h2
					class="text-text-muted text-xs font-semibold uppercase tracking-widest"
				>
					Records
				</h2>

				{#if topWinner && topWinner.biggestWin > 0}
					<div
						class="bg-surface rounded-card px-4 py-3 flex items-center justify-between gap-3"
					>
						<div class="flex flex-col gap-0.5">
							<span
								class="text-xs text-text-muted uppercase tracking-wider font-semibold"
							>
								Biggest single win
							</span>
							<span class="font-semibold text-text"
								>{topWinner.playerName}</span
							>
						</div>
						<span
							class="tabular text-lg font-semibold text-gold-light"
						>
							{formatNet(topWinner.biggestWin)}
						</span>
					</div>
				{/if}

				{#if topLoser && topLoser.worstNet < 0}
					<div
						class="bg-surface rounded-card px-4 py-3 flex items-center justify-between gap-3"
					>
						<div class="flex flex-col gap-0.5">
							<span
								class="text-xs text-text-muted uppercase tracking-wider font-semibold"
							>
								Worst single session
							</span>
							<span class="font-semibold text-text"
								>{topLoser.playerName}</span
							>
						</div>
						<span
							class="tabular text-lg font-semibold text-red-light"
						>
							{formatNet(topLoser.worstNet)}
						</span>
					</div>
				{/if}
			</section>
		{/if}

		<!-- ── Back link ──────────────────────────────────────────────────── -->
		<a
			href="/"
			class="text-text-muted text-sm text-center hover:text-text transition-colors py-2"
		>
			← Back to home
		</a>
	</div>
</div>

<style>
	/* Header slides down from above */
	@keyframes header-slide {
		from {
			opacity: 0;
			transform: translateY(-12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.header-in {
		animation: header-slide 400ms
			var(--ease-out-back, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
	}

	/* Each player row cascades in */
	@keyframes cascade-in {
		0% {
			opacity: 0;
			transform: translateY(10px) scale(0.98);
		}
		60% {
			opacity: 1;
			transform: translateY(-1px) scale(1.003);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	.player-row {
		opacity: 0;
		animation: cascade-in 320ms
			var(--ease-out-back, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards;
	}

	/* Gold row — subtle highlight for #1 */
	.gold-row {
		background-color: color-mix(
			in srgb,
			var(--color-gold-dim) 25%,
			transparent
		);
	}
	.gold-row:hover {
		background-color: color-mix(
			in srgb,
			var(--color-gold-dim) 35%,
			transparent
		);
	}
</style>
