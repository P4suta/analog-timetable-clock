import { describe, expect, it } from "vitest";
import { minutesToClockAngle, polar, ringSegment } from "./geometry";

const CX = 250;
const CY = 250;

// 浮動小数点誤差を許容するヘルパ
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe("polar", () => {
	it("0° は真上 (12 時位置)", () => {
		const p = polar(CX, CY, 100, 0);
		expect(near(p.x, 250)).toBe(true);
		expect(near(p.y, 150)).toBe(true);
	});

	it("90° は真右 (3 時位置)", () => {
		const p = polar(CX, CY, 100, 90);
		expect(near(p.x, 350)).toBe(true);
		expect(near(p.y, 250)).toBe(true);
	});

	it("180° は真下 (6 時位置)", () => {
		const p = polar(CX, CY, 100, 180);
		expect(near(p.x, 250)).toBe(true);
		expect(near(p.y, 350)).toBe(true);
	});

	it("270° は真左 (9 時位置)", () => {
		const p = polar(CX, CY, 100, 270);
		expect(near(p.x, 150)).toBe(true);
		expect(near(p.y, 250)).toBe(true);
	});

	it("中心を変えても機能する", () => {
		const p = polar(10, 20, 5, 90);
		expect(near(p.x, 15)).toBe(true);
		expect(near(p.y, 20)).toBe(true);
	});
});

describe("minutesToClockAngle", () => {
	it("0 分は 0°", () => {
		expect(minutesToClockAngle(0)).toBe(0);
	});

	it("3 時 (180 分) は 90°", () => {
		expect(minutesToClockAngle(180)).toBe(90);
	});

	it("6 時 (360 分) は 180°", () => {
		expect(minutesToClockAngle(360)).toBe(180);
	});

	it("9 時 (540 分) は 270°", () => {
		expect(minutesToClockAngle(540)).toBe(270);
	});

	it("12 時 (720 分) は 0° (12 時間で一周)", () => {
		expect(minutesToClockAngle(720)).toBe(0);
	});

	it("15 時 (3PM) は 90° (PM でも同位置)", () => {
		expect(minutesToClockAngle(15 * 60)).toBe(90);
	});
});

describe("ringSegment", () => {
	it("短い弧は largeArc=0", () => {
		const d = ringSegment(CX, CY, 100, 80, 0, 90);
		expect(d).toContain("A 100 100 0 0 1");
		expect(d).toContain("A 80 80 0 0 0");
	});

	it("長い弧 (>180°) は largeArc=1", () => {
		const d = ringSegment(CX, CY, 100, 80, 0, 270);
		expect(d).toContain("A 100 100 0 1 1");
		expect(d).toContain("A 80 80 0 1 0");
	});

	it("180° ちょうどは largeArc=0", () => {
		const d = ringSegment(CX, CY, 100, 80, 0, 180);
		expect(d).toContain("A 100 100 0 0 1");
	});

	it("折り返し (315° → 45°) は 90° の短い弧として扱う", () => {
		const d = ringSegment(CX, CY, 100, 80, 315, 45);
		expect(d).toContain("A 100 100 0 0 1");
	});

	it("折り返し大弧 (10° → 190°...ちょうど 180°) vs (350° → 170° = 180°)", () => {
		// 350° → 170° は時計回りに 180° (境界ちょうど、短い側)
		const d = ringSegment(CX, CY, 100, 80, 350, 170);
		expect(d).toContain("A 100 100 0 0 1");
	});

	it("折り返し大弧 (350° → 200° = 210°) は largeArc=1", () => {
		const d = ringSegment(CX, CY, 100, 80, 350, 200);
		expect(d).toContain("A 100 100 0 1 1");
	});

	it("path は M で始まり Z で終わる", () => {
		const d = ringSegment(CX, CY, 100, 80, 10, 50);
		expect(d.startsWith("M ")).toBe(true);
		expect(d.endsWith(" Z")).toBe(true);
	});

	it("外側アークと内側アークの 2 本を含む", () => {
		const d = ringSegment(CX, CY, 100, 80, 10, 50);
		const arcs = d.match(/A \d/g) ?? [];
		expect(arcs).toHaveLength(2);
	});
});
