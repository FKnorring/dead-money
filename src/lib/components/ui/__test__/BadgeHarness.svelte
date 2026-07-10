<script lang="ts">
	import Badge from '../Badge.svelte';

	let { label, variant }: { label: string; variant?: 'neutral' | 'positive' | 'negative' | 'gold' } = $props();
</script>

<Badge {variant}>{label}</Badge>
