<script lang="ts">
	import { netClass as getNetClass, formatNet, formatPercent, buildChart } from '$lib';
	import { StackChart } from '$lib';
	import type { PlayerSessionRow } from '$lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Overall stats ──────────────────────────────────────────────────────────

	const totalNet = $derived(data.sessions.reduce((s, r) => s + r.net, 0));
	const sessionsPlayed = $derived(data.sessions.length);
	const wins = $derived(data.sessions.filter(r => r.net > 0).length);
	const winRate = $derived(sessionsPlayed > 0 ? wins / sessionsPlayed : 0);

	// ── Formatting helpers ────────────────────────────────────────────────────

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('sv-SE', {
			weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
		});
	}

	function formatDateShort(iso: string): string {
		return new Date(iso).toLocaleDateString('sv-SE', {
			day: 'numeric', month: 'short', year: 'numeric',
		});
	}

	// ── Stack timeline chart ──────────────────────────────────────────────────
	// (chart rendering delegated to StackChart component)
</script>

<div class="min-h-dvh bg-bg text-text flex flex-col max-w-md mx-auto">

	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<header class="felt px-6 pt-8 pb-6 flex flex-col gap-3 header-in">
		<div class="flex items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="font-display text-5xl tracking-wider leading-none">{data.player.name}</h1>
				<p class="text-text-muted text-sm">
					{sessionsPlayed} session{sessionsPlayed === 1 ? '' : 's'}
					&nbsp;·&nbsp;
					{formatPercent(winRate)} win rate
				</p>
			</div>
			<span class="text-3xl leading-none shrink-0 mt-1" aria-hidden="true">♠</span>
		</div>

		<p class={['tabular text-3xl font-semibold', getNetClass(totalNet)]}>
			{formatNet(totalNet)}
		</p>
	</header>

	<div class="flex-1 flex flex-col gap-4 p-5 pb-10">

		{#if data.sessions.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
				<p class="text-4xl" aria-hidden="true">♣</p>
				<p class="text-text-muted text-sm">No sessions yet.</p>
			</div>
		{:else}

			<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">
				Session history
			</h2>

			<!-- ── Session cards ──────────────────────────────────────────────── -->
			{#each data.sessions as session, i (session.sessionId)}
				<div class="session-card bg-surface rounded-card border border-border overflow-hidden"
					style="animation-delay: {i * 80}ms">

					<!-- Session header → links to settlement screen -->
					<a
						href="/session/{session.sessionId}/end"
						class="flex items-center justify-between gap-3 px-4 py-3
							hover:bg-surface-high transition-colors"
					>
						<div class="flex flex-col gap-0.5 min-w-0">
							<span class="font-medium text-text truncate">
								{session.sessionLabel ?? formatDateShort(session.sessionCreatedAt)}
							</span>
							<span class="text-text-muted text-xs tabular">
								{formatDate(session.sessionCreatedAt)}
								&nbsp;·&nbsp;
								{session.buyInCount} buy-in{session.buyInCount === 1 ? '' : 's'}
								({session.totalBuyIns} kr)
							</span>
						</div>
						<span class={['tabular font-semibold text-lg shrink-0', getNetClass(session.net)]}>
							{formatNet(session.net)}
						</span>
					</a>

					<!-- Stack timeline chart (if events exist) -->
					{#each [buildChart(session.stackTimeline)] as chart}
					{#if chart}
						<div class="border-t border-border px-4 py-3">
							<p class="text-text-muted text-xs mb-2">Stack timeline</p>
							<StackChart
								{chart}
								ariaLabel="Stack timeline for {session.sessionLabel ?? formatDateShort(session.sessionCreatedAt)}"
							/>
						</div>
					{:else if session.stackTimeline.length === 0}
						<div class="border-t border-border px-4 py-2">
							<p class="text-text-muted text-xs italic">No timeline data for this session.</p>
						</div>
					{/if}
					{/each}
				</div>
			{/each}
		{/if}

		<!-- ── Nav links ──────────────────────────────────────────────────── -->
		<div class="flex gap-4 justify-center pt-2">
			<a href="/leaderboard" class="text-text-muted text-sm hover:text-text transition-colors">
				← Leaderboard
			</a>
			<a href="/" class="text-text-muted text-sm hover:text-text transition-colors">
				Home →
			</a>
		</div>

	</div>
</div>

<style>
	@keyframes header-slide {
		from { opacity: 0; transform: translateY(-10px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.header-in {
		animation: header-slide 400ms var(--ease-out-back, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
	}

	@keyframes card-in {
		0%   { opacity: 0; transform: translateY(10px) scale(0.98); }
		60%  { opacity: 1; transform: translateY(-1px) scale(1.003); }
		100% { opacity: 1; transform: translateY(0) scale(1); }
	}
	.session-card {
		opacity: 0;
		animation: card-in 320ms var(--ease-out-back, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards;
	}
</style>
