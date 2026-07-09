<script lang="ts">
	import Card from '../Card.svelte';

	let { content, class: className } = $props();
</script>

<Card class={className}>{content}</Card>
