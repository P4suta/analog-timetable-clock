/** 秒数を「1 時間 30 分 25 秒」のような可読文字列に整形。負値・0 は「0 秒」。 */
export function formatDuration(totalSec: number): string {
	if (totalSec <= 0) return "0 秒";
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	const parts: string[] = [];
	if (h > 0) parts.push(`${h} 時間`);
	if (m > 0) parts.push(`${m} 分`);
	if (s > 0 || parts.length === 0) parts.push(`${s} 秒`);
	return parts.join(" ");
}

/** 一日のうちの分（0〜1439）を "H:MM" 表記に整形。例: 530 → "8:50"。 */
export function formatMinOfDay(min: number): string {
	const h = Math.floor(min / 60);
	const m = min % 60;
	return `${h}:${String(m).padStart(2, "0")}`;
}

/** 0 埋め 2 桁。 */
export function pad2(n: number): string {
	return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

/** 秒数を "HH:MM:SS" の固定幅カウントダウン表記に整形。負値は "00:00:00"。 */
export function formatCountdown(totalSec: number): string {
	if (totalSec <= 0) return "00:00:00";
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
