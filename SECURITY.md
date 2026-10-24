---
title: "安全回報與架設邊界"
description: "公開候選版的安全回報、測試入口與正式環境限制。"
date: 2026-10-24
tags: [security]
---
# 安全

請以虛構資料測試。若發現安全問題，先私下通知你使用的部署維護者，勿將真實個資、會談內容、cookie、OIDC secret、R2 key 或可直接濫用的憑證貼到公開 issue。

本版沒有正式臨床環境安全核准。自行架設時需完成身份名單、OIDC、TLS、storage、刪除、回滾與監控驗收。不要將測試專用 tests/public/entry.ts 部署到網路；公開服務只用 apps/worker/src/index.ts。

原始碼打包只允許 PUBLIC_EXPORT.json 所列檔案；新增檔案須先審查。秘密只放在部署 secret store／本機忽略檔，不能寫進來源或公開清單。
