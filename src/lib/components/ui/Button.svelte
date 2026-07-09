<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		size?: Size;
		class?: string;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const base =
		'inline-flex items-center justify-center font-semibold rounded-card ' +
		'transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer';

	const variants: Record<Variant, string> = {
		primary:   'bg-green text-text hover:bg-green-light',
		secondary: 'bg-surface-high text-text border border-border hover:bg-surface',
		ghost:     'bg-transparent text-text-muted hover:text-text hover:bg-surface',
		danger:    'bg-red text-text hover:bg-red-light',
	};

	const sizes: Record<Size, string> = {
		sm: 'h-tap px-3 text-sm',
		md: 'h-tap px-5 text-base',
		lg: 'h-tap-lg px-6 text-lg',
	};
</script>

<button class={[base, variants[variant], sizes[size], className]} {...rest}>
	{@render children()}
</button>
