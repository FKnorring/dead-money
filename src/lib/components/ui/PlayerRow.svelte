<script lang="ts">
	import type { Snippet } from 'svelte';
	import { netClass as getNetClass, netSign as getNetSign } from '$lib/chips';

	interface Props {
		name: string;
		totalBuyIns: number;
		stack: number | null;
		net: number;
		isYou?: boolean;
		trailing?: Snippet;
	}

	let { name, totalBuyIns, stack, net, isYou = false, trailing }: Props = $props();

	const netCls = $derived(getNetClass(net));
	const netPfx = $derived(getNetSign(net));
</script>

<div
	class={[
		'flex items-center justify-between gap-3 py-3 px-4',
		isYou ? 'border-l-2 border-green pl-3' : '',
	]}
>
	<!-- Name -->
	<span class={['font-medium truncate', isYou ? 'text-green-light' : 'text-text']}>
		{name}
	</span>

	<!-- Stats + trailing -->
	<div class="flex items-center gap-4 shrink-0">
		<div class="flex flex-col items-end gap-0.5">
			<span class="tabular text-sm text-text-muted">
				{stack !== null ? `${stack} kr` : '—'}
			</span>
			<span class={['tabular text-sm font-semibold', netCls]}>
				{netPfx}{net} kr
			</span>
		</div>
		{#if trailing}
			{@render trailing()}
		{/if}
	</div>
</div>
