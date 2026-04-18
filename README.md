# analog-timetable-clock

大学の時間割（1限〜6限＋昼休み、8:50〜19:40、月〜金）を
**アナログ時計** と **ミッションコントロール風のスケジュールパネル**
で同時に表示するダッシュボード。

## 主な要素

- **アナログ時計**: 外周リングに 7 個の色付きアークで各コマを描画。
  現在コマは赤枠＋グローで強調、経過部分は薄く、残り部分は濃く
  「90 分を塗り潰していく」進行ゲージに。rAF で毎フレーム更新、
  CSS transition で角度が周回する問題は回避済み。
- **太陽/月サブダイヤル (右上)**: 24 時間文字盤で AM/PM 曖昧さを解消。
- **背景**: 時刻に応じて夜明け〜昼〜夕焼け〜夜と連続的にグラデ変化。
- **SCHEDULE パネル (右側)**:
  一日バー・SLOT 進行バー (T+/T-/PROGRESS/DUR テレメトリ付き)・
  SEQUENCE 一覧・DAY END カウントダウン・下部 NOW スキャンライン。
  残り 60 秒で CRITICAL、残り 10 秒で IMMINENT バナーが点滅。
- **DevPanel (dev ビルドのみ)**: 時刻オーバーライド・曜日切替・
  プリセットジャンプ・Pause/Play。`Ctrl+D` で開閉、`R` で real 復帰、
  矢印キーで ±1 分 / ±15 分ステップ。本番ビルドからは dynamic import
  ごと tree-shake されて完全に消える。

## 構成

- **SvelteKit** + `@sveltejs/adapter-static` で完全な静的サイト
- **Svelte 5 runes** (`$state`, `$derived`, `$effect`)
- **TypeScript** strict + `noUncheckedIndexedAccess`
- **Tailwind CSS v4** (`@tailwindcss/vite`) + CSS 変数でテーマトークン
- **Biome** で lint と format
- **Vitest** でロジックテスト
- **bun** をパッケージマネージャに使用

## ローカル開発

```sh
bun install
bun run dev   # http://localhost:5173/
```

### Docker で動かす

`docker compose` 経由で全操作が走る：

```sh
docker compose up dev            # dev サーバ (:5173)
docker compose run --rm check    # svelte-check
docker compose run --rm lint     # Biome
docker compose run --rm test     # Vitest
docker compose up preview        # 本番ビルドを preview (:4173)
```

Dockerfile は multi-target で `check` / `lint` / `test` / `build` /
`build-output` stage を持つので、CI も Pages デプロイも同じ Dockerfile
を使う。

### 本番ビルド

```sh
bun run build                 # ルート配信
BASE_PATH=/myapp bun run build # サブパス配信（GitHub Pages 等）
```

## 検証

```sh
bun run check     # svelte-check (TypeScript + Svelte)
bun run lint      # Biome
bun run test:run  # Vitest (119 tests)
bun run build     # static 出力 (build/)
```

## デプロイ

`main` ブランチへの push で GitHub Actions が走る:

- `ci.yml`: check / lint / test を並列実行
- `deploy.yml`: Docker で static ビルドして GitHub Pages に配置

Pages は `https://<user>.github.io/analog-timetable-clock/` で公開される。
`BASE_PATH` は `actions/configure-pages` が自動注入。

## ライセンス

[MIT License](./LICENSE)
