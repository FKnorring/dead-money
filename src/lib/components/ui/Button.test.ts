import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ButtonHarness from './__test__/ButtonHarness.svelte';

describe('Button', () => {
	it('renders its label', () => {
		render(ButtonHarness, { props: { label: 'Click me' } });
		expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
	});

	it('applies primary variant classes by default', () => {
		render(ButtonHarness, { props: { label: 'Go' } });
		expect(screen.getByRole('button').className).toContain('bg-green');
	});

	it('applies danger variant classes', () => {
		render(ButtonHarness, { props: { label: 'Delete', variant: 'danger' } });
		expect(screen.getByRole('button').className).toContain('bg-red');
	});

	it('applies ghost variant classes', () => {
		render(ButtonHarness, { props: { label: 'Cancel', variant: 'ghost' } });
		expect(screen.getByRole('button').className).toContain('bg-transparent');
	});

	it('applies lg size classes', () => {
		render(ButtonHarness, { props: { label: 'Big', size: 'lg' } });
		expect(screen.getByRole('button').className).toContain('h-tap-lg');
	});

	it('forwards disabled attribute', () => {
		render(ButtonHarness, { props: { label: 'Off', disabled: true } });
		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('merges extra className', () => {
		render(ButtonHarness, { props: { label: 'Wide', class: 'w-full' } });
		expect(screen.getByRole('button').className).toContain('w-full');
	});
});
