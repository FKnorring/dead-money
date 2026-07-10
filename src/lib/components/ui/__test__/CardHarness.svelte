<script lang="ts">
	import Card from '../Card.svelte';

	let { content, class: className }: { content: string; class?: string } = $props();
</script>

<Card class={className}>{content}</Card>
