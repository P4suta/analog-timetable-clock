/**
 * アナログ時計描画の幾何ユーティリティ。
 * 角度は「12 時位置=0°、時計回り」とする（SVG の y 軸は下向き）。
 */

export type Point = { x: number; y: number };

/** 極座標 → デカルト座標。12 時位置を 0°、時計回りを正とする。 */
export function polar(
	cx: number,
	cy: number,
	r: number,
	angleDeg: number,
): Point {
	const rad = (angleDeg * Math.PI) / 180;
	return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

/**
 * startDeg → endDeg を時計回りに進むリング状扇形の SVG path。
 * 角度は 0〜360 の範囲でなくてよく、endDeg < startDeg の折り返し
 * （例: 315° → 45°）も正しく 90° 弧として扱う。
 */
export function ringSegment(
	cx: number,
	cy: number,
	rOuter: number,
	rInner: number,
	startDeg: number,
	endDeg: number,
): string {
	const startOuter = polar(cx, cy, rOuter, startDeg);
	const endOuter = polar(cx, cy, rOuter, endDeg);
	const startInner = polar(cx, cy, rInner, startDeg);
	const endInner = polar(cx, cy, rInner, endDeg);

	// 時計回りの角度幅を 0〜360 に正規化
	const delta = (((endDeg - startDeg) % 360) + 360) % 360;
	const largeArc = delta > 180 ? 1 : 0;

	return [
		`M ${startOuter.x} ${startOuter.y}`,
		`A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
		`L ${endInner.x} ${endInner.y}`,
		`A ${rInner} ${rInner} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
		"Z",
	].join(" ");
}

/**
 * 12 時間アナログ時計における、分換算で `mins` 分の時刻の時針方向角度（度）。
 * 12 時位置 = 0°、時計回り。12 時間 (720 分) で 360° 一周。
 */
export function minutesToClockAngle(mins: number): number {
	return ((mins % 720) * 360) / 720;
}
