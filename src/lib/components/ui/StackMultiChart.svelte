<script lang="ts">
	import { nearestPoint } from '$lib';
	import type { MultiChartData, ChartPoint } from '$lib';

	interface Props {
		chart: MultiChartData;
		ariaLabel?: string;
	}

	let { chart, ariaLabel = 'All players stack timeline' }: Props = $props();

	// Palette — cycles when there are more than 4 players
	const SERIES_COLORS = [
		'var(--color-green-light)',   // #4a8a67
		'var(--color-gold-light)',    // #f0be3a
		'#6ba3c0',                   // blue-teal (not in brand palette, readable on dark bg)
		'var(--color-red-light)',     // #e05444
	];

	function seriesColor(i: number) { return SERIES_COLORS[i % SERIES_COLORS.length]; }

	interface ActivePoint { seriesId: string; point: ChartPoint }
	let activePoint = $state<ActivePoint | null>(null);

	function handlePointerMove(e: PointerEvent) {
		const svg = e.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const svgX = (e.clientX - rect.left) * (chart.w / rect.width);
		// Find nearest point across all series
		let best: ActivePoint | null = null;
		let bestDist = Infinity;
		for (const s of chart.series) {
			const pt = nearestPoint(svgX, s.points);
			const d = Math.abs(pt.x - svgX);
			if (d < bestDist) { bestDist = d; best = { seriesId: s.id, point: pt }; }
		}
		activePoint = best;
	}

	function clearTooltip() { activePoint = null; }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg
	role="img"
	aria-label={ariaLabel}
	viewBox="0 0 {chart.w} {chart.h}"
	class="w-full"
	style="height: {chart.h}px"
	onpointermove={handlePointerMove}
	onpointerleave={clearTooltip}
>
	<!-- Plot area background (subtle) -->
	<rect
		x={chart.padL} y={chart.padT}
		width={chart.w - chart.padL - chart.padR}
		height={chart.h - chart.padT - chart.padB}
		fill="var(--color-surface-high)"
		opacity="0.3"
		rx="2"
	/>

	<!-- Lines per series -->
	{#each chart.series as s, i}
		<path
			d={s.pathD}
			fill="none"
			stroke={seriesColor(i)}
			stroke-width="2"
			stroke-linejoin="round"
			stroke-linecap="round"
			opacity="0.9"
		/>
	{/each}

	<!-- Y-axis labels (min/max) -->
	<text
		x={chart.padL - 4}
		y={chart.padT + 4}
		text-anchor="end"
		font-size="9"
		fill="var(--color-text-muted)"
		dominant-baseline="hanging"
	>{Math.round(chart.yMax)}</text>
	<text
		x={chart.padL - 4}
		y={chart.h - chart.padB - 2}
		text-anchor="end"
		font-size="9"
		fill="var(--color-text-muted)"
		dominant-baseline="auto"
	>{Math.round(chart.yMin)}</text>

	<!-- Tooltip crosshair + bubble (shows nearest series point) -->
	{#if activePoint}
		{@const ap = activePoint.point}
		{@const si = chart.series.findIndex(s => s.id === activePoint!.seriesId)}
		{@const color = seriesColor(si)}
		{@const seriesLabel = chart.series[si]?.label ?? ''}
		<line
			x1={ap.x} y1={chart.padT}
			x2={ap.x} y2={chart.h - chart.padB}
			stroke="var(--color-text-muted)"
			stroke-width="1"
			stroke-dasharray="3 2"
			opacity="0.5"
		/>
		<circle cx={ap.x} cy={ap.y} r="5" fill={color} />
		<circle cx={ap.x} cy={ap.y} r="3" fill="var(--color-bg)" />
		{@const tipX = ap.x + (ap.x > chart.w * 0.65 ? -82 : 8)}
		{@const tipY = Math.max(chart.padT, Math.min(ap.y - 22, chart.h - chart.padB - 36))}
		<rect
			x={tipX - 4} y={tipY - 2}
			width="78" height="30"
			rx="4"
			fill="var(--color-surface-high)"
			stroke="var(--color-border)"
			stroke-width="1"
		/>
		<text
			x={tipX + 35} y={tipY + 9}
			text-anchor="middle"
			font-size="9"
			fill={color}
			font-weight="600"
			dominant-baseline="middle"
		>{seriesLabel}</text>
		<text
			x={tipX + 35} y={tipY + 22}
			text-anchor="middle"
			font-size="10"
			fill="var(--color-text)"
			font-weight="600"
			dominant-baseline="middle"
		>{ap.amount} kr</text>
	{/if}
</svg>

<!-- Legend -->
<div class="flex flex-wrap gap-x-4 gap-y-1 mt-2">
	{#each chart.series as s, i}
		<span class="flex items-center gap-1.5 text-xs text-text-muted">
			<span
				class="inline-block w-3 h-0.5 rounded-full"
				style="background: {seriesColor(i)}; height: 2px;"
				aria-hidden="true"
			></span>
			{s.label}
		</span>
	{/each}
</div>
