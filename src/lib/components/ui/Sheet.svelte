<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		title?: string;
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		children,
		footer,
		onclose,
	}: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialog) return;
		if (open) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	});

	function handleBackdropClick(e: MouseEvent) {
		// Close when clicking the backdrop (outside the sheet content)
		if (e.target === dialog) {
			close();
		}
	}

	function handleCancel(e: Event) {
		// Native Escape key — sync state
		e.preventDefault();
		close();
	}

	function close() {
		open = false;
		onclose?.();
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	onclick={handleBackdropClick}
	oncancel={handleCancel}
	class="
		fixed bottom-0 left-0 right-0 m-0 w-full max-w-none max-h-[85dvh]
		bg-transparent p-0
		backdrop:bg-black/60 backdrop:backdrop-blur-sm
	"
>
	<!-- Inner wrapper carries the transform so iOS touch routing isn't broken -->
	<div class={[
		'w-full max-h-[85dvh] flex flex-col',
		'bg-surface rounded-t-card border-t border-border',
		'overflow-hidden',
		'transition-transform duration-normal ease-out',
		open ? 'translate-y-0' : 'translate-y-full',
	]}>
		{#if title}
			<div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
				<h2 class="font-semibold text-text">{title}</h2>
				<button
					onclick={close}
					class="text-text-muted hover:text-text transition-colors p-1 -mr-1"
					aria-label="Close"
				>
					✕
				</button>
			</div>
		{/if}

		<div class="flex-1 overflow-y-auto p-4">
			{@render children()}
		</div>

		{#if footer}
			<div class="shrink-0 px-4 py-3 border-t border-border">
				{@render footer()}
			</div>
		{/if}
	</div>
</dialog>
