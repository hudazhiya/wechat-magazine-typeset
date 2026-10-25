---
name: wechat-magazine-typeset
description: 把文章排版成杂志封面风（TIME 周刊 / 经济学人 / 纽约客等）的公众号 HTML，输出全内联样式、可直接粘贴到微信后台。当用户要求排版公众号文章、做微信推文、要"杂志感/时代周刊风/封面感"排版，或需要把 Markdown 转成可粘贴进公众号的富文本时，应使用本 skill。也适用于需要切换主色、字体、封面版式的中文长文排版场景。
agent_created: true
---

# 公众号杂志风排版

## 目的

把一篇中文文章排版成**杂志封面风格**的公众号正文：主色刊头、粗框封面、粗衬线大标题、
首字下沉、主色边小标题、金句、数据块、要点框；输出**样式全部内联**的 HTML 片段，
复制后可直接粘贴进微信公众平台后台的正文区。

## 何时使用

- 用户给了文章（Markdown / 纯文本 / 口述要点），要求排版成公众号推文
- 用户明确提到「杂志风」「TIME / 时代周刊 / 经济学人 / 纽约客那种排版」
- 需要把 Markdown 转成能保留样式的微信富文本
- 需要给文章换主色、换字体、换封面版式

## 两条工作流

### A. 命令行（默认，推荐）

用 `scripts/typeset.js` 直接把 Markdown 转成 HTML，**无需打开浏览器**：

```bash
node scripts/typeset.js article.md -o out.html --style time
node scripts/typeset.js article.md -o preview.html --style biz --full   # 带手机预览外壳
node scripts/typeset.js --list-styles
```

元信息优先写在 Markdown 顶部的 front-matter
（`mast / kicker / title / deck / by / date / cover / style`），也可用命令行参数覆盖。
格式参考 `assets/sample-article.md`。

输出默认是**单个 `<section>` 片段**（适合直接粘微信）；加 `--full` 输出带手机宽度外壳的可预览文件。

作为模块调用：

```js
const { render, wrapDocument, STYLES } = require('./scripts/typeset.js');
const html = render({ md, meta: { title: '...' }, style: 'time' });
```

### B. 交互式编辑器

当用户需要自己反复调参、或要求「给我一个工具」时，把 `assets/editor.html` 复制到工作区供直接使用
（左侧填刊头 + 写 Markdown，右侧实时预览，一键复制到公众号）。

该编辑器已是成品，含：8 套风格方案、自定义取色器、字体/字号/框线/封面版式调节、
本地自动保存、手机/宽屏预览切换。**要改功能就编辑复制出去的副本**，不要改 skill 内的原件。

## Markdown 扩展语法

标准 Markdown（标题、粗体、斜体、删除线、引用、有序/无序列表、图片、链接、分隔线）均支持，另扩展：

| 写法 | 效果 |
|---|---|
| `!! 一句话` | 金句：大号居中，上下细线 |
| `@@ 47 分钟 \| 说明文字` | 数据块：主色大数字 + 右栏说明（table 布局） |
| `::: 框标题` … `:::` | 要点框：主色边框 + 浅底 |
| `==文字==` | 主色标记（强调） |
| `![图注](url)` | 图片 + 灰色图注（alt 即图注） |

首字下沉自动作用于正文第一段。

## 风格方案

| id | 名称 | 主色 | 字体 | 框线 | 封面版式 |
|---|---|---|---|---|---|
| `time` | TIME 经典 | `#E90606` | 宋体 | 4px | classic |
| `econ` | 经济学人 | `#1B3A6B` | 宋体 | 3px | classic |
| `yorker` | 纽约客墨 | `#1A1A1A` | 宋体 | 无框 | minimal |
| `natgeo` | 国家地理 | `#B0801C` | 黑体 | 5px | banner |
| `biz` | 商业周刊 | `#0F5C8C` | 黑体 | 无框 | banner |
| `forest` | 松绿自然 | `#1E6B52` | 宋体 | 3px | classic |
| `rose` | 洋红现代 | `#C2185B` | 黑体 | 无框 | minimal |
| `slate` | 石墨灰 | `#455A64` | 宋体 | 2px | classic |

封面版式：`classic`（刊头条 + 图 + 标题块，整体外框）/ `banner`（通栏压图）/ `minimal`（极简，文字在前图在后）。

**主色不是死配色**，整套配色由主色派生：

- `ink()`：主色过亮时自动加深，保证白底可读
- `on()`：主色实底上的文字自动选黑或白（选柠檬黄也不会出现白字看不清）
- `SOFT / SOFT2 / LINE`：要点框底、引用底、细线由主色混白派生，换色后整篇色调统一

新增风格需**同时**修改 `scripts/typeset.js` 与 `assets/editor.html` 两处的 `STYLES` 数组，避免两套实现分叉。

## 硬性约束

微信会清除 `<style>`、class、外链 CSS，因此输出必须全内联。
完整兼容规则、被过滤的 CSS 清单、剪贴板写入方式与历史踩坑见 `references/wechat-css.md`
——**生成或改动 HTML 前先读它**。

交付前自检：无 `data-role` / `class=` / `<style>` 残留；每个可见元素都带 `style`；
颜色为 hex 字面量；无 `position:absolute`、`flex`、`grid`；图片有 `max-width:100%`。

## 交付方式

生成的 `.html` 用 `present_files` 展示，并提示：打开后复制，到微信后台正文区 `Ctrl+V`；
外链图片会自动上传；正文超链接不可用，需引导时放「阅读原文」。
