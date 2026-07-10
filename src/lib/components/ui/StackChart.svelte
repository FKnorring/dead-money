<script lang="ts">
	import { nearestPoint } from '$lib';
	import type { ChartData, ChartPoint } from '$lib';

	interface Props {
		chart: ChartData;
		ariaLabel?: string;
	}

	let { chart, ariaLabel = 'Stack timeline' }: Props = $props();

	let activePoint = $state<ChartPoint | null>(null);

	function handlePointerMove(e: PointerEvent) {
		const svg = e.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const svgX = (e.clientX - rect.left) * (chart.w / rect.width);
		activePoint = nearestPoint(svgX, chart.points);
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
	<!-- Area fill -->
	<path d={chart.areaD} fill="var(--color-green)" opacity="0.15" />
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

	<!-- X-axis first/last time labels -->
	<text
		x={chart.padL}
		y={chart.h - chart.padB + 6}
		text-anchor="start"
		font-size="9"
		fill="var(--color-text-muted)"
		dominant-baseline="hanging"
	>{chart.points.at(0)!.label}</text>
	<text
		x={chart.w - chart.padR}
		y={chart.h - chart.padB + 6}
		text-anchor="end"
		font-size="9"
		fill="var(--color-text-muted)"
		dominant-baseline="hanging"
	>{chart.points.at(-1)!.label}</text>

	<!-- Data points -->
	{#each chart.points as pt}
		<circle cx={pt.x} cy={pt.y} r="3" fill="var(--color-green-light)" />
		<circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
	{/each}

	<!-- Tooltip crosshair + label -->
	{#if activePoint}
		{@const ap = activePoint}
		<line
			x1={ap.x} y1={chart.padT}
			x2={ap.x} y2={chart.h - chart.padB}
			stroke="var(--color-text-muted)"
			stroke-width="1"
			stroke-dasharray="3 2"
			opacity="0.6"
		/>
		<circle cx={ap.x} cy={ap.y} r="5" fill="var(--color-green-light)" />
		<circle cx={ap.x} cy={ap.y} r="3" fill="var(--color-bg)" />
		{@const tipX = ap.x + (ap.x > chart.w * 0.65 ? -62 : 8)}
		{@const tipY = Math.max(chart.padT, Math.min(ap.y - 18, chart.h - chart.padB - 30))}
		<rect
			x={tipX - 4} y={tipY - 2}
			width="60" height="22"
			rx="4"
			fill="var(--color-surface-high)"
			stroke="var(--color-border)"
			stroke-width="1"
		/>
		<text
			x={tipX + 26} y={tipY + 9}
			text-anchor="middle"
			font-size="10"
			fill="var(--color-text)"
			font-weight="600"
			dominant-baseline="middle"
		>{ap.amount} kr</text>
	{/if}
</svg>
