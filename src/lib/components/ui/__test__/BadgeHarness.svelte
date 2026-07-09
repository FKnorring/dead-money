<script lang="ts">
	import Badge from '../Badge.svelte';

	let { label, variant } = $props();
</script>

<Badge {variant}>{label}</Badge>
