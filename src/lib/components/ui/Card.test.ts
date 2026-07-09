import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CardHarness from './__test__/CardHarness.svelte';

describe('Card', () => {
	it('renders children', () => {
		const { getByText } = render(CardHarness, { props: { content: 'Card content' } });
		expect(getByText('Card content')).toBeInTheDocument();
	});

	it('applies surface background and card radius', () => {
		const { container } = render(CardHarness, { props: { content: 'x' } });
		const el = container.firstElementChild as HTMLElement;
		expect(el.className).toContain('bg-surface');
		expect(el.className).toContain('rounded-card');
	});

	it('merges extra className', () => {
		const { container } = render(CardHarness, { props: { content: 'x', class: 'mt-4' } });
		expect((container.firstElementChild as HTMLElement).className).toContain('mt-4');
	});
});
