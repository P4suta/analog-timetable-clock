export type PeriodKind = "class" | "lunch";

export type Period = {
	key: string;
	label: string;
	startMin: number;
	endMin: number;
	kind: PeriodKind;
};

const HM = (h: number, m: number) => h * 60 + m;

export const PERIODS: readonly Period[] = [
	{
		key: "p1",
		label: "1限",
		startMin: HM(8, 50),
		endMin: HM(10, 20),
		kind: "class",
	},
	{
		key: "p2",
		label: "2限",
		startMin: HM(10, 30),
		endMin: HM(12, 0),
		kind: "class",
	},
	{
		key: "noon",
		label: "昼休み",
		startMin: HM(12, 0),
		endMin: HM(13, 10),
		kind: "lunch",
	},
	{
		key: "p3",
		label: "3限",
		startMin: HM(13, 10),
		endMin: HM(14, 40),
		kind: "class",
	},
	{
		key: "p4",
		label: "4限",
		startMin: HM(14, 50),
		endMin: HM(16, 20),
		kind: "class",
	},
	{
		key: "p5",
		label: "5限",
		startMin: HM(16, 30),
		endMin: HM(18, 0),
		kind: "class",
	},
	{
		key: "p6",
		label: "6限",
		startMin: HM(18, 10),
		endMin: HM(19, 40),
		kind: "class",
	},
];

export type Status =
	| { type: "weekend" }
	| { type: "before-school"; next: Period; untilSec: number }
	| { type: "in-period"; period: Period; remainingSec: number }
	| { type: "break"; prev: Period; next: Period; untilSec: number }
	| { type: "after-school"; last: Period };

export function currentStatus(now: Date): Status {
	const day = now.getDay();
	if (day === 0 || day === 6) return { type: "weekend" };

	const nowSec =
		now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

	for (const p of PERIODS) {
		const startSec = p.startMin * 60;
		const endSec = p.endMin * 60;
		if (nowSec >= startSec && nowSec < endSec) {
			return { type: "in-period", period: p, remainingSec: endSec - nowSec };
		}
	}

	// PERIODS は定数配列なので first/last は常に存在する。noUncheckedIndexedAccess
	// を黙らせるためのガードだが、空配列でここに来ること自体プログラマ側の不変
	// 条件違反なので "weekend" に倒すのは嘘になる。到達したら落とす。
	const first = PERIODS[0];
	const last = PERIODS[PERIODS.length - 1];
	if (!first || !last) {
		throw new Error("PERIODS must not be empty");
	}

	if (nowSec < first.startMin * 60) {
		return {
			type: "before-school",
			next: first,
			untilSec: first.startMin * 60 - nowSec,
		};
	}
	if (nowSec >= last.endMin * 60) {
		return { type: "after-school", last };
	}

	// コマとコマの間（break）。PERIODS は時刻順に並んでいる前提。
	let prev: Period = first;
	for (const p of PERIODS) {
		if (nowSec < p.startMin * 60) {
			return {
				type: "break",
				prev,
				next: p,
				untilSec: p.startMin * 60 - nowSec,
			};
		}
		prev = p;
	}
	// ここに到達するケース：before/in/after/break のどれでもない。
	// 論理的にあり得ない（最後の endMin は after-school で早期 return 済み）。
	throw new Error("unreachable: could not classify current time");
}
