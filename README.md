# 1001 只飞鸟 · 1001 Birds

精选世界 **1001 种飞鸟**的双语（中／英）图鉴画廊，按严谨的**目 / 科**分类编排，兼顾图鉴的信息密度与画廊的视觉美感。当前为首期 **MVP 100 种**，覆盖 30 余个目。

**在线预览**：https://xujiann.github.io/1001birds/

## 特点

- 🐦 瀑布流大图画廊，按真实宽高比排布
- 🌳 目 → 科 可折叠分类树导航 + 面包屑
- 🔍 中／英／学名／拼音搜索
- 🏷 按类群、动物地理界、IUCN 保护等级筛选
- 🈶 中英双语一键切换
- ♥ 收藏（localStorage）、每日一鸟、随机、深链
- 🔬 高清灯箱（滚轮 / 双击 / 拖动缩放）
- 📱 移动端优化、深色主题

## 数据来源

- **分类与元数据**：[Wikidata](https://www.wikidata.org)（学名、目/科、IUCN 保护等级）
- **图片**：[Wikimedia Commons](https://commons.wikimedia.org) — 每张均保留原作者署名与许可，经 jsDelivr CDN 分发
- **物种简介**：[Wikipedia](https://www.wikipedia.org)

## 技术栈

纯 HTML/CSS/JS，无构建框架。离线数据管线（`_*` 脚本，不入库）：Wikidata SPARQL harvest → Commons 图片下载 → Wikipedia 简介 → opencc 繁转简 + pinyin + image-size → 生成 `birds.js`。

姊妹项目：[1001 件人类艺术瑰宝](https://xujiann.github.io/1001art/)
