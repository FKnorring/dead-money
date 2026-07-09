<script lang="ts">
	import Button from '../Button.svelte';

	let { label, variant, size, disabled, class: className } = $props();
</script>

<Button {variant} {size} {disabled} class={className}>{label}</Button>
