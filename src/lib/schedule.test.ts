import { describe, expect, it } from "vitest";
import { currentStatus, PERIODS } from "./schedule";

// getDay(): 0=日 1=月 ... 6=土
const mon = (h: number, m: number, s = 0) => new Date(2026, 3, 13, h, m, s);
const sat = (h: number, m: number) => new Date(2026, 3, 18, h, m, 0);
const sun = (h: number, m: number) => new Date(2026, 3, 19, h, m, 0);

describe("currentStatus", () => {
	it("土曜は weekend", () => {
		expect(currentStatus(sat(10, 0))).toEqual({ type: "weekend" });
	});

	it("日曜は weekend", () => {
		expect(currentStatus(sun(10, 0))).toEqual({ type: "weekend" });
	});

	it("月曜 7:00 は before-school（次は 1 限）", () => {
		const s = currentStatus(mon(7, 0));
		expect(s.type).toBe("before-school");
		if (s.type !== "before-school") throw new Error("type");
		expect(s.next.key).toBe("p1");
		expect(s.untilSec).toBe(110 * 60); // 1h50m
	});

	it("月曜 8:49:59 は before-school（残り 1 秒）", () => {
		const s = currentStatus(mon(8, 49, 59));
		expect(s.type).toBe("before-school");
		if (s.type !== "before-school") throw new Error("type");
		expect(s.untilSec).toBe(1);
	});

	it("月曜 8:50:00 は 1 限開始（残り 90 分）", () => {
		const s = currentStatus(mon(8, 50, 0));
		expect(s.type).toBe("in-period");
		if (s.type !== "in-period") throw new Error("type");
		expect(s.period.key).toBe("p1");
		expect(s.remainingSec).toBe(90 * 60);
	});

	it("月曜 8:50:30 は 1 限（残り 89 分 30 秒）", () => {
		const s = currentStatus(mon(8, 50, 30));
		expect(s.type).toBe("in-period");
		if (s.type !== "in-period") throw new Error("type");
		expect(s.remainingSec).toBe(90 * 60 - 30);
	});

	it("月曜 10:19:30 はまだ 1 限（残り 30 秒）", () => {
		const s = currentStatus(mon(10, 19, 30));
		expect(s.type).toBe("in-period");
		if (s.type !== "in-period") throw new Error("type");
		expect(s.period.key).toBe("p1");
		expect(s.remainingSec).toBe(30);
	});

	it("月曜 10:20:00 は break（1 限終了直後）", () => {
		const s = currentStatus(mon(10, 20, 0));
		expect(s.type).toBe("break");
		if (s.type !== "break") throw new Error("type");
		expect(s.prev.key).toBe("p1");
		expect(s.next.key).toBe("p2");
		expect(s.untilSec).toBe(10 * 60);
	});

	it("月曜 10:25:00 は 1 限と 2 限のあいだ", () => {
		const s = currentStatus(mon(10, 25));
		expect(s.type).toBe("break");
		if (s.type !== "break") throw new Error("type");
		expect(s.untilSec).toBe(5 * 60);
	});

	it("月曜 12:00:00 は 昼休み", () => {
		const s = currentStatus(mon(12, 0, 0));
		expect(s.type).toBe("in-period");
		if (s.type !== "in-period") throw new Error("type");
		expect(s.period.key).toBe("noon");
		expect(s.remainingSec).toBe(70 * 60);
	});

	it("月曜 13:10:00 は 3 限開始", () => {
		const s = currentStatus(mon(13, 10, 0));
		expect(s.type).toBe("in-period");
		if (s.type !== "in-period") throw new Error("type");
		expect(s.period.key).toBe("p3");
	});

	it("月曜 14:45 は 3 限と 4 限のあいだ", () => {
		const s = currentStatus(mon(14, 45));
		expect(s.type).toBe("break");
		if (s.type !== "break") throw new Error("type");
		expect(s.prev.key).toBe("p3");
		expect(s.next.key).toBe("p4");
	});

	it("月曜 19:39:59 はまだ 6 限（残り 1 秒）", () => {
		const s = currentStatus(mon(19, 39, 59));
		expect(s.type).toBe("in-period");
		if (s.type !== "in-period") throw new Error("type");
		expect(s.period.key).toBe("p6");
		expect(s.remainingSec).toBe(1);
	});

	it("月曜 19:40:00 は after-school", () => {
		const s = currentStatus(mon(19, 40, 0));
		expect(s.type).toBe("after-school");
	});

	it("月曜 23:00 は after-school", () => {
		const s = currentStatus(mon(23, 0));
		expect(s.type).toBe("after-school");
	});
});

describe("PERIODS", () => {
	it("授業コマはちょうど 6 つ、昼休みは 1 つ", () => {
		expect(PERIODS.filter((p) => p.kind === "class")).toHaveLength(6);
		expect(PERIODS.filter((p) => p.kind === "lunch")).toHaveLength(1);
	});

	it("各授業コマは 90 分", () => {
		for (const p of PERIODS.filter((p) => p.kind === "class")) {
			expect(p.endMin - p.startMin).toBe(90);
		}
	});

	it("隣接するコマは時系列順", () => {
		for (let i = 1; i < PERIODS.length; i++) {
			const prev = PERIODS[i - 1];
			const curr = PERIODS[i];
			if (!prev || !curr) throw new Error("guard");
			expect(curr.startMin).toBeGreaterThanOrEqual(prev.endMin);
		}
	});
});
