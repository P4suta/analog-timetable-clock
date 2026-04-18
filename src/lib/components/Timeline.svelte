<script lang="ts">
	import { formatCountdown, formatMinOfDay, pad2 } from "$lib/format";
	import {
		activeEvent,
		dayPhase,
		EVENTS,
		eventState,
		nowProgressInDay,
		SCHOOL_END_MIN,
		SCHOOL_START_MIN,
		type TimelineEvent,
		untilEventStartSec,
		untilSchoolEndSec,
	} from "$lib/timeline";

	type Props = { now: Date };
	let { now }: Props = $props();

	const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

	const phase = $derived(dayPhase(now));
	const active = $derived(activeEvent(now));
	const untilEnd = $derived(untilSchoolEndSec(now));
	const nowFrac = $derived(nowProgressInDay(now));

	const SCHOOL_SPAN = SCHOOL_END_MIN - SCHOOL_START_MIN;
	const STRIP_W = 1000;

	function xOf(min: number): number {
		return ((min - SCHOOL_START_MIN) / SCHOOL_SPAN) * STRIP_W;
	}

	const missionDateLabel = $derived.by(() => {
		const y = now.getFullYear();
		const mo = pad2(now.getMonth() + 1);
		const d = pad2(now.getDate());
		const w = WEEKDAYS[now.getDay()] ?? "???";
		return `${y}-${mo}-${d} ${w}`;
	});

	const missionTimeLabel = $derived.by(() => {
		return `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
	});

	const activeIndex = $derived.by(() => {
		if (!active) return -1;
		return EVENTS.findIndex((e) => e.key === active.event.key);
	});

	const elapsedSec = $derived.by(() => {
		if (!active) return 0;
		return (
			(active.event.endMin - active.event.startMin) * 60 -
			active.remainingSec
		);
	});

	const activeDurationSec = $derived.by(() => {
		if (!active) return 0;
		return (active.event.endMin - active.event.startMin) * 60;
	});

	// ───── カウントダウン演出：残り秒数でフェーズを切り替え ─────
	//   > 60s  : normal（テレメトリ色）
	//   60〜10s: critical（アンバーでゆっくり点滅）
	//   < 10s  : imminent（赤で高速点滅＋専用バナー表示）
	const remaining = $derived(active?.remainingSec ?? Number.POSITIVE_INFINITY);
	const isCritical = $derived(remaining > 0 && remaining < 60);
	const isImminent = $derived(remaining > 0 && remaining < 10);

	// NEXT までの秒（STANDBY フェーズのカウントダウン用）
	const untilFirstStageSec = $derived.by(() => {
		const first = EVENTS[0];
		if (!first) return 0;
		const t = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
		return Math.max(0, first.startMin * 60 - t);
	});

	// 完了数／全体（ミッション進捗）
	const completeCount = $derived(
		EVENTS.filter((e) => eventState(e, now) === "complete").length,
	);

	function rightInfoForPending(ev: TimelineEvent): string {
		return `T-${formatCountdown(untilEventStartSec(ev, now))}`;
	}

	function statusGlyph(state: "complete" | "active" | "pending"): string {
		if (state === "complete") return "✓";
		if (state === "active") return "▶";
		return "·";
	}

	function statusLabel(
		state: "complete" | "active" | "pending",
		ev: TimelineEvent,
	): string {
		if (state === "complete") return "COMPLETE";
		if (state === "active") return "ACTIVE";
		return rightInfoForPending(ev);
	}
</script>

{#if phase !== "weekend"}
	<section
		class="mission"
		class:is-live={phase === "during"}
		class:is-imminent={isImminent}
		aria-label="本日のスケジュール"
	>
		<!-- 計器盤コーナーマーカー -->
		<span class="corner corner-tl" aria-hidden="true"></span>
		<span class="corner corner-tr" aria-hidden="true"></span>
		<span class="corner corner-bl" aria-hidden="true"></span>
		<span class="corner corner-br" aria-hidden="true"></span>

		<!-- ────── ヘッダ ────── -->
		<header class="mc-head">
			<span class="mc-head-left">
				<span class="mc-head-tag">SCHEDULE</span>
				<span class="mc-sep">·</span>
				<span class="mc-head-date">{missionDateLabel}</span>
				<span class="mc-sep">·</span>
				<span class="mc-head-time">{missionTimeLabel}</span>
			</span>
			<span class="mc-head-right">
				{#if phase === "during"}
					<span class="mc-status mc-status-live">● LIVE</span>
				{:else if phase === "before"}
					<span class="mc-status mc-status-standby">○ STANDBY</span>
				{:else}
					<span class="mc-status mc-status-done">● DAY COMPLETE</span>
				{/if}
			</span>
		</header>

		<!-- ────── アクティブステージ（実行中のみ） ────── -->
		{#if active}
			<div
				class="active-stage"
				class:critical={isCritical}
				class:imminent={isImminent}
			>
				<div class="active-meta">
					<span class="stage-num">SLOT {pad2(activeIndex + 1)}</span>
					<span class="stage-tag">[▶ ACTIVE]</span>
					<span class="stage-name name-{active.event.kind}">
						{active.event.label}
					</span>
				</div>

				<div class="active-range">
					{formatMinOfDay(active.event.startMin)} → {formatMinOfDay(
						active.event.endMin,
					)}
				</div>

				<div
					class="mc-bar"
					role="progressbar"
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuenow={Math.floor(active.progress * 100)}
				>
					<div
						class="mc-bar-fill"
						style:width="{active.progress * 100}%"
					></div>
					<div class="mc-bar-ticks">
						{#each Array.from({ length: 10 }, (_, i) => i) as i (i)}
							<span class="mc-tick"></span>
						{/each}
					</div>
					<!-- バー上を左右にスキャンするスキャンライン -->
					<div class="mc-bar-scan" aria-hidden="true"></div>
				</div>

				<div class="active-telemetry">
					<div class="tel">
						<span class="k">T+</span>
						<span class="v">{formatCountdown(elapsedSec)}</span>
					</div>
					<div class="tel tel-minus">
						<span class="k">T-</span>
						<span class="v">{formatCountdown(active.remainingSec)}</span>
					</div>
					<div class="tel">
						<span class="k">PROGRESS</span>
						<span class="v">{pad2(Math.floor(active.progress * 100))}%</span>
					</div>
					<div class="tel">
						<span class="k">DUR</span>
						<span class="v">{formatCountdown(activeDurationSec)}</span>
					</div>
				</div>

				{#if isImminent}
					<div class="imminent-banner" role="status">
						<span class="imminent-pip"></span>
						<span class="imminent-text">ENDING IN</span>
						<span class="imminent-count">T-{formatCountdown(active.remainingSec)}</span>
					</div>
				{/if}
			</div>
		{:else if phase === "before"}
			<div class="pre-mission">
				<span class="pre-label">T-</span>
				<span class="pre-count">{formatCountdown(untilFirstStageSec)}</span>
				<span class="pre-foot">OPENING SLOT · 1限</span>
			</div>
		{/if}

		<!-- ────── シーケンス ────── -->
		<div class="sequence">
			<div class="sect-head">
				<span>SEQUENCE</span>
				<span class="sect-count">
					{pad2(completeCount)} / {pad2(EVENTS.length)} COMPLETE
				</span>
			</div>
			<ol class="seq-list">
				{#each EVENTS as ev, i (ev.key)}
					{@const state = eventState(ev, now)}
					<li class="seq-item seq-{state}">
						<span class="seq-num">{pad2(i + 1)}</span>
						<span class="seq-gly">{statusGlyph(state)}</span>
						<span class="seq-name name-{ev.kind}">{ev.label}</span>
						<span class="seq-range">
							{formatMinOfDay(ev.startMin)} – {formatMinOfDay(ev.endMin)}
						</span>
						<span class="seq-info">{statusLabel(state, ev)}</span>
					</li>
				{/each}
			</ol>
		</div>

		<!-- ────── フッター ────── -->
		<footer class="mc-foot">
			<span class="foot-label">
				{#if phase === "after"}
					DAY COMPLETE · {formatMinOfDay(SCHOOL_END_MIN)}
				{:else}
					DAY END · {formatMinOfDay(SCHOOL_END_MIN)}
				{/if}
			</span>
			{#if phase !== "after"}
				<span class="foot-count">T-{formatCountdown(untilEnd)}</span>
			{/if}
		</footer>

		<!-- ────── 下部ストリップ（一日の俯瞰 + NOW スキャンライン） ────── -->
		<div class="strip">
			<svg
				viewBox="0 0 {STRIP_W} 28"
				preserveAspectRatio="none"
				class="strip-svg"
				role="img"
				aria-label="一日の進行ストリップ"
			>
				<line
					x1="0"
					y1="14"
					x2={STRIP_W}
					y2="14"
					stroke="rgba(255,255,255,0.08)"
					stroke-width="0.5"
				/>

				{#each EVENTS as ev (ev.key)}
					{@const state = eventState(ev, now)}
					{@const x1 = xOf(ev.startMin)}
					{@const x2 = xOf(ev.endMin)}
					<rect
						x={x1}
						y={9}
						width={Math.max(x2 - x1, 0.5)}
						height={10}
						class="strip-seg strip-{ev.kind} state-{state}"
					/>
				{/each}

				{#each EVENTS as ev (`tk-${ev.key}`)}
					{@const x = xOf(ev.startMin)}
					<line
						x1={x}
						y1="4"
						x2={x}
						y2="24"
						stroke="rgba(255,255,255,0.35)"
						stroke-width="0.5"
					/>
				{/each}
				<line
					x1={STRIP_W}
					y1="4"
					x2={STRIP_W}
					y2="24"
					stroke="rgba(255,255,255,0.35)"
					stroke-width="0.5"
				/>

				{#if phase === "during"}
					{@const x = nowFrac * STRIP_W}
					<line x1={x} y1="0" x2={x} y2="28" class="strip-now" />
					<polygon
						points="{x - 5},0 {x + 5},0 {x},5"
						class="strip-now-tri"
					/>
				{/if}
			</svg>
			<div class="strip-labels">
				<span>{formatMinOfDay(SCHOOL_START_MIN)}</span>
				<span class="strip-dash"></span>
				<span>{formatMinOfDay(SCHOOL_END_MIN)}</span>
			</div>
		</div>
	</section>
{/if}

<style>
	.mission {
		width: 100%;
		padding: 0.95rem 1.05rem 0.85rem;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: var(--color-fg);
		font-variant-numeric: tabular-nums;
		background: linear-gradient(
			180deg,
			rgba(4, 6, 12, 0.85) 0%,
			rgba(10, 12, 22, 0.85) 100%
		);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 3px;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.04),
			0 4px 28px rgba(0, 0, 0, 0.35);
		position: relative;
		transition: box-shadow 0.4s ease, border-color 0.4s ease;
	}

	/* LIVE 中はパネル全体に薄いレッド枠とグロー */
	.mission.is-live {
		border-color: rgba(255, 46, 74, 0.28);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.04),
			0 4px 28px rgba(0, 0, 0, 0.35),
			0 0 22px rgba(255, 46, 74, 0.12);
	}

	/* IMMINENT 時はパネル枠全体をパルスさせる（T- < 10s） */
	.mission.is-imminent {
		animation: panel-imminent 0.42s ease-in-out infinite;
	}

	@keyframes panel-imminent {
		0%, 100% {
			box-shadow:
				inset 0 0 0 1px rgba(255, 255, 255, 0.04),
				0 4px 28px rgba(0, 0, 0, 0.35),
				0 0 22px rgba(255, 46, 74, 0.22);
		}
		50% {
			box-shadow:
				inset 0 0 0 1px rgba(255, 46, 74, 0.2),
				0 4px 28px rgba(0, 0, 0, 0.35),
				0 0 38px rgba(255, 46, 74, 0.55);
		}
	}

	/* ─── 四隅のコーナーマーカー（計器盤風） ─── */
	.corner {
		position: absolute;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 46, 74, 0.55);
		pointer-events: none;
	}
	.corner-tl {
		top: -1px;
		left: -1px;
		border-right: none;
		border-bottom: none;
	}
	.corner-tr {
		top: -1px;
		right: -1px;
		border-left: none;
		border-bottom: none;
	}
	.corner-bl {
		bottom: -1px;
		left: -1px;
		border-right: none;
		border-top: none;
	}
	.corner-br {
		bottom: -1px;
		right: -1px;
		border-left: none;
		border-top: none;
	}

	/* ============ ヘッダ ============ */
	.mc-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding-bottom: 0.5rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.mc-head-left {
		color: rgba(232, 236, 247, 0.6);
		display: inline-flex;
		align-items: baseline;
		gap: 0.45rem;
	}

	.mc-head-tag {
		color: var(--mc-telemetry);
		font-weight: 700;
		text-shadow: 0 0 8px var(--mc-telemetry-dim);
	}

	.mc-sep {
		color: rgba(232, 236, 247, 0.25);
	}

	.mc-head-date {
		color: rgba(232, 236, 247, 0.65);
	}

	.mc-head-time {
		color: #fff;
		font-weight: 700;
		letter-spacing: 0.06em;
	}

	.mc-status {
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.mc-status-live {
		color: var(--mc-accent);
		text-shadow: 0 0 10px var(--mc-accent-glow);
		animation: pulse-live 1.2s ease-in-out infinite;
	}

	.mc-status-standby {
		color: rgba(232, 236, 247, 0.5);
	}

	.mc-status-done {
		color: var(--mc-complete);
		text-shadow: 0 0 8px var(--mc-complete-glow);
	}

	@keyframes pulse-live {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* ============ アクティブステージ ============ */
	.active-stage {
		position: relative;
		padding: 0.65rem 0.75rem 0.7rem;
		background: rgba(255, 46, 74, 0.06);
		border: 1px solid rgba(255, 46, 74, 0.3);
		border-left: 3px solid var(--mc-accent);
		margin-bottom: 0.85rem;
		transition:
			background 0.3s ease,
			border-color 0.3s ease;
	}

	.active-stage.critical {
		background: rgba(255, 184, 0, 0.07);
		border-color: rgba(255, 184, 0, 0.4);
		border-left-color: var(--mc-warning);
	}

	.active-stage.imminent {
		background: rgba(255, 46, 74, 0.12);
		border-color: var(--mc-accent);
		border-left-color: var(--mc-accent);
		animation: stage-imminent 0.42s ease-in-out infinite;
	}

	@keyframes stage-imminent {
		0%, 100% { background: rgba(255, 46, 74, 0.12); }
		50% { background: rgba(255, 46, 74, 0.22); }
	}

	.active-meta {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(232, 236, 247, 0.55);
		margin-bottom: 0.2rem;
	}

	.stage-num {
		color: var(--mc-telemetry);
		opacity: 0.8;
	}

	.stage-tag {
		color: var(--mc-accent);
		font-weight: 700;
		text-shadow: 0 0 8px var(--mc-accent-glow);
	}

	.stage-name {
		margin-left: auto;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0;
		text-transform: none;
		color: #fff;
	}

	.active-range {
		color: rgba(232, 236, 247, 0.55);
		font-size: 0.78rem;
		margin-bottom: 0.6rem;
		letter-spacing: 0.04em;
	}

	.mc-bar {
		position: relative;
		height: 14px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		overflow: hidden;
		margin-bottom: 0.6rem;
	}

	.mc-bar-fill {
		position: absolute;
		inset: 0 auto 0 0;
		background: linear-gradient(
			90deg,
			rgba(255, 46, 74, 0.8) 0%,
			var(--mc-accent) 50%,
			var(--mc-accent-bright) 100%
		);
		box-shadow: 0 0 12px var(--mc-accent-glow);
	}

	.mc-bar-ticks {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		pointer-events: none;
	}

	.mc-tick {
		border-right: 1px solid rgba(0, 0, 0, 0.45);
	}

	.mc-tick:last-child {
		border-right: none;
	}

	/* バー上の左右スキャンライン */
	.mc-bar-scan {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent 0%,
			transparent 45%,
			rgba(64, 208, 255, 0.5) 50%,
			transparent 55%,
			transparent 100%
		);
		mix-blend-mode: screen;
		animation: bar-scan 3.2s linear infinite;
		pointer-events: none;
	}

	@keyframes bar-scan {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	.active-telemetry {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.3rem 0.8rem;
	}

	.tel {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		border-left: 1px solid rgba(64, 208, 255, 0.12);
		padding-left: 0.55rem;
	}

	.tel:first-child {
		border-left: none;
		padding-left: 0;
	}

	.tel .k {
		font-size: 0.6rem;
		letter-spacing: 0.15em;
		color: var(--mc-telemetry-dim);
		text-transform: uppercase;
	}

	.tel .v {
		font-size: 0.88rem;
		font-weight: 700;
		color: #fff;
	}

	/* T- のカウントダウン演出 */
	.active-stage.critical .tel-minus .v {
		color: var(--mc-warning);
		text-shadow: 0 0 10px rgba(255, 184, 0, 0.6);
		animation: t-critical 1s ease-in-out infinite;
	}

	.active-stage.imminent .tel-minus .v {
		color: var(--mc-accent);
		text-shadow: 0 0 14px var(--mc-accent);
		animation: t-imminent 0.42s ease-in-out infinite;
	}

	@keyframes t-critical {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.55; }
	}

	@keyframes t-imminent {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.7; transform: scale(1.06); }
	}

	/* IMMINENT バナー（T- < 10s） */
	.imminent-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.55rem;
		padding: 0.3rem 0.5rem;
		background: rgba(255, 46, 74, 0.18);
		border: 1px solid var(--mc-accent);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.72rem;
		animation: banner-blink 0.42s ease-in-out infinite;
	}

	@keyframes banner-blink {
		0%, 100% { background: rgba(255, 46, 74, 0.18); }
		50% { background: rgba(255, 46, 74, 0.38); }
	}

	.imminent-pip {
		width: 8px;
		height: 8px;
		background: var(--mc-accent);
		border-radius: 50%;
		box-shadow: 0 0 10px var(--mc-accent);
	}

	.imminent-text {
		color: #fff;
		font-weight: 700;
	}

	.imminent-count {
		margin-left: auto;
		color: #fff;
		font-weight: 900;
		font-size: 0.9rem;
		letter-spacing: 0.04em;
	}

	/* ============ STANDBY ============ */
	.pre-mission {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.55rem 0.75rem;
		border: 1px dashed rgba(64, 208, 255, 0.35);
		background: rgba(64, 208, 255, 0.04);
		margin-bottom: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.pre-label {
		font-size: 0.7rem;
		color: var(--mc-telemetry);
	}

	.pre-count {
		font-size: 1.15rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.02em;
	}

	.pre-foot {
		margin-left: auto;
		font-size: 0.7rem;
		color: rgba(232, 236, 247, 0.45);
	}

	/* ============ シーケンス ============ */
	.sequence {
		margin-bottom: 0.3rem;
	}

	.sect-head {
		display: flex;
		justify-content: space-between;
		font-size: 0.62rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--mc-telemetry-dim);
		padding-bottom: 0.25rem;
		margin-bottom: 0.3rem;
		border-bottom: 1px dashed rgba(64, 208, 255, 0.15);
	}

	.sect-count {
		color: rgba(232, 236, 247, 0.35);
	}

	.seq-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.seq-item {
		display: grid;
		grid-template-columns: 2.4rem 1rem 1fr auto 8ch;
		gap: 0.55rem;
		align-items: baseline;
		font-size: 0.78rem;
		padding: 0.08rem 0;
	}

	.seq-num {
		color: rgba(232, 236, 247, 0.3);
		font-size: 0.7rem;
		letter-spacing: 0.05em;
	}

	.seq-gly {
		text-align: center;
	}

	.seq-range {
		color: rgba(232, 236, 247, 0.5);
		font-size: 0.74rem;
	}

	.seq-info {
		text-align: right;
		font-size: 0.66rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(232, 236, 247, 0.3);
	}

	.seq-complete {
		color: rgba(232, 236, 247, 0.28);
	}

	.seq-complete .seq-gly {
		color: var(--mc-complete);
		opacity: 0.75;
		text-shadow: 0 0 5px var(--mc-complete-glow);
	}

	.seq-complete .seq-info {
		color: var(--mc-complete);
		opacity: 0.55;
	}

	.seq-complete .seq-range {
		color: rgba(232, 236, 247, 0.22);
	}

	.seq-pending {
		color: rgba(232, 236, 247, 0.75);
	}

	.seq-pending .seq-gly {
		color: var(--mc-telemetry-dim);
	}

	.seq-pending .seq-info {
		color: var(--mc-telemetry);
		opacity: 0.75;
	}

	.seq-active {
		color: #fff;
		background: rgba(255, 46, 74, 0.12);
		margin: 0 -0.35rem;
		padding: 0.22rem 0.35rem;
		box-shadow: inset 2px 0 0 var(--mc-accent);
	}

	.seq-active .seq-gly {
		color: var(--mc-accent);
		text-shadow: 0 0 10px var(--mc-accent-glow);
		animation: pulse-live 1.2s ease-in-out infinite;
	}

	.seq-active .seq-info {
		color: var(--mc-accent);
		font-weight: 700;
		text-shadow: 0 0 8px var(--mc-accent-glow);
	}

	.seq-active .seq-range {
		color: rgba(255, 255, 255, 0.7);
	}

	/* イベント種別で名前の色を微調整 */
	.name-class {
		color: inherit;
	}

	.name-lunch {
		color: var(--color-lunch);
	}

	.name-break {
		color: rgba(232, 236, 247, 0.5);
		letter-spacing: 0.05em;
	}

	/* ============ フッター ============ */
	.mc-foot {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding-top: 0.55rem;
		margin-top: 0.65rem;
		border-top: 1px solid rgba(255, 255, 255, 0.14);
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.foot-label {
		color: rgba(232, 236, 247, 0.45);
	}

	.foot-count {
		color: var(--mc-telemetry);
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-shadow: 0 0 8px var(--mc-telemetry-dim);
	}

	/* ============ 下部ストリップ ============ */
	.strip {
		margin-top: 0.7rem;
		padding-top: 0.55rem;
		border-top: 1px dashed rgba(64, 208, 255, 0.15);
	}

	.strip-svg {
		width: 100%;
		height: 28px;
		display: block;
		overflow: visible;
	}

	.strip-seg {
		stroke: rgba(0, 0, 0, 0.35);
		stroke-width: 0.5;
	}

	.strip-seg.strip-class {
		fill: var(--mc-accent);
	}

	.strip-seg.strip-lunch {
		fill: var(--color-lunch);
	}

	.strip-seg.strip-break {
		fill: rgba(64, 208, 255, 0.35);
	}

	.strip-seg.state-complete {
		opacity: 0.22;
	}

	.strip-seg.state-active {
		opacity: 1;
		filter: drop-shadow(0 0 6px var(--mc-accent-glow));
	}

	.strip-seg.state-pending {
		opacity: 0.85;
	}

	/* NOW 垂直ラインをスキャンラインっぽく明滅 */
	.strip-now {
		stroke: #fff;
		stroke-width: 1.5;
		animation: scanline 1.6s ease-in-out infinite;
	}

	@keyframes scanline {
		0%, 100% {
			filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.9));
			stroke: #fff;
		}
		50% {
			filter: drop-shadow(0 0 10px var(--mc-telemetry));
			stroke: var(--mc-telemetry);
		}
	}

	.strip-now-tri {
		fill: #fff;
	}

	.strip-labels {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.25rem;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: rgba(232, 236, 247, 0.4);
	}

	.strip-dash {
		flex: 1;
		height: 1px;
		margin: 0 0.5rem;
		border-top: 1px dashed rgba(255, 255, 255, 0.08);
	}

	/* prefers-reduced-motion：アニメ全部 off */
	@media (prefers-reduced-motion: reduce) {
		.mission.is-imminent,
		.active-stage.imminent,
		.active-stage.critical .tel-minus .v,
		.active-stage.imminent .tel-minus .v,
		.imminent-banner,
		.seq-active .seq-gly,
		.mc-status-live,
		.strip-now,
		.mc-bar-scan {
			animation: none !important;
		}
	}
</style>
