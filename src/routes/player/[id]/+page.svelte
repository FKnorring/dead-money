<script lang="ts">
	import { netClass as getNetClass, formatNet, formatPercent } from '$lib';
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

	// Chart dimensions (viewBox)
	const CHART_W = 320;
	const CHART_H = 120;
	const PAD_L = 40;  // space for y-axis labels
	const PAD_R = 12;
	const PAD_T = 12;
	const PAD_B = 28;  // space for x-axis labels

	interface ChartPoint { x: number; y: number; amount: number; label: string }

	function buildChart(timeline: { amount: number; createdAt: string }[]): {
		points: ChartPoint[];
		pathD: string;
		areaD: string;
		yMin: number;
		yMax: number;
	} | null {
		if (timeline.length < 2) return null;

		const amounts = timeline.map(t => t.amount);
		const raw_min = Math.min(...amounts);
		const raw_max = Math.max(...amounts);
		// Give some padding above/below so the line doesn't clip to edges
		const padding = Math.max((raw_max - raw_min) * 0.15, 20);
		const yMin = Math.max(0, raw_min - padding);
		const yMax = raw_max + padding;
		const yRange = yMax - yMin || 1;

		const plotW = CHART_W - PAD_L - PAD_R;
		const plotH = CHART_H - PAD_T - PAD_B;

		const points: ChartPoint[] = timeline.map((t, i) => {
			const nx = i / (timeline.length - 1);
			const ny = 1 - (t.amount - yMin) / yRange;
			return {
				x: PAD_L + nx * plotW,
				y: PAD_T + ny * plotH,
				amount: t.amount,
				label: new Date(t.createdAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
			};
		});

		const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
		const baseY = (PAD_T + plotH).toFixed(1);
		const areaD = `${pathD} L ${points.at(-1)!.x.toFixed(1)} ${baseY} L ${PAD_L} ${baseY} Z`;

		return { points, pathD, areaD, yMin, yMax };
	}

	// Tooltip state per session (keyed by sessionId)
	let activePoint = $state<{ sessionId: string; point: ChartPoint } | null>(null);

	function handleChartPointer(e: PointerEvent, sessionId: string, points: ChartPoint[]) {
		const svg = (e.currentTarget as SVGSVGElement);
		const rect = svg.getBoundingClientRect();
		const svgX = (e.clientX - rect.left) * (CHART_W / rect.width);
		// Find nearest point by x
		let closest = points[0];
		let closestDist = Infinity;
		for (const pt of points) {
			const d = Math.abs(pt.x - svgX);
			if (d < closestDist) { closestDist = d; closest = pt; }
		}
		activePoint = { sessionId, point: closest };
	}

	function clearTooltip() { activePoint = null; }
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

							<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
							<svg
								role="img"
								aria-label="Stack timeline for {session.sessionLabel ?? formatDateShort(session.sessionCreatedAt)}"
								viewBox="0 0 {CHART_W} {CHART_H}"
								class="w-full"
								style="height: {CHART_H}px"
								onpointermove={(e) => handleChartPointer(e, session.sessionId, chart.points)}
								onpointerleave={clearTooltip}
							>
								<!-- Area fill -->
								<path
									d={chart.areaD}
									fill="var(--color-green)"
									opacity="0.15"
								/>
								<!-- Line -->
								<path
									d={chart.pathD}
									fill="none"
									stroke="var(--color-green-light)"
									stroke-width="2"
									stroke-linejoin="round"
									stroke-linecap="round"
								/>

								<!-- Y-axis labels (min/max) -->
								<text
									x={PAD_L - 4}
									y={PAD_T + 4}
									text-anchor="end"
									font-size="9"
									fill="var(--color-text-muted)"
									dominant-baseline="hanging"
								>{Math.round(chart.yMax)}</text>
								<text
									x={PAD_L - 4}
									y={CHART_H - PAD_B - 2}
									text-anchor="end"
									font-size="9"
									fill="var(--color-text-muted)"
									dominant-baseline="auto"
								>{Math.round(chart.yMin)}</text>

								<!-- X-axis first/last time labels -->
								<text
									x={PAD_L}
									y={CHART_H - PAD_B + 6}
									text-anchor="start"
									font-size="9"
									fill="var(--color-text-muted)"
									dominant-baseline="hanging"
								>{chart.points.at(0)!.label}</text>
								<text
									x={CHART_W - PAD_R}
									y={CHART_H - PAD_B + 6}
									text-anchor="end"
									font-size="9"
									fill="var(--color-text-muted)"
									dominant-baseline="hanging"
								>{chart.points.at(-1)!.label}</text>

								<!-- Data points (invisible hit targets + visible dots) -->
								{#each chart.points as pt}
									<circle cx={pt.x} cy={pt.y} r="3" fill="var(--color-green-light)" />
									<!-- Expanded touch target -->
									<circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
								{/each}

								<!-- Active tooltip crosshair + label -->
								{#if activePoint?.sessionId === session.sessionId}
									{@const ap = activePoint.point}
									<!-- Vertical crosshair -->
									<line
										x1={ap.x} y1={PAD_T}
										x2={ap.x} y2={CHART_H - PAD_B}
										stroke="var(--color-text-muted)"
										stroke-width="1"
										stroke-dasharray="3 2"
										opacity="0.6"
									/>
									<!-- Dot highlight -->
									<circle cx={ap.x} cy={ap.y} r="5" fill="var(--color-green-light)" />
									<circle cx={ap.x} cy={ap.y} r="3" fill="var(--color-bg)" />
									<!-- Tooltip bubble (keeps within bounds) -->
									{@const tipX = ap.x + (ap.x > CHART_W * 0.65 ? -62 : 8)}
									{@const tipY = Math.max(PAD_T, Math.min(ap.y - 18, CHART_H - PAD_B - 30))}
									<rect
										x={tipX - 4}
										y={tipY - 2}
										width="60"
										height="22"
										rx="4"
										fill="var(--color-surface-high)"
										stroke="var(--color-border)"
										stroke-width="1"
									/>
									<text
										x={tipX + 26}
										y={tipY + 9}
										text-anchor="middle"
										font-size="10"
										fill="var(--color-text)"
										font-weight="600"
										dominant-baseline="middle"
									>{ap.amount} kr</text>
								{/if}
							</svg>
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
