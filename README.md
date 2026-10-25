# wechat-magazine-typeset

把一篇中文文章排版成**杂志封面风**（TIME 周刊 / 经济学人 / 纽约客那种）的公众号 HTML。
输出**样式全部内联**，复制后可直接粘贴进微信公众平台后台正文区，不会丢样式。

## 效果特点

- 主色刊头条 + 粗框封面 + 粗衬线大标题
- 首字下沉、主色边小标题、居中金句、大数字数据块、主色要点框
- 8 套风格方案，一键整体切换（主色 + 字体 + 字号 + 框线 + 封面版式）
- 主色不是死配色：整套配色由主色自动派生，浅色主色会自动切换深/白文字保证可读

## 两种用法

### 1. 作为 WorkBuddy Skill 安装（推荐）

把整个目录放到：

```
~/.workbuddy/skills/wechat-magazine-typeset/
```

之后直接对 WorkBuddy 说「帮我把这篇文章排成公众号 / 用杂志风排版」，会自动调用。

### 2. 命令行独立使用（不需要任何 skill 环境）

只需要 `scripts/typeset.js` 一个文件，零依赖，装了 Node 就能跑：

```bash
# 最简：输出可直接粘贴的 HTML 片段
node scripts/typeset.js article.md -o out.html --style time

# 输出带手机宽度外壳、可直接预览的完整网页
node scripts/typeset.js article.md -o preview.html --style biz --full

# 查看全部风格方案
node scripts/typeset.js --list-styles
```

元信息既可以写在 Markdown 顶部的 front-matter，也可以用命令行参数传（见下）。

## Markdown 扩展语法

标准 Markdown 全部支持，另扩展：

| 写法 | 效果 |
|---|---|
| `!! 一句话` | 金句：大号居中，上下细线 |
| `@@ 47 分钟 \| 说明文字` | 数据块：主色大数字 + 右栏说明 |
| `::: 框标题` … `:::` | 要点框：主色边框 + 浅底 |
| `==文字==` | 主色标记 |
| `![图注](url)` | 图片 + 灰色图注（alt 即图注） |

正文第一段自动首字下沉。

### 元信息

写在文件顶部 front-matter（本工具专用约定）：

```markdown
---
mast: 深 度
kicker: VOL.01 · 特别报道
title: 主标题
deck: 副标题或导语
by: 文 / 林深
date: 2026年10月25日
cover: https://.../cover.jpg
style: time
---
```

也可用命令行参数覆盖：`--mast --kicker --title --deck --by --date --cover-img`

完整示例见 [`assets/sample-article.md`](assets/sample-article.md)。

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

其他参数：`--red #hex` 自定义主色、`--font serif|sans`、`--size 14-19`、
`--frame 0-6`（0 为无框）、`--cover classic|banner|minimal`、`--no-drop` 关闭首字下沉。

## 目录结构

```
SKILL.md                   skill 说明（供 AI 读取）
README.md                  本文件
scripts/typeset.js         核心：Markdown → 公众号 HTML（CLI + 模块）
assets/editor.html         交互式排版器（左侧写、右侧实时预览、一键复制）
assets/sample-article.md   示例文章，展示全部语法
references/wechat-css.md   微信兼容红线与踩坑记录
```

## 微信兼容性要点

微信会清除 `<style>`、class、外链 CSS，所以本工具**全部内联**。
另外需避开 `position:absolute`、`flex`、`grid`、`figure`，字体只能用系统字体栈。
完整规则与踩坑见 [`references/wechat-css.md`](references/wechat-css.md)。

## 交互式编辑器

用浏览器打开 `assets/editor.html` 即可：左侧填刊头 + 写 Markdown，右侧实时预览，
点「复制到公众号」后到微信后台正文区 `Ctrl+V`。

## License

MIT
