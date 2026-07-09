import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ChipButton from './ChipButton.svelte';

describe('ChipButton', () => {
	it('renders its label', () => {
		render(ChipButton, { props: { label: '1x' } });
		expect(screen.getByRole('button', { name: '1x' })).toBeInTheDocument();
	});

	it('applies green tone by default', () => {
		render(ChipButton, { props: { label: '1x' } });
		expect(screen.getByRole('button').className).toContain('bg-green');
	});

	it('applies red tone', () => {
		render(ChipButton, { props: { label: '-100', tone: 'red' } });
		expect(screen.getByRole('button').className).toContain('bg-red');
	});

	it('always applies btn-action class', () => {
		render(ChipButton, { props: { label: '2x' } });
		expect(screen.getByRole('button').className).toContain('btn-action');
	});

	it('applies rounded-chip class', () => {
		render(ChipButton, { props: { label: '0.5x' } });
		expect(screen.getByRole('button').className).toContain('rounded-chip');
	});

	it('forwards disabled attribute', () => {
		render(ChipButton, { props: { label: 'Off', disabled: true } });
		expect(screen.getByRole('button')).toBeDisabled();
	});
});
