import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NumberInput from './NumberInput.svelte';

describe('NumberInput', () => {
	it('renders an input element', () => {
		render(NumberInput);
		expect(screen.getByRole('textbox')).toBeInTheDocument();
	});

	it('sets inputmode to numeric', () => {
		render(NumberInput);
		expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'numeric');
	});

	it('applies placeholder', () => {
		render(NumberInput, { props: { placeholder: '200' } });
		expect(screen.getByPlaceholderText('200')).toBeInTheDocument();
	});

	it('forwards disabled attribute', () => {
		render(NumberInput, { props: { disabled: true } });
		expect(screen.getByRole('textbox')).toBeDisabled();
	});

	it('merges extra className', () => {
		render(NumberInput, { props: { class: 'w-32' } });
		expect(screen.getByRole('textbox').className).toContain('w-32');
	});
});
