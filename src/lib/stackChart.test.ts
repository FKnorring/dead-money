import { describe, it, expect } from 'vitest';
import { buildChart, nearestPoint } from './stackChart';

const makeTimeline = (amounts: number[]) =>
	amounts.map((amount, i) => ({ amount, createdAt: new Date(2024, 0, 1, i).toISOString() }));

describe('buildChart', () => {
	it('returns null for fewer than 2 points', () => {
		expect(buildChart([])).toBeNull();
		expect(buildChart(makeTimeline([100]))).toBeNull();
	});

	it('returns the correct number of points', () => {
		const result = buildChart(makeTimeline([100, 200, 150]));
		expect(result?.points).toHaveLength(3);
	});

	it('path starts with M at the first point', () => {
		const result = buildChart(makeTimeline([100, 200]));
		expect(result?.pathD).toMatch(/^M /);
	});

	it('first point x equals padL (left padding default)', () => {
		const result = buildChart(makeTimeline([100, 200]));
		// PAD_L = 40, first point nx = 0, so x = 40
		expect(result?.points[0].x).toBe(40);
	});

	it('last point x equals CHART_W - PAD_R (right edge default)', () => {
		const result = buildChart(makeTimeline([100, 200]));
		// PAD_L=40, PAD_R=12, CHART_W=320 → last x = 40 + (320-40-12) = 308
		expect(result?.points.at(-1)!.x).toBe(308);
	});

	it('areaD closes the path back to pad left', () => {
		const result = buildChart(makeTimeline([100, 200]));
		expect(result?.areaD).toMatch(/Z$/);
		expect(result?.areaD).toContain('L 40 ');
	});

	it('respects custom dims', () => {
		const result = buildChart(makeTimeline([100, 200]), { w: 200, h: 100, padL: 10, padR: 10, padT: 5, padB: 5 });
		// plotW = 200-10-10 = 180; first x = 10, last x = 10+180 = 190
		expect(result?.points[0].x).toBe(10);
		expect(result?.points.at(-1)!.x).toBe(190);
	});
});

describe('nearestPoint', () => {
	it('returns the closest point by x', () => {
		const result = buildChart(makeTimeline([100, 200, 300]))!;
		const { points } = result;
		// svgX close to the second point
		const nearest = nearestPoint(points[1].x + 5, points);
		expect(nearest).toBe(points[1]);
	});

	it('handles a single-point array', () => {
		const pt = { x: 50, y: 60, amount: 100, label: '12:00' };
		expect(nearestPoint(0, [pt])).toBe(pt);
		expect(nearestPoint(999, [pt])).toBe(pt);
	});

	it('returns first point when equidistant (tie goes to earlier)', () => {
		const pts = [
			{ x: 10, y: 50, amount: 100, label: '10:00' },
			{ x: 30, y: 50, amount: 200, label: '11:00' },
		];
		// midpoint is 20 — equidistant; loop picks first found (pts[0])
		const nearest = nearestPoint(20, pts);
		expect(nearest).toBe(pts[0]);
	});
});
