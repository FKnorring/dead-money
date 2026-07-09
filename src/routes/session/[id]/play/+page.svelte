<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib';
</script>

<main class="min-h-dvh bg-bg text-text flex flex-col items-center justify-center gap-6 p-5">
	<p class="font-display text-5xl tracking-wider text-green-light">Game On ♠</p>
	<p class="text-text-muted text-sm">Active session tracking coming soon.</p>
	<Button variant="secondary" onclick={() => history.back()}>← Back to Lobby</Button>
</main>
