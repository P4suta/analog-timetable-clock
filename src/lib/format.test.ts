import { describe, expect, it } from "vitest";
import {
	formatCountdown,
	formatDuration,
	formatMinOfDay,
	pad2,
} from "./format";

describe("formatDuration", () => {
	it("0 は 0 秒", () => {
		expect(formatDuration(0)).toBe("0 秒");
	});

	it("負値も 0 秒", () => {
		expect(formatDuration(-5)).toBe("0 秒");
	});

	it("秒のみ", () => {
		expect(formatDuration(45)).toBe("45 秒");
	});

	it("分のみ（秒ゼロは省略）", () => {
		expect(formatDuration(120)).toBe("2 分");
	});

	it("分＋秒", () => {
		expect(formatDuration(90)).toBe("1 分 30 秒");
	});

	it("時間のみ", () => {
		expect(formatDuration(3600)).toBe("1 時間");
	});

	it("時間＋分", () => {
		expect(formatDuration(5400)).toBe("1 時間 30 分");
	});

	it("時間＋分＋秒", () => {
		expect(formatDuration(3661)).toBe("1 時間 1 分 1 秒");
	});
});

describe("formatMinOfDay", () => {
	it("0 分 → 0:00", () => {
		expect(formatMinOfDay(0)).toBe("0:00");
	});

	it("530 分 → 8:50", () => {
		expect(formatMinOfDay(530)).toBe("8:50");
	});

	it("720 分 → 12:00", () => {
		expect(formatMinOfDay(720)).toBe("12:00");
	});

	it("1180 分 → 19:40", () => {
		expect(formatMinOfDay(1180)).toBe("19:40");
	});
});

describe("pad2", () => {
	it("1 桁は 0 埋め", () => {
		expect(pad2(5)).toBe("05");
	});
	it("2 桁はそのまま", () => {
		expect(pad2(42)).toBe("42");
	});
	it("負値は 00", () => {
		expect(pad2(-3)).toBe("00");
	});
});

describe("formatCountdown", () => {
	it("0 秒は 00:00:00", () => {
		expect(formatCountdown(0)).toBe("00:00:00");
	});

	it("負値は 00:00:00", () => {
		expect(formatCountdown(-10)).toBe("00:00:00");
	});

	it("90 秒は 00:01:30", () => {
		expect(formatCountdown(90)).toBe("00:01:30");
	});

	it("3600 秒は 01:00:00", () => {
		expect(formatCountdown(3600)).toBe("01:00:00");
	});

	it("3723 秒は 01:02:03", () => {
		expect(formatCountdown(3723)).toBe("01:02:03");
	});

	it("1 時間以上も固定幅 (10:05:30)", () => {
		expect(formatCountdown(10 * 3600 + 5 * 60 + 30)).toBe("10:05:30");
	});
});
