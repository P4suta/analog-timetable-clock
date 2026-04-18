import { describe, expect, it } from "vitest";
import {
	activeEvent,
	dayPhase,
	EVENTS,
	nowProgressInDay,
	SCHOOL_END_MIN,
	SCHOOL_START_MIN,
	untilSchoolEndSec,
	upcomingEvents,
} from "./timeline";

const mon = (h: number, m: number, s = 0) => new Date(2026, 3, 13, h, m, s);
const sat = (h: number, m: number) => new Date(2026, 3, 18, h, m, 0);

describe("EVENTS", () => {
	it("クラス 6 コマ + 昼 1 + 休憩 4 = 11 イベント", () => {
		expect(EVENTS).toHaveLength(11);
		expect(EVENTS.filter((e) => e.kind === "class")).toHaveLength(6);
		expect(EVENTS.filter((e) => e.kind === "lunch")).toHaveLength(1);
		expect(EVENTS.filter((e) => e.kind === "break")).toHaveLength(4);
	});

	it("イベントは時系列順で連続（隙間なし）", () => {
		for (let i = 1; i < EVENTS.length; i++) {
			const prev = EVENTS[i - 1];
			const curr = EVENTS[i];
			if (!prev || !curr) throw new Error("guard");
			expect(curr.startMin).toBe(prev.endMin);
		}
	});

	it("休憩は全部 10 分", () => {
		for (const b of EVENTS.filter((e) => e.kind === "break")) {
			expect(b.endMin - b.startMin).toBe(10);
		}
	});
});

describe("SCHOOL_START_MIN / SCHOOL_END_MIN", () => {
	it("8:50 と 19:40", () => {
		expect(SCHOOL_START_MIN).toBe(530);
		expect(SCHOOL_END_MIN).toBe(1180);
	});
});

describe("activeEvent", () => {
	it("土曜は null", () => {
		expect(activeEvent(sat(9, 0))).toBeNull();
	});

	it("授業時間外（朝）は null", () => {
		expect(activeEvent(mon(7, 0))).toBeNull();
	});

	it("授業時間外（夜）は null", () => {
		expect(activeEvent(mon(20, 0))).toBeNull();
	});

	it("1 限中は event=1限", () => {
		const a = activeEvent(mon(9, 0));
		expect(a?.event.label).toBe("1限");
		expect(a?.event.kind).toBe("class");
	});

	it("休憩中は event.kind=break", () => {
		const a = activeEvent(mon(10, 25));
		expect(a?.event.kind).toBe("break");
		expect(a?.event.label).toBe("休憩");
	});

	it("昼休み中は event.kind=lunch", () => {
		const a = activeEvent(mon(12, 30));
		expect(a?.event.kind).toBe("lunch");
	});

	it("進捗率はコマ中央で約 0.5", () => {
		// 1限 8:50-10:20 の中央は 9:35
		const a = activeEvent(mon(9, 35));
		expect(a?.progress).toBeCloseTo(0.5, 4);
	});

	it("残り秒はコマ終了まで", () => {
		const a = activeEvent(mon(9, 0));
		// 1限終了 10:20 まで 80 分 = 4800 秒
		expect(a?.remainingSec).toBe(80 * 60);
	});
});

describe("upcomingEvents", () => {
	it("土曜は空", () => {
		expect(upcomingEvents(sat(9, 0))).toEqual([]);
	});

	it("朝 7:00 は先頭が 1 限", () => {
		const u = upcomingEvents(mon(7, 0), 3);
		expect(u).toHaveLength(3);
		expect(u[0]?.label).toBe("1限");
	});

	it("3 限中の先頭は 3 限自身", () => {
		const u = upcomingEvents(mon(14, 0), 3);
		expect(u[0]?.label).toBe("3限");
	});

	it("休憩中の先頭はその休憩", () => {
		const u = upcomingEvents(mon(10, 25), 3);
		expect(u[0]?.kind).toBe("break");
		expect(u[1]?.label).toBe("2限");
	});

	it("放課後は空", () => {
		expect(upcomingEvents(mon(20, 0))).toEqual([]);
	});

	it("limit で件数制限される", () => {
		expect(upcomingEvents(mon(7, 0), 1)).toHaveLength(1);
	});
});

describe("untilSchoolEndSec", () => {
	it("土曜は 0", () => {
		expect(untilSchoolEndSec(sat(10, 0))).toBe(0);
	});

	it("放課後は 0", () => {
		expect(untilSchoolEndSec(mon(20, 0))).toBe(0);
	});

	it("19:40 の 10 分前は 600 秒", () => {
		expect(untilSchoolEndSec(mon(19, 30, 0))).toBe(600);
	});
});

describe("dayPhase", () => {
	it("土曜 → weekend", () => {
		expect(dayPhase(sat(10, 0))).toBe("weekend");
	});
	it("月曜 7:00 → before", () => {
		expect(dayPhase(mon(7, 0))).toBe("before");
	});
	it("月曜 9:00 → during", () => {
		expect(dayPhase(mon(9, 0))).toBe("during");
	});
	it("月曜 20:00 → after", () => {
		expect(dayPhase(mon(20, 0))).toBe("after");
	});
});

describe("nowProgressInDay", () => {
	it("学校開始前は 0", () => {
		expect(nowProgressInDay(mon(7, 0))).toBe(0);
	});
	it("学校開始ちょうどは 0", () => {
		expect(nowProgressInDay(mon(8, 50))).toBe(0);
	});
	it("学校終了後は 1", () => {
		expect(nowProgressInDay(mon(20, 0))).toBe(1);
	});
	it("真ん中あたりで 0〜1 の値を返す", () => {
		const p = nowProgressInDay(mon(14, 15));
		expect(p).toBeGreaterThan(0.4);
		expect(p).toBeLessThan(0.6);
	});
});
