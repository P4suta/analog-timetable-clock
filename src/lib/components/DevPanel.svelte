<script lang="ts">
	import { timeStore } from "$lib/time.svelte";

	const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

	let collapsed = $state(false);

	// パネルの表示/折畳みは localStorage に永続化（リロード後も保持）
	if (typeof localStorage !== "undefined") {
		const saved = localStorage.getItem("devpanel.collapsed");
		if (saved === "1") collapsed = true;
	}
	$effect(() => {
		if (typeof localStorage !== "undefined") {
			localStorage.setItem("devpanel.collapsed", collapsed ? "1" : "0");
		}
	});

	const now = $derived(timeStore.now);

	const dateLabel = $derived.by(() => {
		const y = now.getFullYear();
		const mo = String(now.getMonth() + 1).padStart(2, "0");
		const d = String(now.getDate()).padStart(2, "0");
		const w = WEEKDAYS[now.getDay()] ?? "?";
		return `${y}-${mo}-${d} (${w})`;
	});

	const timeLabel = $derived.by(() => {
		const h = String(now.getHours()).padStart(2, "0");
		const m = String(now.getMinutes()).padStart(2, "0");
		const s = String(now.getSeconds()).padStart(2, "0");
		return `${h}:${m}:${s}`;
	});

	// スライダ：0〜1439 分（一日の通算分）
	const minOfDay = $derived(now.getHours() * 60 + now.getMinutes());

	function onSlider(e: Event) {
		const v = Number((e.target as HTMLInputElement).value);
		const h = Math.floor(v / 60);
		const m = v % 60;
		timeStore.setTimeOfDay(h, m, 0);
	}

	// プリセット（ラベル・時・分・曜日ターゲット）
	// 曜日が null なら曜日を変えず現在の仮想時刻の日付に重ねる
	type Preset = {
		label: string;
		h: number;
		m: number;
		day?: number;
	};
	const PRESETS: Preset[] = [
		{ label: "朝 7:00", h: 7, m: 0, day: 1 },
		{ label: "1限直前 8:49", h: 8, m: 49, day: 1 },
		{ label: "1限中盤 9:35", h: 9, m: 35, day: 1 },
		{ label: "1-2限 休憩 10:25", h: 10, m: 25, day: 1 },
		{ label: "昼 12:30", h: 12, m: 30, day: 1 },
		{ label: "3限開始 13:10", h: 13, m: 10, day: 1 },
		{ label: "6限終了寸前 19:39", h: 19, m: 39, day: 1 },
		{ label: "放課後 20:00", h: 20, m: 0, day: 1 },
		{ label: "土 10:00", h: 10, m: 0, day: 6 },
	];

	function applyPreset(p: Preset) {
		const d = new Date(now);
		if (p.day !== undefined) {
			const diff = p.day - d.getDay();
			d.setDate(d.getDate() + diff);
		}
		d.setHours(p.h, p.m, 0, 0);
		timeStore.setOverride(d);
	}

	// キーボードショートカット
	$effect(() => {
		const handler = (e: KeyboardEvent) => {
			// テキスト入力中は無視
			const tag = (e.target as HTMLElement | null)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;

			if (e.key === "~" || (e.key === "d" && (e.ctrlKey || e.metaKey))) {
				e.preventDefault();
				collapsed = !collapsed;
			} else if (!collapsed) {
				if (e.key === " " || e.key === "p") {
					e.preventDefault();
					timeStore.togglePause();
				} else if (e.key === "r") {
					e.preventDefault();
					timeStore.reset();
				} else if (e.key === "ArrowLeft") {
					e.preventDefault();
					timeStore.advanceBy(e.shiftKey ? -60 * 15 : -60);
				} else if (e.key === "ArrowRight") {
					e.preventDefault();
					timeStore.advanceBy(e.shiftKey ? 60 * 15 : 60);
				}
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	});
</script>

<aside class="devpanel" class:collapsed aria-label="開発者パネル">
	{#if collapsed}
		<button
			type="button"
			class="toggle toggle-collapsed"
			onclick={() => (collapsed = false)}
			title="開発パネルを開く (Ctrl+D)"
		>
			🔧
			{#if timeStore.isOverriding}<span class="override-pip"></span>{/if}
		</button>
	{:else}
		<header class="head">
			<span class="badge">DEV</span>
			<span class="title">時刻デバッグ</span>
			<button
				type="button"
				class="toggle"
				onclick={() => (collapsed = true)}
				title="たたむ (Ctrl+D)"
				aria-label="たたむ"
			>
				—
			</button>
		</header>

		<div class="readout">
			<span class="date">{dateLabel}</span>
			<span class="time">{timeLabel}</span>
			{#if timeStore.isPaused}
				<span class="flag flag-paused">⏸ PAUSED</span>
			{:else if timeStore.isOverriding}
				<span class="flag flag-override">● OVERRIDE</span>
			{:else}
				<span class="flag flag-real">● REAL</span>
			{/if}
		</div>

		<div class="row">
			<button
				type="button"
				class="btn"
				onclick={() => timeStore.reset()}
				disabled={!timeStore.isOverriding}
				title="リアルタイムに戻す (R)"
			>
				⟲ Real
			</button>
			<button
				type="button"
				class="btn"
				onclick={() => timeStore.togglePause()}
				title="一時停止/再開 (Space)"
			>
				{timeStore.isPaused ? "▶ 再開" : "⏸ 停止"}
			</button>
		</div>

		<div class="section-label">曜日</div>
		<div class="day-row">
			{#each WEEKDAYS as w, i (w)}
				<button
					type="button"
					class="day-btn"
					class:active={now.getDay() === i}
					onclick={() => timeStore.setDayOfWeek(i)}
				>
					{w}
				</button>
			{/each}
		</div>

		<div class="section-label">時刻 ({timeLabel})</div>
		<input
			type="range"
			min="0"
			max="1439"
			step="1"
			value={minOfDay}
			oninput={onSlider}
			class="slider"
			aria-label="時刻スライダ"
		/>

		<div class="step-row">
			<button
				type="button"
				class="btn btn-small"
				onclick={() => timeStore.advanceBy(-60 * 15)}
				title="-15 分 (Shift+←)">-15m</button
			>
			<button
				type="button"
				class="btn btn-small"
				onclick={() => timeStore.advanceBy(-60)}
				title="-1 分 (←)">-1m</button
			>
			<button
				type="button"
				class="btn btn-small"
				onclick={() => timeStore.advanceBy(-10)}>-10s</button
			>
			<button
				type="button"
				class="btn btn-small"
				onclick={() => timeStore.advanceBy(10)}>+10s</button
			>
			<button
				type="button"
				class="btn btn-small"
				onclick={() => timeStore.advanceBy(60)}
				title="+1 分 (→)">+1m</button
			>
			<button
				type="button"
				class="btn btn-small"
				onclick={() => timeStore.advanceBy(60 * 15)}
				title="+15 分 (Shift+→)">+15m</button
			>
		</div>

		<div class="section-label">プリセット</div>
		<div class="preset-grid">
			{#each PRESETS as p (p.label)}
				<button
					type="button"
					class="btn btn-preset"
					onclick={() => applyPreset(p)}
				>
					{p.label}
				</button>
			{/each}
		</div>

		<div class="hint">
			Ctrl+D: 開閉・Space: 停止・← →: ±1 分・Shift+← →: ±15 分・R: real
		</div>
	{/if}
</aside>

<style>
	.devpanel {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		z-index: 100;
		color: #e8ecf7;
		font-family: var(--font-sans);
		font-size: 0.85rem;
	}

	.devpanel:not(.collapsed) {
		width: min(320px, calc(100vw - 2rem));
		background: rgba(12, 14, 28, 0.88);
		border: 1px dashed rgba(255, 255, 255, 0.25);
		border-radius: 10px;
		padding: 0.65rem 0.8rem;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.badge {
		padding: 0.05rem 0.4rem;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		background: #ff8a3d;
		color: #1a0d05;
		border-radius: 3px;
	}

	.title {
		font-weight: 600;
		font-size: 0.85rem;
	}

	.toggle {
		margin-left: auto;
		width: 26px;
		height: 22px;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 5px;
		color: inherit;
		cursor: pointer;
		font-size: 0.9rem;
		line-height: 1;
		padding: 0;
	}

	.toggle:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.toggle-collapsed {
		position: relative;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		font-size: 1.1rem;
		background: rgba(12, 14, 28, 0.85);
		border: 1px dashed rgba(255, 255, 255, 0.3);
		backdrop-filter: blur(6px);
	}

	.override-pip {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 8px;
		height: 8px;
		background: #ff8a3d;
		border-radius: 50%;
		box-shadow: 0 0 6px #ff8a3d;
	}

	.readout {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
		font-variant-numeric: tabular-nums;
	}

	.date {
		font-family: var(--font-mono);
		color: rgba(232, 236, 247, 0.7);
	}

	.time {
		font-family: var(--font-mono);
		font-size: 1.05rem;
		font-weight: 600;
	}

	.flag {
		margin-left: auto;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
	}

	.flag-real {
		background: rgba(76, 175, 80, 0.2);
		color: #8ee592;
	}

	.flag-override {
		background: rgba(255, 138, 61, 0.2);
		color: #ffb07f;
	}

	.flag-paused {
		background: rgba(244, 67, 54, 0.25);
		color: #ff9f96;
	}

	.section-label {
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		color: rgba(232, 236, 247, 0.55);
		margin-top: 0.1rem;
	}

	.row,
	.step-row {
		display: flex;
		gap: 0.35rem;
	}

	.step-row {
		flex-wrap: wrap;
	}

	.btn {
		flex: 1;
		padding: 0.35rem 0.5rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 5px;
		color: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		font-variant-numeric: tabular-nums;
	}

	.btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.14);
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-small {
		padding: 0.25rem 0.4rem;
		font-size: 0.75rem;
		flex: 1 1 45px;
	}

	.day-row {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.2rem;
	}

	.day-btn {
		padding: 0.3rem 0;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 5px;
		color: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		text-align: center;
	}

	.day-btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.day-btn.active {
		background: rgba(255, 138, 61, 0.3);
		border-color: #ff8a3d;
		color: #ffd7bb;
	}

	.slider {
		width: 100%;
		accent-color: #ff8a3d;
	}

	.preset-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.25rem;
	}

	.btn-preset {
		font-size: 0.72rem;
		padding: 0.28rem 0.4rem;
		text-align: left;
	}

	.hint {
		font-size: 0.65rem;
		color: rgba(232, 236, 247, 0.45);
		line-height: 1.4;
		letter-spacing: 0.01em;
	}
</style>
