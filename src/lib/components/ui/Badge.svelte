<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'neutral' | 'positive' | 'negative' | 'gold';

	interface Props {
		variant?: Variant;
		class?: string;
		children: Snippet;
	}

	let { variant = 'neutral', class: className = '', children }: Props = $props();

	const variants: Record<Variant, string> = {
		neutral:  'bg-surface-high text-text-muted',
		positive: 'bg-green-dim text-green-light',
		negative: 'bg-red-dim text-red-light',
		gold:     'bg-gold-dim text-gold-light',
	};
</script>

<span
	class={[
		'inline-flex items-center rounded-chip px-2 py-0.5 text-xs font-medium',
		variants[variant],
		className,
	]}
>
	{@render children()}
</span>
