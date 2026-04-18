import { beforeEach, describe, expect, it } from "vitest";
import { timeStore } from "./time.svelte";

// シングルトンなので各テスト前に必ずリセットして独立性を確保
beforeEach(() => {
	timeStore.reset();
	timeStore.tickReal();
});

describe("timeStore", () => {
	it("初期状態ではリアルタイム（overriding=false）", () => {
		expect(timeStore.isOverriding).toBe(false);
		expect(timeStore.isPaused).toBe(false);
	});

	it("setOverride 後は isOverriding=true", () => {
		timeStore.setOverride(new Date(2026, 3, 13, 9, 0));
		expect(timeStore.isOverriding).toBe(true);
		expect(timeStore.now.getHours()).toBe(9);
		expect(timeStore.now.getMinutes()).toBe(0);
		expect(timeStore.now.getDay()).toBe(1); // 月曜
	});

	it("reset でリアルタイムに戻る", () => {
		timeStore.setOverride(new Date(2026, 3, 13, 9, 0));
		timeStore.reset();
		expect(timeStore.isOverriding).toBe(false);
		expect(timeStore.isPaused).toBe(false);
		// now は real にほぼ一致（誤差 100ms 以内）
		expect(Math.abs(timeStore.now.getTime() - Date.now())).toBeLessThan(100);
	});

	it("setTimeOfDay は時刻だけ差し替え（日付保持）", () => {
		timeStore.setOverride(new Date(2026, 3, 13, 9, 0)); // 月曜
		timeStore.setTimeOfDay(15, 30, 0);
		expect(timeStore.now.getDay()).toBe(1); // 月曜のまま
		expect(timeStore.now.getHours()).toBe(15);
		expect(timeStore.now.getMinutes()).toBe(30);
	});

	it("setDayOfWeek は曜日だけ差し替え（時刻保持）", () => {
		timeStore.setOverride(new Date(2026, 3, 13, 9, 35, 0)); // 月 9:35
		timeStore.setDayOfWeek(6); // 土
		expect(timeStore.now.getDay()).toBe(6);
		expect(timeStore.now.getHours()).toBe(9);
		expect(timeStore.now.getMinutes()).toBe(35);
	});

	it("advanceBy で仮想時刻を進める/戻す", () => {
		timeStore.setOverride(new Date(2026, 3, 13, 9, 0));
		timeStore.advanceBy(60); // +1 分
		expect(timeStore.now.getMinutes()).toBe(1);
		timeStore.advanceBy(-120); // -2 分
		expect(timeStore.now.getHours()).toBe(8);
		expect(timeStore.now.getMinutes()).toBe(59);
	});

	it("togglePause で停止中は now が動かない", () => {
		timeStore.setOverride(new Date(2026, 3, 13, 9, 0, 0));
		timeStore.togglePause();
		expect(timeStore.isPaused).toBe(true);
		const frozen = timeStore.now.getTime();
		// real が進んでも now は動かない
		timeStore.real = new Date(timeStore.real.getTime() + 10_000);
		expect(timeStore.now.getTime()).toBe(frozen);
	});

	it("再開すると仮想時刻が連続的に進む（real 進行分は加算されない）", () => {
		timeStore.setOverride(new Date(2026, 3, 13, 9, 0, 0));
		timeStore.togglePause();
		const frozen = timeStore.now.getTime();
		// 停止中に real が 10 秒進む
		timeStore.real = new Date(timeStore.real.getTime() + 10_000);
		// 再開
		timeStore.togglePause();
		expect(timeStore.isPaused).toBe(false);
		// 再開した瞬間の now は凍結していた値と同じ（real の進行分を含まない）
		expect(Math.abs(timeStore.now.getTime() - frozen)).toBeLessThan(5);
	});

	it("停止中に setOverride すると停止時刻も同期する", () => {
		timeStore.setOverride(new Date(2026, 3, 13, 9, 0));
		timeStore.togglePause();
		timeStore.setOverride(new Date(2026, 3, 13, 12, 0));
		expect(timeStore.isPaused).toBe(true);
		expect(timeStore.now.getHours()).toBe(12);
	});
});
