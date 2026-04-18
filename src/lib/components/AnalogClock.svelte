<script lang="ts">
	import { periodProgress, periodState } from "$lib/daytime";
	import { minutesToClockAngle, polar, ringSegment } from "$lib/geometry";
	import type { Period } from "$lib/schedule";

	type Props = {
		now: Date;
		periods: readonly Period[];
	};

	let { now, periods }: Props = $props();

	// 土日は「今日は授業がありません」と表示しているので、時間割リングそのものを
	// 非表示にして普通のアナログ時計として振る舞わせる。
	const isWeekend = $derived.by(() => {
		const d = now.getDay();
		return d === 0 || d === 6;
	});

	const SIZE = 500;
	const CX = SIZE / 2;
	const CY = SIZE / 2;

	// 半径（外周から内側へ）
	const R_RING_OUTER = 235;
	const R_RING_INNER = 205;
	const R_LABEL = 220;
	const R_MIN_TICK_OUTER = 198;
	const R_MIN_TICK_INNER = 190;
	const R_HOUR_TICK_INNER = 182;
	const R_NUMBER = 165;
	const R_HOUR_HAND = 110;
	const R_MINUTE_HAND = 155;
	const R_SECOND_HAND = 175;
	const R_SECOND_TAIL = 30;

	// 各 Period を描画用データに変換。
	// state=current のコマは、経過部分と残り部分の 2 つのセグメントに分割して
	// 「90 分を塗り潰していく」進行ゲージ表現を作る。
	const periodSegments = $derived(
		periods.map((p) => {
			const startDeg = minutesToClockAngle(p.startMin);
			const endDeg = minutesToClockAngle(p.endMin);
			const midMin = (p.startMin + p.endMin) / 2;
			const labelPos = polar(CX, CY, R_LABEL, minutesToClockAngle(midMin));
			const state = periodState(p, now);

			// 時計回り角度幅（0〜360 に正規化）。現在コマを分割するときに使う。
			const delta = (((endDeg - startDeg) % 360) + 360) % 360;

			let elapsedPath: string | null = null;
			let remainingPath: string | null = null;
			let wholePath: string;

			if (state === "current") {
				const progress = periodProgress(p, now);
				const progressDeg = (startDeg + delta * progress) % 360;
				// progress が 0 や 1 の境界ではどちらかが 0 幅となり描画を省略する。
				if (progress > 0) {
					elapsedPath = ringSegment(
						CX,
						CY,
						R_RING_OUTER,
						R_RING_INNER,
						startDeg,
						progressDeg,
					);
				}
				if (progress < 1) {
					remainingPath = ringSegment(
						CX,
						CY,
						R_RING_OUTER,
						R_RING_INNER,
						progressDeg,
						endDeg,
					);
				}
				wholePath = ringSegment(
					CX,
					CY,
					R_RING_OUTER,
					R_RING_INNER,
					startDeg,
					endDeg,
				);
			} else {
				wholePath = ringSegment(
					CX,
					CY,
					R_RING_OUTER,
					R_RING_INNER,
					startDeg,
					endDeg,
				);
			}

			return {
				key: p.key,
				label: p.label,
				kind: p.kind,
				state,
				d: wholePath,
				elapsedPath,
				remainingPath,
				labelX: labelPos.x,
				labelY: labelPos.y,
			};
		}),
	);

	// 針の角度（度）
	const hourAngle = $derived.by(() => {
		const h = now.getHours() % 12;
		const m = now.getMinutes();
		const s = now.getSeconds();
		return (h + m / 60 + s / 3600) * 30;
	});
	const minuteAngle = $derived.by(() => {
		const m = now.getMinutes();
		const s = now.getSeconds();
		return (m + s / 60) * 6;
	});
	const secondAngle = $derived.by(() => {
		const s = now.getSeconds();
		const ms = now.getMilliseconds();
		return (s + ms / 1000) * 6;
	});

	const minuteTicks = Array.from({ length: 60 }, (_, i) => i);
	const hourNumbers = Array.from({ length: 12 }, (_, i) => i + 1);

	function periodFill(kind: "class" | "lunch", key: string): string {
		if (kind === "lunch") return "var(--color-lunch)";
		return `var(--color-${key})`;
	}

</script>

<svg
	viewBox="0 0 {SIZE} {SIZE}"
	xmlns="http://www.w3.org/2000/svg"
	role="img"
	aria-label="時間割アナログ時計"
	class="clock"
