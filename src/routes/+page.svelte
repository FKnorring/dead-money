<script lang="ts">
	// Temporary design-system smoke test — replace when building the lobby
</script>

<main class="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] p-6 flex flex-col gap-8">

	<!-- Ceremonial header sample -->
	<section class="felt rounded-[var(--radius-card)] p-8 flex flex-col gap-2">
		<h1 class="font-[family-name:var(--font-display)] text-5xl tracking-wider text-[var(--color-text)]">
			dead-money
		</h1>
		<p class="text-[var(--color-text-muted)] text-sm">♠ ♥ ♦ ♣</p>
	</section>

	<!-- Color palette -->
	<section class="flex flex-col gap-3">
		<h2 class="font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-widest">
			Palette
		</h2>
		<div class="grid grid-cols-3 gap-2">
			{#each [
				{ label: 'bg', color: '#0a120d' },
				{ label: 'surface', color: '#111a13' },
				{ label: 'border', color: '#1e2e20' },
				{ label: 'green', color: '#35654d' },
				{ label: 'red', color: '#c0392b' },
				{ label: 'gold', color: '#d4a017' },
			] as swatch}
				<div class="flex flex-col gap-1">
					<div
						class="h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)]"
						style="background:{swatch.color}"
					></div>
					<span class="text-[var(--color-text-muted)] text-xs">{swatch.label}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- Action buttons (chip-style, press feel) -->
	<section class="flex flex-col gap-3">
		<h2 class="font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-widest">
			Chip Buttons
		</h2>
		<div class="flex gap-3 flex-wrap">
			{#each ['0.5x', '1x', '1.5x', '2x'] as mult}
				<button
					class="btn-action w-16 h-16 rounded-[var(--radius-chip)] bg-[var(--color-green)] text-[var(--color-text)] font-semibold text-sm"
				>
					{mult}
				</button>
			{/each}
		</div>
	</section>

	<!-- Net values with tabular numbers -->
	<section class="flex flex-col gap-3">
		<h2 class="font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-widest">
			Net Values
		</h2>
		<div class="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-4 flex flex-col gap-2">
			{#each [
				{ name: 'Anna', net: 450, display: '+450 kr' },
				{ name: 'Erik', net: -200, display: '-200 kr' },
				{ name: 'Bo', net: 0, display: '±0 kr' },
			] as player}
				<div class="flex justify-between items-center">
					<span class="text-[var(--color-text)]">{player.name}</span>
					<span class="tabular font-semibold {player.net > 0 ? 'net-positive' : player.net < 0 ? 'net-negative' : 'net-zero'}">
						{player.display}
					</span>
				</div>
			{/each}
		</div>
	</section>

</main>
