import type { Period } from "./schedule";

export type PeriodState = "past" | "current" | "future" | "inactive";

function nowSecOfDay(now: Date): number {
	return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

/** 平日基準で、このコマが今から見て「済み／現在／これから」のどれか。土日は inactive。 */
export function periodState(period: Period, now: Date): PeriodState {
	const day = now.getDay();
	if (day === 0 || day === 6) return "inactive";
	const t = nowSecOfDay(now);
	const startSec = period.startMin * 60;
	const endSec = period.endMin * 60;
	if (t < startSec) return "future";
	if (t < endSec) return "current";
	return "past";
}

/** 現在コマの進捗率 [0, 1]。コマ外の時刻については境界に丸める（呼び出し側は state=current 前提）。 */
export function periodProgress(period: Period, now: Date): number {
	const t = nowSecOfDay(now);
	const startSec = period.startMin * 60;
	const endSec = period.endMin * 60;
	if (t <= startSec) return 0;
	if (t >= endSec) return 1;
	return (t - startSec) / (endSec - startSec);
}

/**
 * 24 時間サブダイヤル上での太陽の角度（12 時位置=0°、CW）。
 * 正午=0°（真上）、日没 18 時=270°（左）、真夜中=180°（真下）、日の出 6 時=90°（右）。
 * 北半球で東の地平線から昇り西へ沈む動きをそのまま時計盤に写像。
 */
export function sunAngle(now: Date): number {
	const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
	const angle = (12 - h) * 15;
	return ((angle % 360) + 360) % 360;
}

/** 太陽が地平線より上かどうか（サブダイヤルで太陽 or 月の描き分けに使う）。 */
export function isDaytime(now: Date): boolean {
	const h = now.getHours() + now.getMinutes() / 60;
	return h >= 6 && h < 18;
}

type RGB = { r: number; g: number; b: number };

const rgb = (r: number, g: number, b: number): RGB => ({ r, g, b });

// 時刻ごとに (top, bottom) の色を定義。上が空、下が地面/遠景のイメージ。
// 24 時で 0 時と同色に戻してループさせる。
const KEYFRAMES: readonly { h: number; top: RGB; bottom: RGB }[] = [
	{ h: 0, top: rgb(8, 10, 26), bottom: rgb(14, 16, 34) }, // 真夜中
	{ h: 5, top: rgb(20, 14, 40), bottom: rgb(42, 28, 58) }, // 夜明け前
	{ h: 7, top: rgb(56, 36, 70), bottom: rgb(110, 64, 72) }, // 夜明け
	{ h: 10, top: rgb(44, 70, 110), bottom: rgb(90, 124, 160) }, // 朝
	{ h: 13, top: rgb(46, 84, 140), bottom: rgb(112, 148, 180) }, // 正午
	{ h: 16, top: rgb(58, 82, 122), bottom: rgb(176, 136, 104) }, // 午後
	{ h: 18, top: rgb(90, 50, 82), bottom: rgb(200, 114, 68) }, // 夕焼け
	{ h: 20, top: rgb(36, 24, 58), bottom: rgb(50, 30, 60) }, // 宵闇
	{ h: 24, top: rgb(8, 10, 26), bottom: rgb(14, 16, 34) }, // 再び真夜中
];

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
	return {
		r: Math.round(lerp(a.r, b.r, t)),
		g: Math.round(lerp(a.g, b.g, t)),
		b: Math.round(lerp(a.b, b.b, t)),
	};
}

function hex({ r, g, b }: RGB): string {
	const h = (v: number) => v.toString(16).padStart(2, "0");
	return `#${h(r)}${h(g)}${h(b)}`;
}

/** 時刻に応じた背景グラデーション色（上部・下部）。線形補間でなめらかに変化する。 */
export function backgroundGradient(now: Date): { top: string; bottom: string } {
	const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
	for (let i = 0; i < KEYFRAMES.length - 1; i++) {
		const a = KEYFRAMES[i];
		const b = KEYFRAMES[i + 1];
		if (!a || !b) continue;
		if (h >= a.h && h < b.h) {
			const t = (h - a.h) / (b.h - a.h);
			return {
				top: hex(lerpRGB(a.top, b.top, t)),
				bottom: hex(lerpRGB(a.bottom, b.bottom, t)),
			};
		}
	}
	// h が範囲外（24 以上）は理論上起きない。万一来たら最終キーフレームへ倒す。
	const last = KEYFRAMES[KEYFRAMES.length - 1];
	if (!last) throw new Error("KEYFRAMES must not be empty");
	return { top: hex(last.top), bottom: hex(last.bottom) };
}
