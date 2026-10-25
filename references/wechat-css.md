# 微信公众号 HTML 兼容规则

生成任何要粘贴进公众号后台的 HTML 时，必须遵守以下规则。这些是实测与踩坑总结，
违反其中任何一条都会导致「本地好看、粘贴后样式全丢」。

## 一、样式必须全部内联

公众号编辑器（UEditor 内核）会过滤：

- `<style>` 标签 —— **全部清除**
- `class` / `id` 选择器 —— **全部清除**
- 外链 CSS、`@import`、`@font-face` —— 不支持

因此：每个元素都要自带 `style="..."` 属性。

生成流程推荐：先用「样式表对象」集中定义每种角色的样式，渲染时直接写成 `style` 属性，
不要依赖任何 class。

## 二、会被过滤或不可靠的 CSS

| 写法 | 结论 | 替代方案 |
|---|---|---|
| `position: absolute/relative` | 常被过滤 | 用 `display:inline-block` + `width` 做缩进与对齐 |
| `flex` / `grid` | 编辑器可能改写 | 块级元素堆叠；多列用 `<table>` |
| `figure` / `figcaption` | 支持不稳定 | 改用 `div` |
| `float` | **保留可用**（首字下沉依赖它） | 可用，但不要用于整体布局 |
| `!important` | 可能被清除 | 不要依赖 |
| CSS 变量 `var()` | 不支持 | 直接写死色值 |
| 自定义字体 | 不支持 | 只能用系统字体栈 |

## 三、字体只能用系统字体栈

```css
/* 衬线（杂志感） */
font-family:"Songti SC","STSong","SimSun","Source Han Serif SC","Noto Serif CJK SC",Georgia,serif;
/* 无衬线（现代） */
font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue","Microsoft YaHei",sans-serif;
```

注意：字体名里的双引号在写入 `style="..."` 属性时会被序列化成 `&quot;`，这是正常的，浏览器能正确解析。

## 四、图片

- 写法：`style="width:100%;max-width:100%;height:auto;display:block;border:0;"`
- 粘贴外部 URL 图片时，微信会自动抓取并上传到素材库
- 用 `table` 布局做图文混排最稳

## 五、链接

公众号**正文不支持超链接**（除了白名单与「阅读原文」）。`<a>` 标签保留但无法跳转。
因此：正文中若需引导，写成文字 + 说明，或放「阅读原文」。

## 六、可选标签建议

- 容器用 `<section>` / `<div>` —— 支持最好
- 引用用 `<blockquote>` —— 支持
- 表格用 `<table><tr><td>` —— 支持（浏览器会自动补 `<tbody>`，无影响）
- 分隔用 `<hr>` —— 支持
- 列表用 `<ul>/<ol>/<li>` 并显式设置 `list-style:none` + 自定义符号 span（默认符号样式常被重置）

## 七、交付前的自检清单

生成 HTML 后逐项确认：

1. 不含 `data-role`、`class=`、`id=` 等中间态属性（若有，说明样式没内联完）
2. 不含 `<style>` 标签
3. 每个可见元素都带 `style` 属性
4. 颜色写死为 hex，不使用 CSS 变量
5. 无 `position:absolute`、`flex`、`grid`
6. 图片有 `max-width:100%`

## 八、复制到剪贴板

浏览器里写入富文本到剪贴板的两条路，必须都实现并回退：

```js
// 1) 首选：异步剪贴板 API（需要 https 或 localhost，file:// 下不可用）
await navigator.clipboard.write([new ClipboardItem({
  'text/html': new Blob([html], {type:'text/html'}),
  'text/plain': new Blob([text], {type:'text/plain'})
})]);

// 2) 回退：隐藏 contentEditable + execCommand（file:// 下也能用）
const d = document.createElement('div');
d.contentEditable = 'true'; d.innerHTML = html;
d.style.cssText = 'position:fixed;left:-99999px;top:0;';
document.body.appendChild(d);
const r = document.createRange(); r.selectNodeContents(d);
const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
const ok = document.execCommand('copy');
s.removeAllRanges(); d.remove();
```

## 九、本工具踩过的坑（勿重蹈）

1. **不要在 iframe 预览里靠注入 `<style>` 渲染**：某些嵌入环境会拦截内联样式表，
   导致预览没样式。正确做法是预览与导出走同一条路径，直接输出内联 HTML。
2. **不要把渲染依赖的状态只存在 `localStorage`**：iframe/沙箱下访问会抛 SecurityError，
   写不进也读不回，表现为「切换主题无效、永远回退默认值」。
   正确做法：内存对象为准，`localStorage` 仅作尽力持久化，必要时再写 URL hash 兜底。
3. **批量替换字符串时小心替换到函数自身实现**：例如把 `localStorage.getItem(` 全量替换成
   `LS.get(` 时，会把 `LS.get` 内部的调用也替换掉，形成无限递归且被 try/catch 静默吞掉。
4. **`setAttribute('style', v)` 会整体覆盖**：所以不能在生成好的 HTML 里手写 `style` 期望它保留，
   所有样式必须来自同一份样式表。
