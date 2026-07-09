import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import BadgeHarness from './__test__/BadgeHarness.svelte';

describe('Badge', () => {
	it('renders children', () => {
		const { getByText } = render(BadgeHarness, { props: { label: 'Active' } });
		expect(getByText('Active')).toBeInTheDocument();
	});

	it('applies neutral variant by default', () => {
		const { getByText } = render(BadgeHarness, { props: { label: 'Label' } });
		expect(getByText('Label').className).toContain('bg-surface-high');
	});

	it('applies positive variant', () => {
		const { getByText } = render(BadgeHarness, { props: { label: 'Win', variant: 'positive' } });
		expect(getByText('Win').className).toContain('bg-green-dim');
		expect(getByText('Win').className).toContain('text-green-light');
	});

	it('applies negative variant', () => {
		const { getByText } = render(BadgeHarness, { props: { label: 'Loss', variant: 'negative' } });
		expect(getByText('Loss').className).toContain('bg-red-dim');
	});

	it('applies gold variant', () => {
		const { getByText } = render(BadgeHarness, { props: { label: 'Top', variant: 'gold' } });
		expect(getByText('Top').className).toContain('bg-gold-dim');
	});
});
