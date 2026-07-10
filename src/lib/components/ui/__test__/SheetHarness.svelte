<script lang="ts">
	import Sheet from '../Sheet.svelte';

	let {
		open = $bindable(false),
		title,
		content,
	}: { open?: boolean; title?: string; content: string } = $props();
</script>

<Sheet bind:open {title}>{content}</Sheet>
