<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		children: Snippet;
	}

	let { class: className = '', children, ...rest }: Props = $props();
</script>

<div
	class={['bg-surface rounded-card border border-border p-4', className]}
	{...rest}
>
	{@render children()}
</div>
