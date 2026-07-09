<script lang="ts">
	import { Button, ChipButton, Card, Badge, NumberInput, PlayerRow, Sheet } from '$lib';

	let sheetOpen = $state(false);
	let customAmount = $state<number | null>(null);

	const players = [
		{ name: 'Anna', totalBuyIns: 200, stack: 650, net: 450, isYou: false },
		{ name: 'Erik', totalBuyIns: 400, stack: 200, net: -200, isYou: true },
		{ name: 'Bo', totalBuyIns: 200, stack: 200, net: 0, isYou: false },
	];
</script>

<main class="min-h-dvh bg-bg text-text p-5 flex flex-col gap-8 max-w-md mx-auto">

	<!-- ── Ceremonial header ── -->
	<section class="felt rounded-card p-8 flex flex-col gap-2">
		<h1 class="font-display text-5xl tracking-wider">dead-money</h1>
		<p class="text-text-muted text-sm">♠ ♥ ♦ ♣</p>
	</section>

	<!-- ── Buttons ── -->
	<section class="flex flex-col gap-3">
		<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">Buttons</h2>
		<div class="flex flex-wrap gap-2">
			<Button>Primary</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="danger">Danger</Button>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button size="sm">Small</Button>
			<Button size="md">Medium</Button>
			<Button size="lg">Large</Button>
		</div>
		<Button disabled>Disabled</Button>
	</section>

	<!-- ── Chip buttons ── -->
	<section class="flex flex-col gap-3">
		<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">Chip Buttons</h2>
		<div class="flex gap-3 flex-wrap">
			{#each ['0.5x', '1x', '1.5x', '2x'] as mult}
				<ChipButton label={mult} />
			{/each}
		</div>
		<div class="flex gap-3 flex-wrap">
			<ChipButton label="-100" tone="red" />
			<ChipButton label="-50" tone="red" />
			<ChipButton label="+50" />
			<ChipButton label="+100" />
		</div>
	</section>

	<!-- ── Badges ── -->
	<section class="flex flex-col gap-3">
		<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">Badges</h2>
		<div class="flex gap-2 flex-wrap">
			<Badge>Neutral</Badge>
			<Badge variant="positive">+450 kr</Badge>
			<Badge variant="negative">-200 kr</Badge>
			<Badge variant="gold">🏆 Top</Badge>
		</div>
	</section>

	<!-- ── Player rows ── -->
	<section class="flex flex-col gap-3">
		<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">Player Rows</h2>
		<Card class="p-0 divide-y divide-border">
			{#each players as player}
				<PlayerRow {...player} />
			{/each}
		</Card>
	</section>

	<!-- ── Number input ── -->
	<section class="flex flex-col gap-3">
		<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">Number Input</h2>
		<NumberInput bind:value={customAmount} placeholder="Enter amount…" />
		{#if customAmount}
			<p class="text-text-muted text-sm tabular">You entered: {customAmount} kr</p>
		{/if}
	</section>

	<!-- ── Sheet ── -->
	<section class="flex flex-col gap-3">
		<h2 class="text-text-muted text-xs font-semibold uppercase tracking-widest">Sheet</h2>
		<Button onclick={() => (sheetOpen = true)}>Open Custom Amount Sheet</Button>
	</section>

</main>

<Sheet bind:open={sheetOpen} title="Custom Buy-in">
	<div class="flex flex-col gap-4">
		<p class="text-text-muted text-sm">Enter a custom amount in kr.</p>
		<NumberInput bind:value={customAmount} placeholder="0" />
	</div>
	{#snippet footer()}
		<div class="flex gap-3">
			<Button variant="ghost" class="flex-1" onclick={() => (sheetOpen = false)}>Cancel</Button>
			<Button class="flex-1" onclick={() => (sheetOpen = false)}>Confirm</Button>
		</div>
	{/snippet}
</Sheet>
