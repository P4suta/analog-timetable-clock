import { PERIODS, type Period } from "./schedule";

export type EventKind = "class" | "lunch" | "break";

export type TimelineEvent = {
	key: string;
	kind: EventKind;
	label: string;
	startMin: number;
	endMin: number;
};

/** PERIODS の隙間に 10 分休憩を挿入した完全なイベント列を作る。 */
function buildEvents(periods: readonly Period[]): TimelineEvent[] {
	const out: TimelineEvent[] = [];
	for (let i = 0; i < periods.length; i++) {
		const p = periods[i];
		if (!p) continue;
		out.push({
			key: p.key,
			kind: p.kind,
			label: p.label,
			startMin: p.startMin,
			endMin: p.endMin,
		});
		const next = periods[i + 1];
		if (next && next.startMin > p.endMin) {
			out.push({
				key: `break-${p.key}`,
				kind: "break",
				label: "休憩",
				startMin: p.endMin,
				endMin: next.startMin,
			});
		}
	}
	return out;
}

export const EVENTS: readonly TimelineEvent[] = buildEvents(PERIODS);

// 学校時間の境界。PERIODS が空なら timeline 自体が意味をなさないので throw。
const FIRST = PERIODS[0];
const LAST = PERIODS[PERIODS.length - 1];
if (!FIRST || !LAST) throw new Error("PERIODS must not be empty");
export const SCHOOL_START_MIN = FIRST.startMin;
export const SCHOOL_END_MIN = LAST.endMin;

function nowSecOfDay(now: Date): number {
	return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function isWeekend(now: Date): boolean {
	const d = now.getDay();
	return d === 0 || d === 6;
}

export type ActiveEvent = {
	event: TimelineEvent;
	progress: number; // [0, 1]
	remainingSec: number;
};

/** 現在進行中のイベント（コマ／昼休み／休憩）。土日や学校時間外は null。 */
export function activeEvent(now: Date): ActiveEvent | null {
	if (isWeekend(now)) return null;
	const t = nowSecOfDay(now);
	for (const e of EVENTS) {
		const s = e.startMin * 60;
		const en = e.endMin * 60;
		if (t >= s && t < en) {
			return {
				event: e,
				progress: (t - s) / (en - s),
				remainingSec: en - t,
			};
		}
	}
	return null;
}

/** 現在＋これからのイベントを時系列順に最大 limit 件。土日は空配列。 */
export function upcomingEvents(now: Date, limit = 3): TimelineEvent[] {
	if (isWeekend(now)) return [];
	const t = nowSecOfDay(now);
	const out: TimelineEvent[] = [];
	for (const e of EVENTS) {
		if (e.endMin * 60 > t) {
			out.push(e);
			if (out.length >= limit) break;
		}
	}
	return out;
}

/** 今日の学校終了時刻（SCHOOL_END_MIN）までの残り秒。負なら 0。土日は 0。 */
export function untilSchoolEndSec(now: Date): number {
	if (isWeekend(now)) return 0;
	const t = nowSecOfDay(now);
	return Math.max(0, SCHOOL_END_MIN * 60 - t);
}

export type EventState = "complete" | "active" | "pending";

/** 各イベントが今から見て 完了/実行中/未着手 のどれか。土日は一律 pending。 */
export function eventState(ev: TimelineEvent, now: Date): EventState {
	if (isWeekend(now)) return "pending";
	const t = nowSecOfDay(now);
	if (t >= ev.endMin * 60) return "complete";
	if (t >= ev.startMin * 60) return "active";
	return "pending";
}

/** 指定イベントの開始までの秒（まだ未着手でなければ 0）。 */
export function untilEventStartSec(ev: TimelineEvent, now: Date): number {
	const t = nowSecOfDay(now);
	return Math.max(0, ev.startMin * 60 - t);
}

export type DayPhase = "weekend" | "before" | "during" | "after";

export function dayPhase(now: Date): DayPhase {
	if (isWeekend(now)) return "weekend";
	const t = nowSecOfDay(now);
	if (t < SCHOOL_START_MIN * 60) return "before";
	if (t >= SCHOOL_END_MIN * 60) return "after";
	return "during";
}

/**
 * 学校時間軸上での現在位置を [0, 1] で返す（一日バーの「今」マーカー用）。
 * 学校時間前は 0、学校時間後は 1 にクランプ。
 */
export function nowProgressInDay(now: Date): number {
	const t = nowSecOfDay(now);
	const startSec = SCHOOL_START_MIN * 60;
	const endSec = SCHOOL_END_MIN * 60;
	if (t <= startSec) return 0;
	if (t >= endSec) return 1;
	return (t - startSec) / (endSec - startSec);
}
