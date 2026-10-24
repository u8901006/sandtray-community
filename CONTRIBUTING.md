---
title: "開發與貢獻"
description: "如何驗證公開版修改並保留來源與素材邊界。"
date: 2026-10-24
tags: [development]
---
# 開發

使用 .nvmrc 的 Node 與 npm ci。修改後執行型別檢查、適用單元、build、Worker dry-run 及瀏覽器探針／測試。PUBLIC_EXPORT.json 是原版快照，修改造成的雜湊差異必須由維護者審核後重產，不能關掉失敗檢查。

新增模型須提供原始來源、授權聲明、模型與縮圖 hash；不得因可下載而推定可再散布。server authorization、revoke、lease、epoch、ACK 持久化、跨房間與刪除契約皆須保留。

提供網路服務的修改版應提供相應的原始碼取得方式，並依 LICENSE 履行 AGPL-3.0-only 條款。維護者也應更新 README、來源包及第三方授權聲明。