>
	<!-- 文字盤ベース。平日は外周リング（時間割の土台）＋内側の文字盤の二重構造、
	     土日は時間割を出さないので単一の文字盤ディスクだけにする（空枠を残さない）。 -->
	{#if isWeekend}
		<circle cx={CX} cy={CY} r={R_RING_OUTER} fill="var(--color-face)" />
	{:else}
		<circle cx={CX} cy={CY} r={R_RING_OUTER} fill="var(--color-face-ring)" />
		<circle cx={CX} cy={CY} r={R_RING_INNER} fill="var(--color-face)" />
	{/if}

	<!-- 各コマのアーク（土日は非表示） -->
	{#if !isWeekend}
	<g class="period-arcs">
		{#each periodSegments as seg (seg.key)}
			{#if seg.state === "current"}
				<!-- 土台：枠線＋グロー用 -->
				<path
					d={seg.d}
					class="arc arc-current-base"
					fill="none"
				/>
				{#if seg.elapsedPath}
					<path
						d={seg.elapsedPath}
						fill={periodFill(seg.kind, seg.key)}
						class="arc arc-current-elapsed"
					/>
				{/if}
				{#if seg.remainingPath}
					<path
						d={seg.remainingPath}
						fill={periodFill(seg.kind, seg.key)}
						class="arc arc-current-remaining"
					/>
				{/if}
			{:else}
				<path
					d={seg.d}
					fill={periodFill(seg.kind, seg.key)}
					class="arc arc-{seg.state}"
				/>
			{/if}
		{/each}
	</g>

	<!-- コマのラベル -->
	<g class="period-labels">
		{#each periodSegments as seg (seg.key)}
			<text
				x={seg.labelX}
				y={seg.labelY}
				text-anchor="middle"
				dominant-baseline="central"
				class="period-label label-{seg.state}"
			>
				{seg.label}
			</text>
		{/each}
	</g>
	{/if}

	<!-- 分目盛と時目盛 -->
	<g class="ticks">
		{#each minuteTicks as i (i)}
			{@const isHour = i % 5 === 0}
			{@const angle = i * 6}
			{@const outer = polar(CX, CY, R_MIN_TICK_OUTER, angle)}
			{@const inner = polar(
				CX,
				CY,
				isHour ? R_HOUR_TICK_INNER : R_MIN_TICK_INNER,
				angle,
			)}
			<line
				x1={outer.x}
				y1={outer.y}
				x2={inner.x}
				y2={inner.y}
				stroke={isHour ? "var(--color-tick-major)" : "var(--color-tick)"}
				stroke-width={isHour ? 3 : 1.5}
				stroke-linecap="round"
			/>
		{/each}
	</g>

	<!-- 1〜12 の数字 -->
	<g class="numbers">
		{#each hourNumbers as n (n)}
			{@const pos = polar(CX, CY, R_NUMBER, n * 30)}
			<text
				x={pos.x}
				y={pos.y}
				text-anchor="middle"
				dominant-baseline="central"
				class="hour-number"
			>
				{n}
			</text>
		{/each}
	</g>

	<!-- 針 -->
	<g class="hands">
		<!-- 時針 -->
		<line
			x1={CX}
			y1={CY}
			x2={CX}
			y2={CY - R_HOUR_HAND}
			stroke="var(--color-hand-hour)"
			stroke-width="9"
			stroke-linecap="round"
			transform="rotate({hourAngle} {CX} {CY})"
			class="hand hand-hour"
		/>
		<!-- 分針 -->
		<line
			x1={CX}
			y1={CY}
			x2={CX}
			y2={CY - R_MINUTE_HAND}
			stroke="var(--color-hand-minute)"
			stroke-width="5"
			stroke-linecap="round"
			transform="rotate({minuteAngle} {CX} {CY})"
			class="hand hand-minute"
		/>
		<!-- 秒針 -->
		<line
			x1={CX}
			y1={CY + R_SECOND_TAIL}
			x2={CX}
			y2={CY - R_SECOND_HAND}
			stroke="var(--color-hand-second)"
			stroke-width="2"
			stroke-linecap="round"
			transform="rotate({secondAngle} {CX} {CY})"
			class="hand hand-second"
		/>
		<!-- 中心ピボット -->
		<circle cx={CX} cy={CY} r="7" fill="var(--color-pivot)" />
		<circle cx={CX} cy={CY} r="3" fill="var(--color-hand-second)" />
	</g>
</svg>

<style>
	.clock {
		/* ダッシュボードレイアウト用：親カラム幅・viewport 縦・上限 560px の
		   いちばん小さいものに追従。縦スクロールを出さないのが最優先。 */
		width: 100%;
		max-width: min(560px, 80vh, 86vw);
		height: auto;
		display: block;
	}

	.arc {
		stroke: rgba(0, 0, 0, 0.25);
		stroke-width: 0.5;
		transition: opacity 0.5s ease;
	}

	/* 済みコマ：かなり薄く、塗り色もそのまま */
	.arc-past {
		opacity: 0.22;
	}

	/* これからのコマ：通常濃度 */
	.arc-future {
		opacity: 1;
	}

	/* 現在コマ：経過部分は薄め（使った時間の感覚）、残りは濃く＋グロー */
	.arc-current-elapsed {
		opacity: 0.45;
	}

	.arc-current-remaining {
		opacity: 1;
		filter: drop-shadow(0 0 8px var(--mc-accent-glow));
	}

	/* 現在コマ全体の外枠：ミッションパネルと色を揃えて赤の縁取り＋グロー */
	.arc-current-base {
		stroke: var(--mc-accent);
		stroke-width: 2.5;
		fill: none;
		filter: drop-shadow(0 0 4px var(--mc-accent-glow));
	}

	.period-label {
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.02em;
		pointer-events: none;
		user-select: none;
		transition: opacity 0.5s ease;
	}

	.label-past {
		fill: rgba(255, 255, 255, 0.35);
	}

	.label-future {
		fill: rgba(255, 255, 255, 0.9);
	}

	.label-current {
		fill: #fff;
		font-weight: 700;
	}

	.hour-number {
		fill: var(--color-fg-muted);
		font-size: 20px;
		font-weight: 500;
		font-family: var(--font-sans);
		font-variant-numeric: tabular-nums;
		user-select: none;
	}

	/* 針は rAF で毎フレーム角度を更新するのでスムーズに見える。
	   CSS transition を掛けると 11:59:59 → 12:00:00 の 359.99° → 0° 周回で
	   「360° 逆回転」アニメが再生されてしまうので、意図的に外してある。 */
</style>
