/**
 * 時刻ストア。リアルタイム（now の毎フレーム更新）と、
 * 開発時に「仮想時刻」を任意にずらすオーバーライドを両立する。
 *
 * 設計:
 * - `real` はアプリ側の rAF ループから `tickReal()` で毎フレーム更新される。
 * - 通常時は `now` が `real` をそのまま返す。
 * - オーバーライドが有効なときは `offsetMs` を `real` に加えた値を `now` とする。
 *   これにより「仮想時刻もリアル時間と一緒に進む」挙動になる。
 * - `pausedAt` が立っていると `now` はそこで止まる（時間が凍る）。
 * - 本番ビルドでも本ストアは生き残る（軽量）。実際にオーバーライドする UI
 *   (DevPanel) は `import.meta.env.DEV` でガードされ tree-shake される。
 */
class TimeStore {
	real: Date = $state(new Date());
	private offsetMs: number | null = $state<number | null>(null);
	private pausedAt: Date | null = $state<Date | null>(null);

	get now(): Date {
		if (this.pausedAt) return this.pausedAt;
		if (this.offsetMs === null) return this.real;
		return new Date(this.real.getTime() + this.offsetMs);
	}

	get isOverriding(): boolean {
		return this.offsetMs !== null || this.pausedAt !== null;
	}

	get isPaused(): boolean {
		return this.pausedAt !== null;
	}

	/** アプリ側の rAF から毎フレーム呼ぶ。 */
	tickReal(): void {
		this.real = new Date();
	}

	/** 仮想時刻を `d` に合わせる。paused 中は pausedAt も同期させる。 */
	setOverride(d: Date): void {
		this.offsetMs = d.getTime() - this.real.getTime();
		if (this.pausedAt !== null) {
			this.pausedAt = d;
		}
	}

	/** 同日中の時刻だけ変更（年月日は現在の仮想時刻のもの）。 */
	setTimeOfDay(h: number, m: number, s = 0): void {
		const d = new Date(this.now);
		d.setHours(h, m, s, 0);
		this.setOverride(d);
	}

	/** 曜日（0=日 … 6=土）を変える。時刻は保持。 */
	setDayOfWeek(day: number): void {
		const d = new Date(this.now);
		const diff = day - d.getDay();
		d.setDate(d.getDate() + diff);
		this.setOverride(d);
	}

	/** 仮想時刻を指定秒進める／戻す（負値可）。 */
	advanceBy(seconds: number): void {
		const d = new Date(this.now.getTime() + seconds * 1000);
		this.setOverride(d);
	}

	/** オーバーライド全解除、リアルタイムに戻す。 */
	reset(): void {
		this.offsetMs = null;
		this.pausedAt = null;
	}

	/** 一時停止 ↔ 再開。停止中は仮想時刻が止まる。 */
	togglePause(): void {
		if (this.pausedAt !== null) {
			// 再開：pausedAt を起点に offset を組み直して連続的に進めるようにする
			this.offsetMs = this.pausedAt.getTime() - this.real.getTime();
			this.pausedAt = null;
		} else {
			// 停止：現在の仮想時刻で凍結
			this.pausedAt = this.now;
		}
	}
}

export const timeStore = new TimeStore();
