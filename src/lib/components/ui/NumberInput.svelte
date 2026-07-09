<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		value?: number | null;
		class?: string;
	}

	let {
		value = $bindable(null),
		class: className = '',
		...rest
	}: Props = $props();
</script>

<input
	type="text"
	inputmode="numeric"
	bind:value
	class={[
		'tabular bg-surface-high border border-border rounded-sm h-tap px-3',
		'text-text w-full text-right',
		'focus:outline-none focus:border-green',
		'placeholder:text-text-muted',
		'disabled:opacity-40 disabled:pointer-events-none',
		className,
	]}
	{...rest}
/>
