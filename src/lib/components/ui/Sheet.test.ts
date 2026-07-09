import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import SheetHarness from './__test__/SheetHarness.svelte';

describe('Sheet', () => {
	it('is not visible when closed', () => {
		const { container } = render(SheetHarness, { props: { open: false, content: 'Hidden' } });
		const dialog = container.querySelector('dialog') as HTMLDialogElement;
		expect(dialog.open).toBe(false);
	});

	it('is visible when open', () => {
		const { container } = render(SheetHarness, { props: { open: true, content: 'Visible' } });
		const dialog = container.querySelector('dialog') as HTMLDialogElement;
		expect(dialog.open).toBe(true);
	});

	it('renders the title when provided', () => {
		const { getByText } = render(SheetHarness, {
			props: { open: true, title: 'Custom Amount', content: 'Body' }
		});
		expect(getByText('Custom Amount')).toBeInTheDocument();
	});

	it('closes when the close button is clicked', async () => {
		const user = userEvent.setup();
		const { container, getByLabelText } = render(SheetHarness, {
			props: { open: true, title: 'Close me', content: 'Body' }
		});
		await user.click(getByLabelText('Close'));
		const dialog = container.querySelector('dialog') as HTMLDialogElement;
		expect(dialog.open).toBe(false);
	});
});
