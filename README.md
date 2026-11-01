---
title: "Sandtray Community — 公開候選版"
description: "可自行架設的雙人 3D 沙盤；270 件 CC0 模型、16 件庭園植被、自製布與隧道及自然庭園。"
date: 2026-11-01
tags: [sandtray, community, self-hosted]
---
# Sandtray Community

公開儲存庫：https://github.com/u8901006/sandtray-community 。此為 0.1.0-public.2 候選預覽版。

雙人 3D 沙盤，包含兩座沙盤、物件擺放與動畫、逐物件操作授權、撤回、同步、會談內保存恢復、PNG 匯出、蓋布、兩盤之間隧道、緞帶連結、情緒噴罐、望遠鏡與小夥伴，以及可探索的自然庭園。本版本是公開候選版，尚未完成正式臨床發布驗收。

程式碼、專案自製練習模型、程序化建模的布與隧道、庭園原創部分與合成音效：**AGPL-3.0-only**。270 件 Kenney／Quaternius 模型、16 件庭園植被及庭園內的 Poly Haven 貼圖維持 **CC0-1.0**，詳見 [素材與授權](THIRD_PARTY_NOTICES.md)。

## 本機開始

需要 Node.js **22.20.0**（相容範圍 >=22.12.0 <23），使用本版 package-lock.json。

```sh
npm ci
npx playwright install chromium
npm run check
npm run dev
```

開啟 http://127.0.0.1:5173 ，可直接探索沙盤、物件架及庭園。本機單人探索不需要 Cloudflare 帳號或登入。只綁定 loopback，請使用虛構資料。

若要測試雙人同步，在另一個終端啟動正式 Worker 的本機模式：

```sh
npm run dev:worker
```

這個入口保留正式認證流程，需要你自己的 OIDC 與診所名單設定。公開包不含原開發環境的任何帳號或正式資源設定。雙人行為可先執行不依賴外部 OIDC 的自動化 smoke（只在 loopback 啟動測試專用 Worker）：

```sh
npm run test:browser
```

測試用身份／資料建立端點只存在 tests/public/entry.ts；**不可將該入口部署為服務**。正式部署入口始終是 apps/worker/src/index.ts。

## 驗證範圍

```sh
npm run verify:public
npm run check
npm run worker:check
npm run test:browser
```

公開版 CI 不需要私人 bucket 或私人 secrets。check 驗證公開檔案雜湊、九項 API／protocol contracts、TypeScript、所附單元測試與 build。browser 指令先執行瀏覽器大檔探針，再執行公開版行為 smoke。

此候選沒有把完整私有版的素材專屬套件當成通過；其餘未隨附 pack、正式 OIDC、真機 iPad／手機與長時間效能驗收另行記錄，不由本機 build 推定完成。公開版排除 ITHappy、其他未逐包查驗素材，以及內部會談資料、協作紀錄和 CI 私有素材包。Poly Pizza 的 skinned-model-bounds 專屬案例未隨附；公開版另以實際附帶的人物模型驗證 posed bounds。

## 自行部署

apps/worker/wrangler.jsonc 是無正式帳號 ID 的本機範例。部署前另建自己的設定檔，建立自己的 D1、PRIVATE_ASSETS／PRIVATE_SCENES R2 bucket、Durable Objects 及 OIDC provider，設定 DEPLOY_ENV、APP_ORIGIN 與六個 OIDC secrets；套用 apps/worker/migrations 內的 migration。

複製設定後使用明確的設定路徑部署，勿部署測試入口。公開模型在有房間的模式仍經過 server 端授權的素材路由，必須依 catalog 的 SHA-256 將 GLB 放入自己的 PRIVATE_ASSETS bucket 的 models/<sha256>.glb；本機單人探索直接使用公開檔案。

登入、角色名單、儲存、刪除、回滾及監控尚須由架設者完成驗收；此檔案不是正式環境上線核准。

## 原始碼與修改

介面上的「原始碼與授權」連結提供本次候選的 source-code.zip。修改後務必執行 npm run source:archive 重新打包，讓網路使用者取得對應於實際服務的原始碼；另有公開 source repository 時也可在 source.html 加入該網址。打包只讀 PUBLIC_EXPORT.json 的已審檔案清單，不掃描本機目錄，也不包含 .env 或 .dev.vars。新增程式檔案時須先審查並更新清單；另建的部署設定若屬必要建置來源，也應先去除秘密再列入。程式碼 ZIP 不含生成的 GLB／WAV 或第三方模型，執行示範請使用完整候選包。AGPL 完整條款見 [LICENSE](LICENSE)。

PUBLIC_EXPORT.json 記錄來源 commit、公開檔案雜湊與素材清單；它是匯出時的完整性快照。修改後雜湊驗證會失敗，請由維護者審查並重產自己的 manifest，不能以忽略驗證偽裝成原版。

庭園重建工具位於 tools/assets，需要 Blender 與 Python；原創網格、程序材質及音效來源隨附，Poly Haven 原始貼圖與來源記錄在 assets/garden-pbr-v1。Blender 重建不是 npm 安裝步驟，本次不宣稱已實跑重建。
