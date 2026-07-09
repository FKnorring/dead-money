<script lang="ts">
	import Sheet from '../Sheet.svelte';

	let { open = $bindable(false), title, content } = $props();
</script>

<Sheet bind:open {title}>{content}</Sheet>
