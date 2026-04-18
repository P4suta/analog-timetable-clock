<script lang="ts">
	import { isDaytime, sunAngle } from "$lib/daytime";
	import { polar } from "$lib/geometry";

	type Props = {
		now: Date;
	};

	let { now }: Props = $props();

	const SIZE = 120;
	const CX = SIZE / 2;
	const CY = SIZE / 2;
	const R_OUTER = 54;
	const R_ICON_ORBIT = 40; // 太陽/月のアイコンが回る軌道半径

	// 現在の太陽角度（CW from 真上、度）
	const sunDeg = $derived(sunAngle(now));
	const daytime = $derived(isDaytime(now));

	// 常に「地平線より上にある天体」を描画する：
	// 昼は太陽がそのまま上、夜は月を太陽の反対側に置くと必ず地平線より上に来る
	const iconDeg = $derived(daytime ? sunDeg : (sunDeg + 180) % 360);
	const iconPos = $derived(polar(CX, CY, R_ICON_ORBIT, iconDeg));

	const ampm = $derived(now.getHours() < 12 ? "AM" : "PM");
	const hhmm = $derived.by(() => {
		const h = String(now.getHours()).padStart(2, "0");
		const m = String(now.getMinutes()).padStart(2, "0");
		return `${h}:${m}`;
	});

	// 目印の刻み：0/6/12/18 時の 4 点
	const marks = [
		{ deg: 0, label: "12" }, // 正午 = 真上
		{ deg: 90, label: "6" }, // 日の出 = 右（ただし AM 6 時）
		{ deg: 180, label: "0" }, // 真夜中 = 真下
		{ deg: 270, label: "18" }, // 日没 = 左
	] as const;
</script>

<div class="subdial" class:night={!daytime}>
	<svg viewBox="0 0 {SIZE} {SIZE}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
		<!-- 背景円 -->
		<circle cx={CX} cy={CY} r={R_OUTER} class="dial-bg" />

		<!-- 空（上半円）と地面（下半円）を半透明で塗り分け -->
		<path
			d="M {CX - R_OUTER} {CY} A {R_OUTER} {R_OUTER} 0 0 1 {CX + R_OUTER} {CY} Z"
			class="sky"
		/>
		<path
			d="M {CX - R_OUTER} {CY} A {R_OUTER} {R_OUTER} 0 0 0 {CX + R_OUTER} {CY} Z"
			class="ground"
		/>

		<!-- 地平線 -->
		<line
			x1={CX - R_OUTER}
			y1={CY}
			x2={CX + R_OUTER}
			y2={CY}
			class="horizon"
		/>

		<!-- 6/12/18/24 時の刻み -->
		{#each marks as m (m.deg)}
			{@const outer = polar(CX, CY, R_OUTER, m.deg)}
			{@const inner = polar(CX, CY, R_OUTER - 5, m.deg)}
			{@const labelPos = polar(CX, CY, R_OUTER - 12, m.deg)}
			<line
				x1={outer.x}
				y1={outer.y}
				x2={inner.x}
				y2={inner.y}
				class="tick"
			/>
			<text
				x={labelPos.x}
				y={labelPos.y}
				text-anchor="middle"
				dominant-baseline="central"
				class="tick-label"
			>
				{m.label}
			</text>
		{/each}

		<!-- 太陽 or 月 -->
		{#if daytime}
			<circle cx={iconPos.x} cy={iconPos.y} r="7" class="sun" />
			<circle cx={iconPos.x} cy={iconPos.y} r="11" class="sun-glow" />
		{:else}
			<!-- 月：三日月風に、本体を描いたあと影を重ねる -->
			<circle cx={iconPos.x} cy={iconPos.y} r="7" class="moon" />
			<circle
				cx={iconPos.x - 3}
				cy={iconPos.y - 1}
				r="6"
				class="moon-shadow"
			/>
		{/if}
	</svg>
	<div class="readout">
		<span class="ampm">{ampm}</span>
		<span class="time">{hhmm}</span>
	</div>
</div>

<style>
	.subdial {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-fg);
	}

	.subdial svg {
		width: 120px;
		height: 120px;
	}

	.dial-bg {
		fill: rgba(0, 0, 0, 0.35);
		stroke: rgba(255, 255, 255, 0.18);
		stroke-width: 1;
	}

	.sky {
		fill: rgba(140, 190, 255, 0.08);
	}

	.subdial.night .sky {
		fill: rgba(60, 80, 150, 0.12);
	}

	.ground {
		fill: rgba(0, 0, 0, 0.18);
	}

	.horizon {
		stroke: rgba(255, 255, 255, 0.4);
		stroke-width: 1;
		stroke-dasharray: 2 2;
	}

	.tick {
		stroke: rgba(255, 255, 255, 0.55);
		stroke-width: 1.5;
		stroke-linecap: round;
	}

	.tick-label {
		fill: rgba(255, 255, 255, 0.55);
		font-size: 8px;
		font-family: var(--font-mono);
		user-select: none;
	}

	.sun {
		fill: #ffd24d;
	}

	.sun-glow {
		fill: none;
		stroke: rgba(255, 210, 77, 0.5);
		stroke-width: 1.5;
	}

	.moon {
		fill: #e6ecf5;
	}

	.moon-shadow {
		fill: rgba(0, 0, 0, 0.55);
	}

	.readout {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		font-variant-numeric: tabular-nums;
	}

	.ampm {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
	}

	.time {
		font-family: var(--font-mono);
		font-size: 0.95rem;
		color: var(--color-fg);
	}
</style>
