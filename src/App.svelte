<script lang="ts">
	import type { Component } from "svelte";
	import AnalogClock from "$lib/components/AnalogClock.svelte";
	import SunMoonDial from "$lib/components/SunMoonDial.svelte";
	import Timeline from "$lib/components/Timeline.svelte";
	import { backgroundGradient } from "$lib/daytime";
	import { PERIODS } from "$lib/schedule";
	import { timeStore } from "$lib/time.svelte";

	// DevPanel は dev ビルドでのみ dynamic-import される。
	// `import.meta.env.DEV` が本番ビルド時に false に置換され、
	// rollup/rolldown が import() 呼び出しごと DevPanel チャンクを落とす。
	let DevPanel = $state<Component | null>(null);
	if (import.meta.env.DEV) {
		import("$lib/components/DevPanel.svelte").then((m) => {
			DevPanel = m.default as unknown as Component;
		});
	}

	$effect(() => {
		let raf = 0;
		const tick = () => {
			timeStore.tickReal();
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	const now = $derived(timeStore.now);
	const isWeekend = $derived.by(() => {
		const d = now.getDay();
		return d === 0 || d === 6;
	});
	const bg = $derived(backgroundGradient(now));
	const bgStyle = $derived(
		`background: linear-gradient(to bottom, ${bg.top} 0%, ${bg.bottom} 100%);`,
	);
</script>

<main class="page" style={bgStyle}>
	<!-- ─── トップバー：左にタイトル、右にサブダイヤル ─── -->
	<header class="top-bar">
		<div class="title-block">
			<h1>時間割時計</h1>
			<p>月〜金 / 8:50 – 19:40</p>
		</div>
		<div class="dial-holder">
			<SunMoonDial {now} />
		</div>
	</header>

	<!-- ─── ダッシュボード：広い画面では時計とミッション卓を左右並列、
	     狭い画面では縦に積む。土日は mission-col を畳んで時計を中央へ寄せる。
	     mission-col は常に DOM に置いたまま CSS で畳み、grid-template-columns
	     のトランジションで 2↔1 カラムの切替が連続的に補間される。 ─── -->
	<div class="dashboard" class:two-col={!isWeekend}>
		<section class="clock-col">
			<AnalogClock {now} periods={PERIODS} />
		</section>
		<section class="mission-col">
			<Timeline {now} />
		</section>
	</div>
</main>

{#if DevPanel}
	{@const Cmp = DevPanel}
	<Cmp />
{/if}

<style>
	.page {
		position: relative;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: center;
		gap: 1rem;
		padding: 1rem 1.25rem max(1rem, env(safe-area-inset-bottom));
		color: var(--color-fg);
		transition: background 2s linear;
	}

	/* ─── トップバー ─── */
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	/* 広い画面ではトップバーをビューポート上端に絶対配置する。
	   これでダッシュボードがトップバーの高さに押し下げられず、
	   ページ全体の正確な縦中央に来る。 */
	@media (min-width: 980px) {
		.top-bar {
			position: absolute;
			top: max(1rem, env(safe-area-inset-top));
			left: 1.25rem;
			right: 1.25rem;
			z-index: 5;
			pointer-events: none;
		}
		.top-bar > * {
			pointer-events: auto;
		}
	}

	.title-block {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
	}

	.title-block h1 {
		margin: 0;
		font-size: clamp(1.2rem, 2.4vw, 1.6rem);
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.title-block p {
		margin: 0.2rem 0 0;
		color: var(--color-fg-subtle);
		font-size: 0.82rem;
		letter-spacing: 0.06em;
		font-variant-numeric: tabular-nums;
	}

	.dial-holder {
		padding: 0.4rem 0.65rem;
		border-radius: 14px;
		background: rgba(0, 0, 0, 0.28);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	/* ─── ダッシュボード本体 ─── */
	.dashboard {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
		align-items: center;
		justify-items: center;
		min-height: 0;
		width: 100%;
	}

	.clock-col,
	.mission-col {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.clock-col {
		max-width: 640px;
	}

	.mission-col {
		max-width: 720px;
	}

	/* ─── 広い画面：2 カラム並列（平日）⇔ 1 カラム（土日）を滑らかに遷移 ─── */
	@media (min-width: 980px) {
		.dashboard {
			grid-template-columns: 1fr 0fr;
			gap: 0;
			justify-items: stretch;
			padding: 0 0.25rem;
			transition:
				grid-template-columns 0.55s cubic-bezier(0.4, 0, 0.2, 1),
				gap 0.4s ease;
		}

		.dashboard.two-col {
			grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr);
			gap: 1.5rem;
		}

		.clock-col,
		.mission-col {
			max-width: none;
			padding: 0 0.5rem;
		}

		.mission-col {
			overflow: hidden;
			opacity: 0;
			transition: opacity 0.4s ease;
		}

		.dashboard.two-col .mission-col {
			opacity: 1;
		}
	}
</style>
