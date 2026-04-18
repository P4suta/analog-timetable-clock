import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// GitHub Pages 等サブパス配信用。actions/configure-pages が渡してくる
// base_path (例: `/analog-timetable-clock`) には末尾スラッシュがないので
// ここで正規化する。未設定ならルート直下 (`/`) 配信。
function resolveBase(): string {
	const raw = process.env.BASE_PATH;
	if (!raw) return "/";
	return raw.endsWith("/") ? raw : `${raw}/`;
}

export default defineConfig({
	base: resolveBase(),
	plugins: [tailwindcss(), svelte()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
		},
	},
});
