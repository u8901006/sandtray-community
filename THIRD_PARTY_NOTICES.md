---
title: "公開候選版素材與授權"
description: "270 件 CC0 模型、開發用練習模型、原創庭園與內嵌貼圖的分別授權。"
date: 2026-10-24
tags: [license, assets]
---
# 素材與授權

程式碼採 AGPL-3.0-only。權利人於 2026-10-24 明確選擇，同意將本專案自製庭園與程序合成環境音一併以 AGPL-3.0 公開。這不改變第三方素材的原授權。

| 內容 | 作者／來源 | 授權 | 隨附聲明 |
|---|---|---|---|
| Mini Arena（22 件） | Kenney，https://kenney.nl/assets/mini-arena | CC0-1.0 | ARENA-LICENSE.txt |
| Mini Dungeon（30 件） | Kenney，https://kenney.nl/assets/mini-dungeon | CC0-1.0 | DUNGEON-LICENSE.txt |
| Furniture Kit（140 件） | Kenney，https://kenney.nl/assets/furniture-kit | CC0-1.0 | FURNITURE-LICENSE.txt |
| Mini Characters（26 件） | Kenney，https://kenney.nl/assets/mini-characters | CC0-1.0 | MINI-LICENSE.txt |
| Ultimate Animated Character Pack（52 件） | Quaternius，https://quaternius.com/packs/ultimatedanimatedcharacter.html | CC0-1.0 | ULTIMATE-LICENSE.txt |
| Stylized Nature MegaKit（庭園所需 16 件） | Quaternius，https://quaternius.com/packs/stylizednaturemegakit.html | CC0-1.0 | megakits-v1/SN-LICENSE.txt |
| 練習石／屋／拱門／兩版玩偶 | 本專案，tools/create-dev-assets.ts | AGPL-3.0-only | LICENSE；產品 metadata 保留 DEV_ONLY，非正式素材驗收 |
| 庭園原創幾何、程序材質、合成風／水／鳥聲 | 本專案，tools/assets/build_garden_v2.py 等 | AGPL-3.0-only | LICENSE |
| 庭園嵌入 forest_ground_04、wood_floor 貼圖 | Poly Haven；作者、來源及雜湊見 assets/garden-pbr-v1/manifest.json | CC0-1.0 | https://polyhaven.com/license |

前五份模型授權原文位於 apps/web/public/imported-assets/v1/，植被授權位於 apps/web/public/imported-assets/megakits-v1/SN-LICENSE.txt。模型沿用原版的 Web 最佳化輸出與動畫 metadata，縮圖是這些模型的渲染。模型及內嵌貼圖的 CC0 不受程式碼 AGPL 重新授權；亦不宣稱整個庭園是 CC0。

JavaScript 相依套件維持 package-lock.json 鎖定版本及各自授權。npm ci 安裝的相依套件保有其 LICENSE；程式碼 ZIP 不夾帶 node_modules。THIRD_PARTY_NPM_LICENSES.txt 收錄本次鎖定安裝中可取得的 153 份套件授權／NOTICE 原文；部分 npm 套件僅在 package.json 宣告 SPDX license，該檔不是所有上游套件權利來源的獨立法律認證。

未包含 ITHappy、其餘動物、自製模型全集、其他未逐包確認的素材。公開 catalog 僅包括上列 286 件及練習物件；空 catalog 檔是為維持模組 API 的相容佔位，並不代表有提供該素材包。
