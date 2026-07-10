<script lang="ts">
	import Button from '../Button.svelte';

	let {
		label,
		variant,
		size,
		disabled,
		class: className,
	}: {
		label: string;
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		class?: string;
	} = $props();
</script>

<Button {variant} {size} {disabled} class={className}>{label}</Button>
