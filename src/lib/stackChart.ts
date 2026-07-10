// Chart dimensions (viewBox defaults)
const CHART_W = 320;
const CHART_H = 120;
const PAD_L = 40;  // space for y-axis labels
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 28;  // space for x-axis labels

export interface ChartPoint {
	x: number;
	y: number;
	amount: number;
	label: string;
}

export interface ChartData {
	points: ChartPoint[];
	pathD: string;
	areaD: string;
	yMin: number;
	yMax: number;
	/** ViewBox dimensions used to build this chart (for rendering). */
	w: number;
	h: number;
	padL: number;
	padR: number;
	padT: number;
	padB: number;
}

// ── Multi-series chart (merged view) ───────────────────────────────────────

export interface MultiSeriesInput {
	id: string;
	label: string;
	timeline: { amount: number; createdAt: string }[];
}

export interface MultiSeriesData {
	id: string;
	label: string;
	points: ChartPoint[];
	pathD: string;
}

export interface MultiChartData {
	series: MultiSeriesData[];
	yMin: number;
	yMax: number;
	w: number;
	h: number;
	padL: number;
	padR: number;
	padT: number;
	padB: number;
}

/**
 * Build SVG chart data for multiple series on a shared y-axis.
 * All series are aligned on a normalised x-axis (0..1 by index position).
 * Returns null if no series has >= 2 points.
 */
export function buildMultiChart(
	inputs: MultiSeriesInput[],
	dims?: { w?: number; h?: number; padL?: number; padR?: number; padT?: number; padB?: number }
): MultiChartData | null {
	const eligible = inputs.filter(s => s.timeline.length >= 2);
	if (eligible.length === 0) return null;

	const w = dims?.w ?? CHART_W;
	const h = dims?.h ?? CHART_H;
	const padL = dims?.padL ?? PAD_L;
	const padR = dims?.padR ?? PAD_R;
	const padT = dims?.padT ?? PAD_T;
	const padB = dims?.padB ?? PAD_B;

	// Shared y-axis across all series
	const allAmounts = eligible.flatMap(s => s.timeline.map(t => t.amount));
	const rawMin = Math.min(...allAmounts);
	const rawMax = Math.max(...allAmounts);
	const padding = Math.max((rawMax - rawMin) * 0.15, 20);
	const yMin = Math.max(0, rawMin - padding);
	const yMax = rawMax + padding;
	const yRange = yMax - yMin || 1;

	const plotW = w - padL - padR;
	const plotH = h - padT - padB;

	const series: MultiSeriesData[] = eligible.map(input => {
		const points: ChartPoint[] = input.timeline.map((t, i) => {
			const nx = i / (input.timeline.length - 1);
			const ny = 1 - (t.amount - yMin) / yRange;
			return {
				x: padL + nx * plotW,
				y: padT + ny * plotH,
				amount: t.amount,
				label: new Date(t.createdAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
			};
		});
		const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
		return { id: input.id, label: input.label, points, pathD };
	});

	return { series, yMin, yMax, w, h, padL, padR, padT, padB };
}

/**
 * Build SVG chart data for a stack timeline.
 * Returns null if there are fewer than 2 data points.
 */
export function buildChart(
	timeline: { amount: number; createdAt: string }[],
	dims?: { w?: number; h?: number; padL?: number; padR?: number; padT?: number; padB?: number }
): ChartData | null {
	if (timeline.length < 2) return null;

	const w = dims?.w ?? CHART_W;
	const h = dims?.h ?? CHART_H;
	const padL = dims?.padL ?? PAD_L;
	const padR = dims?.padR ?? PAD_R;
	const padT = dims?.padT ?? PAD_T;
	const padB = dims?.padB ?? PAD_B;

	const amounts = timeline.map(t => t.amount);
	const raw_min = Math.min(...amounts);
	const raw_max = Math.max(...amounts);
	// Give some padding above/below so the line doesn't clip to edges
	const padding = Math.max((raw_max - raw_min) * 0.15, 20);
	const yMin = Math.max(0, raw_min - padding);
	const yMax = raw_max + padding;
	const yRange = yMax - yMin || 1;

	const plotW = w - padL - padR;
	const plotH = h - padT - padB;

	const points: ChartPoint[] = timeline.map((t, i) => {
		const nx = i / (timeline.length - 1);
		const ny = 1 - (t.amount - yMin) / yRange;
		return {
			x: padL + nx * plotW,
			y: padT + ny * plotH,
			amount: t.amount,
			label: new Date(t.createdAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
		};
	});

	const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
	const baseY = (padT + plotH).toFixed(1);
	const areaD = `${pathD} L ${points.at(-1)!.x.toFixed(1)} ${baseY} L ${padL} ${baseY} Z`;

	return { points, pathD, areaD, yMin, yMax, w, h, padL, padR, padT, padB };
}

/**
 * Find the nearest ChartPoint to a given SVG x-coordinate.
 */
export function nearestPoint(svgX: number, points: ChartPoint[]): ChartPoint {
	let closest = points[0];
	let closestDist = Infinity;
	for (const pt of points) {
		const d = Math.abs(pt.x - svgX);
		if (d < closestDist) { closestDist = d; closest = pt; }
	}
	return closest;
}
