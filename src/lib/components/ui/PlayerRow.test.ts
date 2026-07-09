import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import PlayerRow from './PlayerRow.svelte';

const base = { totalBuyIns: 200, stack: 350, net: 150 };

describe('PlayerRow', () => {
	it('renders the player name', () => {
		render(PlayerRow, { props: { ...base, name: 'Anna' } });
		expect(screen.getByText('Anna')).toBeInTheDocument();
	});

	it('shows the stack value', () => {
		render(PlayerRow, { props: { ...base, name: 'Anna' } });
		expect(screen.getByText('350 kr')).toBeInTheDocument();
	});

	it('shows a dash when stack is null', () => {
		render(PlayerRow, { props: { ...base, stack: null, name: 'Bo' } });
		expect(screen.getByText('—')).toBeInTheDocument();
	});

	it('shows net with + prefix for winners', () => {
		render(PlayerRow, { props: { ...base, net: 150, name: 'Anna' } });
		expect(screen.getByText('+150 kr')).toBeInTheDocument();
	});

	it('shows net without prefix for losers', () => {
		render(PlayerRow, { props: { ...base, net: -100, name: 'Erik' } });
		expect(screen.getByText('-100 kr')).toBeInTheDocument();
	});

	it('applies green highlight for isYou', () => {
		render(PlayerRow, { props: { ...base, name: 'Me', isYou: true } });
		const nameEl = screen.getByText('Me');
		expect(nameEl.className).toContain('text-green-light');
	});

	it('applies no green highlight when not isYou', () => {
		render(PlayerRow, { props: { ...base, name: 'Other' } });
		expect(screen.getByText('Other').className).not.toContain('text-green-light');
	});
});
