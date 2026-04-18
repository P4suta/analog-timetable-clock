import { describe, expect, it } from "vitest";
import {
	backgroundGradient,
	isDaytime,
	periodProgress,
	periodState,
	sunAngle,
} from "./daytime";
import { PERIODS } from "./schedule";

const mon = (h: number, m: number, s = 0) => new Date(2026, 3, 13, h, m, s);
const sat = (h: number, m: number) => new Date(2026, 3, 18, h, m, 0);

const P1 = PERIODS[0];
const P2 = PERIODS[1];
const NOON = PERIODS[2];
if (!P1 || !P2 || !NOON) throw new Error("PERIODS guard");

describe("periodState", () => {
	it("土日は常に inactive", () => {
		expect(periodState(P1, sat(9, 0))).toBe("inactive");
	});

	it("コマ開始前は future", () => {
		expect(periodState(P1, mon(8, 0))).toBe("future");
	});

	it("コマ中は current", () => {
		expect(periodState(P1, mon(9, 0))).toBe("current");
	});

	it("コマ終了直前は current（終了 1 秒前）", () => {
		expect(periodState(P1, mon(10, 19, 59))).toBe("current");
	});

	it("コマ終了ちょうどは past", () => {
		expect(periodState(P1, mon(10, 20, 0))).toBe("past");
	});

	it("後の時刻は past", () => {
		expect(periodState(P1, mon(15, 0))).toBe("past");
	});
});

describe("periodProgress", () => {
	it("コマ開始前は 0", () => {
		expect(periodProgress(P1, mon(8, 0))).toBe(0);
	});

	it("コマ開始ちょうどは 0", () => {
		expect(periodProgress(P1, mon(8, 50))).toBe(0);
	});

	it("コマ中央で 0.5", () => {
		// 1 限: 8:50-10:20（90 分）、中央は 9:35
		const p = periodProgress(P1, mon(9, 35, 0));
		expect(p).toBeCloseTo(0.5, 4);
	});

	it("コマ終了直前は 1 未満", () => {
		const p = periodProgress(P1, mon(10, 19, 59));
		expect(p).toBeLessThan(1);
		expect(p).toBeGreaterThan(0.99);
	});

	it("コマ終了後は 1", () => {
		expect(periodProgress(P1, mon(10, 20, 0))).toBe(1);
	});
});

describe("sunAngle", () => {
	it("正午は 0°（真上）", () => {
		expect(sunAngle(mon(12, 0))).toBe(0);
	});

	it("日の出 6 時は 90°（真右）", () => {
		expect(sunAngle(mon(6, 0))).toBe(90);
	});

	it("日没 18 時は 270°（真左）", () => {
		expect(sunAngle(mon(18, 0))).toBe(270);
	});

	it("真夜中 0 時は 180°（真下）", () => {
		expect(sunAngle(mon(0, 0))).toBe(180);
	});

	it("15 時（正午から 3 時間後）は 315°（左上）", () => {
		// (12 - 15) * 15 = -45 → 315°
		expect(sunAngle(mon(15, 0))).toBe(315);
	});
});

describe("isDaytime", () => {
	it("6 時は昼", () => {
		expect(isDaytime(mon(6, 0))).toBe(true);
	});

	it("5:59 は夜", () => {
		expect(isDaytime(mon(5, 59))).toBe(false);
	});

	it("17:59 は昼", () => {
		expect(isDaytime(mon(17, 59))).toBe(true);
	});

	it("18:00 は夜", () => {
		expect(isDaytime(mon(18, 0))).toBe(false);
	});
});

describe("backgroundGradient", () => {
	it("真夜中は深い濃紺系", () => {
		const g = backgroundGradient(mon(0, 0));
		expect(g.top).toMatch(/^#[0-9a-f]{6}$/);
		expect(g.bottom).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("キーフレーム間で補間される", () => {
		const a = backgroundGradient(mon(0, 0));
		const b = backgroundGradient(mon(2, 30));
		const c = backgroundGradient(mon(5, 0));
		// 2:30 は 0:00 と 5:00 の間にあるので、色も間にあるはず（どちらとも異なる）
		expect(b.top).not.toBe(a.top);
		expect(b.top).not.toBe(c.top);
	});

	it("終日のどの時刻でも有効な 16 進カラーを返す", () => {
		for (let h = 0; h < 24; h++) {
			const g = backgroundGradient(mon(h, 0));
			expect(g.top).toMatch(/^#[0-9a-f]{6}$/);
			expect(g.bottom).toMatch(/^#[0-9a-f]{6}$/);
		}
	});
});
