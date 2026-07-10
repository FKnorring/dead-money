<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";

	type Tone = "green" | "red" | "muted";
	type Size = "sm" | "md";

	interface Props extends HTMLButtonAttributes {
		label: string;
		tone?: Tone;
		size?: Size;
		class?: string;
	}

	let {
		label,
		tone = "green",
		size = "md",
		class: className = "",
		...rest
	}: Props = $props();

	const tones: Record<Tone, string> = {
		green: "bg-green text-text",
		red: "bg-red text-text",
		muted: "bg-surface-high text-text-muted",
	};

	const sizes: Record<Size, string> = {
		sm: "w-14 h-14 text-sm",
		md: "w-16 h-16 text-base",
	};
</script>

<button
	class={[
		"btn-action inline-flex items-center justify-center rounded-chip font-semibold",
		"cursor-pointer disabled:opacity-40 disabled:pointer-events-none outline-2 border-4 border-dashed",
		tones[tone],
		sizes[size],
		className,
	]}
	{...rest}
>
	{label}
</button>
