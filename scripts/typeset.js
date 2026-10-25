#!/usr/bin/env node
/**
 * typeset.js — 把 Markdown 排版成「杂志封面风」公众号 HTML（全内联样式，可直接粘贴到微信后台）
 *
 * 用法：
 *   node typeset.js article.md -o out.html --style time --title "标题" --deck "导语"
 *   node typeset.js article.md --style biz --red "#C2185B" --size 17 --cover minimal
 *   node typeset.js --list-styles
 *   cat article.md | node typeset.js - --style econ
 *
 * 元信息也可写在 Markdown 顶部的 front-matter：
 *   ---
 *   mast: 深 度
 *   kicker: VOL.01 · 特别报道
 *   title: 主标题
 *   deck: 副标题/导语
 *   by: 文 / 林深
 *   date: 2026年10月25日
 *   cover: https://.../cover.jpg
 *   style: time
 *   ---
 *
 * 输出：单个 <section> 片段，所有样式内联（微信只保留 inline style）
 */
'use strict';
const fs = require('fs');

/* ─────────── 字体 ─────────── */
const SERIF = '"Songti SC","STSong","SimSun","Source Han Serif SC","Noto Serif CJK SC",Georgia,serif';
const SANS  = '-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue","Microsoft YaHei",sans-serif';

/* ─────────── 颜色工具：由主色派生整套配色 ─────────── */
function hx(c){
  c = String(c || '#E90606').replace('#','').trim();
  if(c.length === 3) c = c.split('').map(x => x + x).join('');
  return [parseInt(c.slice(0,2),16)||0, parseInt(c.slice(2,4),16)||0, parseInt(c.slice(4,6),16)||0];
}
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('');
function mix(a, b, r){ const A = hx(a), B = hx(b); return toHex([0,1,2].map(i => A[i] + (B[i]-A[i])*r)); }
const lum = c => { const a = hx(c); return (0.299*a[0] + 0.587*a[1] + 0.114*a[2]) / 255; };
/** 白底上用作文字的主色：过亮自动加深，保证可读 */
const ink = c => lum(c) > 0.62 ? mix(c, '#000000', 0.5) : c;
/** 主色实底上用的前景色：主色太亮就用深色字，避免"白字看不清" */
const on  = c => lum(c) > 0.58 ? mix(c, '#000000', 0.78) : '#ffffff';

/* ─────────── 风格方案 ─────────── */
const STYLES = [
  {id:'time',   n:'TIME 经典', d:'红框 · 宋体', red:'#E90606', font:'serif', size:16, frame:4, drop:true,  cover:'classic'},
  {id:'econ',   n:'经济学人',  d:'深蓝 · 宋体', red:'#1B3A6B', font:'serif', size:16, frame:3, drop:true,  cover:'classic'},
  {id:'yorker', n:'纽约客墨',  d:'纯黑 · 极简', red:'#1A1A1A', font:'serif', size:17, frame:0, drop:false, cover:'minimal'},
  {id:'natgeo', n:'国家地理',  d:'金黄 · 粗框', red:'#B0801C', font:'sans',  size:16, frame:5, drop:true,  cover:'banner'},
  {id:'biz',    n:'商业周刊',  d:'靛青 · 黑体', red:'#0F5C8C', font:'sans',  size:15, frame:0, drop:false, cover:'banner'},
  {id:'forest', n:'松绿自然',  d:'墨绿 · 温润', red:'#1E6B52', font:'serif', size:16, frame:3, drop:true,  cover:'classic'},
  {id:'rose',   n:'洋红现代',  d:'玫红 · 无框', red:'#C2185B', font:'sans',  size:16, frame:0, drop:true,  cover:'minimal'},
  {id:'slate',  n:'石墨灰',    d:'中性 · 克制', red:'#455A64', font:'serif', size:16, frame:2, drop:false, cover:'classic'}
];

/* ─────────── 样式表（唯一真相源，输出即内联） ─────────── */
function buildStyle(t){
  const BF = t.font === 'serif' ? SERIF : SANS;
  const S  = t.size, FW = t.frame || 0;
  const RB = t.red;                      /* 实底/边框：保持原色 */
  const R  = ink(RB);                    /* 文字用色：过亮自动加深 */
  const SOFT  = mix(RB, '#ffffff', 0.93);
  const SOFT2 = mix(RB, '#ffffff', 0.965);
  const LINE  = mix(RB, '#ffffff', 0.84);
  const ONC   = on(RB);
  return {
    root : `font-family:${BF};font-size:${S}px;line-height:1.8;color:#262626;letter-spacing:.3px;`+
           `word-break:break-word;padding:20px 18px 8px;background:#fff;text-align:left;`,
    cover: FW > 0 ? `border:${FW}px solid ${RB};margin:0 0 26px;`
                  : `border-top:3px solid ${RB};border-bottom:3px solid ${RB};margin:0 0 26px;padding:8px 0;`,
    bar  : `background:${RB};color:${ONC};font-family:${BF};font-size:13px;font-weight:700;`+
           `letter-spacing:4px;padding:9px 14px;display:flex;justify-content:space-between;align-items:center;`,
    barR : `font-weight:400;letter-spacing:1px;opacity:.85;font-size:11px;`,
    barL : `letter-spacing:6px;`,
    cimg : `width:100%;max-width:100%;height:auto;display:block;`,
    ctext: `padding:18px 18px 20px;`,
    kicker  : `color:${R};font-size:12px;font-weight:700;letter-spacing:2px;margin:0 0 10px;font-family:${BF};display:block;`,
    mastline: `color:${R};font-size:12px;font-weight:700;letter-spacing:6px;margin:0 0 12px;font-family:${BF};display:block;`,
    title : `font-family:${BF};font-size:${Math.round(S*1.72)}px;font-weight:900;line-height:1.28;`+
            `letter-spacing:-.5px;margin:0 0 12px;color:#111;`,
    deck  : `font-size:${Math.round(S*.92)}px;line-height:1.7;color:#666;margin:0;font-family:${BF};`,
    byline: `font-size:12px;color:#8a8a8a;letter-spacing:1px;margin:0 0 26px;padding-bottom:14px;`+
            `border-bottom:1px solid ${LINE};font-family:${BF};`,
    byred : `color:${R};font-weight:700;`,
    p     : `margin:0 0 ${Math.round(S*1.15)}px;line-height:1.8;text-align:justify;`,
    pfirst: `margin:0 0 ${Math.round(S*1.15)}px;line-height:1.8;text-align:justify;`,
    drop  : `float:left;font-family:${BF};font-size:${Math.round(S*3.1)}px;line-height:.86;`+
            `font-weight:900;color:${R};margin:4px 9px 0 0;`,
    h2    : `font-family:${BF};font-size:${Math.round(S*1.22)}px;font-weight:900;line-height:1.45;`+
            `margin:${Math.round(S*1.9)}px 0 ${Math.round(S*.85)}px;padding-left:12px;`+
            `border-left:${Math.max(4,FW)}px solid ${RB};color:#1a1a1a;`,
    h3    : `font-family:${BF};font-size:${Math.round(S*1.06)}px;font-weight:900;line-height:1.5;`+
            `margin:${Math.round(S*1.5)}px 0 ${Math.round(S*.7)}px;color:${R};`,
    h1    : `font-family:${BF};font-size:${Math.round(S*1.5)}px;font-weight:900;line-height:1.35;`+
            `margin:${Math.round(S*2)}px 0 ${Math.round(S*.9)}px;color:#111;`,
    quote : `margin:${Math.round(S*1.4)}px 0;padding:14px 16px;background:${SOFT2};`+
            `border-left:${Math.max(3,FW)}px solid ${RB};color:#555;font-size:${Math.round(S*.95)}px;line-height:1.75;`,
    pull  : `margin:${Math.round(S*1.8)}px 0;padding:${Math.round(S*1.1)}px 6px;text-align:center;`+
            `border-top:2px solid ${R};border-bottom:2px solid ${R};`+
            `font-family:${BF};font-size:${Math.round(S*1.45)}px;font-weight:900;line-height:1.45;color:${R};`,
    box   : `margin:${Math.round(S*1.4)}px 0;border:1px solid ${RB};padding:16px 18px;background:${SOFT};`,
    boxt  : `color:${R};font-size:11px;font-weight:700;letter-spacing:2px;margin:0 0 8px;font-family:${BF};`,
    boxp  : `margin:0;font-size:${Math.round(S*.95)}px;line-height:1.75;color:#444;`,
    stat  : `width:100%;border-collapse:collapse;margin:${Math.round(S*1.3)}px 0;`+
            `border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};`,
    statn : `font-family:${BF};font-size:${Math.round(S*2.1)}px;font-weight:900;color:${R};`+
            `line-height:1;padding:14px 16px 14px 0;width:38%;vertical-align:middle;white-space:nowrap;`,
    statx : `font-size:${Math.round(S*.88)}px;color:#666;line-height:1.6;padding:14px 0;vertical-align:middle;`,
    ul    : `margin:0 0 ${Math.round(S*1.15)}px;padding:0;list-style:none;`,
    ol    : `margin:0 0 ${Math.round(S*1.15)}px;padding:0;list-style:none;`,
    li    : `margin:0 0 ${Math.round(S*.55)}px;line-height:1.8;`,
    dot   : `display:inline-block;width:22px;color:${R};font-size:${Math.round(S*.7)}px;vertical-align:2px;font-family:${BF};`,
    num   : `display:inline-block;width:24px;color:${R};font-weight:700;font-size:${Math.round(S*.95)}px;font-family:${BF};`,
    fig   : `margin:${Math.round(S*1.4)}px 0;`,
    img   : `width:100%;max-width:100%;height:auto;display:block;border:0;`,
    cap   : `font-size:12px;color:#9a9a9a;line-height:1.6;margin:8px 0 0;padding-top:7px;`+
            `border-top:1px solid ${LINE};font-family:${BF};`,
    hr    : `border:0;border-top:${Math.max(2,Math.round(FW*0.8))}px solid ${RB};margin:${Math.round(S*2)}px 0;height:0;`,
    strong: `font-weight:900;color:#111;`,
    em    : `font-style:italic;`,
    del   : `text-decoration:line-through;color:#999;`,
    mark_ : `color:${R};font-weight:700;`,
    code  : `background:#f4f4f5;padding:2px 6px;border-radius:3px;font-size:${Math.round(S*.88)}px;`+
            `color:#c0392b;font-family:Consolas,monospace;`,
    link  : `color:${R};text-decoration:underline;`,
    foot  : `margin-top:${Math.round(S*2)}px;padding-top:14px;border-top:3px solid ${R};`+
            `font-size:11px;color:#aaa;letter-spacing:2px;font-family:${BF};text-align:center;`
  };
}

/* ─────────── Markdown 解析 ─────────── */
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function inlineMarkup(s, S){
  let x = esc(s);
  x = x.replace(/`([^`]+)`/g, `<code style="${S.code}">$1</code>`);
  x = x.replace(/==([^=]+)==/g, `<span style="${S.mark_}">$1</span>`);
  x = x.replace(/\*\*([^*]+)\*\*/g, `<strong style="${S.strong}">$1</strong>`);
  x = x.replace(/(^|[^*])\*([^*]+)\*/g, `$1<em style="${S.em}">$2</em>`);
  x = x.replace(/~~([^~]+)~~/g, `<del style="${S.del}">$1</del>`);
  x = x.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="${S.link}">$1</a>`);
  return x;
}
function isBlockStart(l){
  const t = l.trim();
  return !t || /^---+$/.test(t) || /^#{1,6}\s/.test(t) || /^>\s?/.test(t) || /^!!/.test(t) ||
         /^@@/.test(t) || /^:::/.test(t) || /^!\[/.test(t) || /^([-*])\s+/.test(t) || /^\d+\.\s+/.test(t);
}
function parse(md){
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const out = []; let i = 0;
  while(i < lines.length){
    const t = lines[i].trim();
    if(!t){ i++; continue; }
    if(/^---+$/.test(t)){ out.push({t:'hr'}); i++; continue; }
    if(/^:::/.test(t)){
      const title = t.replace(/^:::/,'').trim(); i++;
      const buf = [];
      while(i < lines.length && !/^:::\s*$/.test(lines[i].trim())){ buf.push(lines[i]); i++; }
      i++; out.push({t:'box', title, text: buf.join('\n').trim()}); continue;
    }
    if(/^@@/.test(t)){
      const m = t.slice(2).split('|');
      out.push({t:'stat', num:(m[0]||'').trim(), txt:(m[1]||'').trim()}); i++; continue;
    }
    if(/^!!/.test(t)){ out.push({t:'pull', text:t.slice(2).trim()}); i++; continue; }
    if(/^#{1,6}\s/.test(t)){
      const lv = Math.min(t.match(/^#+/)[0].length, 3);
      out.push({t:'h', lv, text:t.replace(/^#+\s*/,'')}); i++; continue;
    }
    if(/^>\s?/.test(t)){
      const buf = [];
      while(i < lines.length && /^>\s?/.test(lines[i])){ buf.push(lines[i].replace(/^>\s?/,'')); i++; }
      out.push({t:'quote', text: buf.join('\n')}); continue;
    }
    if(/^!\[/.test(t)){
      const m = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(t);
      if(m){ out.push({t:'img', alt:m[1], src:m[2]}); i++; continue; }
    }
    if(/^([-*])\s+/.test(t)){
      const buf = [];
      while(i < lines.length && /^([-*])\s+/.test(lines[i])){ buf.push(lines[i].replace(/^([-*])\s+/,'')); i++; }
      out.push({t:'ul', items:buf}); continue;
    }
    if(/^\d+\.\s+/.test(t)){
      const buf = [];
      while(i < lines.length && /^\d+\.\s+/.test(lines[i])){ buf.push(lines[i].replace(/^\d+\.\s+/,'')); i++; }
      out.push({t:'ol', items:buf}); continue;
    }
    const buf = [];
    while(i < lines.length && !isBlockStart(lines[i])){ buf.push(lines[i].trim()); i++; }
    if(buf.length) out.push({t:'p', text:buf.join('')}); else i++;
  }
  return out;
}

/* ─────────── 渲染（直接内联输出） ─────────── */
function blocksToHTML(blocks, S, t){
  let h = '', firstP = false;
  blocks.forEach(b => {
    if(b.t === 'hr'){ h += `<hr style="${S.hr}">`; return; }
    if(b.t === 'h'){ h += `<h${b.lv} style="${S['h'+b.lv]}">${inlineMarkup(b.text, S)}</h${b.lv}>`; return; }
    if(b.t === 'quote'){ h += `<blockquote style="${S.quote}">${inlineMarkup(b.text, S)}</blockquote>`; return; }
    if(b.t === 'pull'){ h += `<div style="${S.pull}">${inlineMarkup(b.text, S)}</div>`; return; }
    if(b.t === 'box'){
      h += `<div style="${S.box}">` +
           (b.title ? `<div style="${S.boxt}">${esc(b.title)}</div>` : '') +
           `<div style="${S.boxp}">${inlineMarkup(b.text, S)}</div></div>`; return;
    }
    if(b.t === 'stat'){
      h += `<table style="${S.stat}"><tr><td style="${S.statn}">${esc(b.num)}</td>` +
           `<td style="${S.statx}">${inlineMarkup(b.txt, S)}</td></tr></table>`; return;
    }
    if(b.t === 'img'){
      h += `<div style="${S.fig}"><img src="${esc(b.src)}" style="${S.img}" alt="${esc(b.alt)}">` +
           (b.alt ? `<div style="${S.cap}">${inlineMarkup(b.alt, S)}</div>` : '') + `</div>`; return;
    }
    if(b.t === 'ul'){
      h += `<ul style="${S.ul}">` + b.items.map(x =>
        `<li style="${S.li}"><span style="${S.dot}">■</span>${inlineMarkup(x, S)}</li>`).join('') + `</ul>`; return;
    }
    if(b.t === 'ol'){
      h += `<ol style="${S.ol}">` + b.items.map((x, i) =>
        `<li style="${S.li}"><span style="${S.num}">${i+1}.</span>${inlineMarkup(x, S)}</li>`).join('') + `</ol>`; return;
    }
    if(b.t === 'p'){
      if(!firstP && t.drop){
        firstP = true;
        const m = b.text.match(/^(\s*)([^\s，。、？！：；""''）】])/);
        if(m){
          h += `<p style="${S.pfirst}"><span style="${S.drop}">${esc(m[2])}</span>${inlineMarkup(b.text.slice(m[0].length), S)}</p>`;
          return;
        }
      }
      firstP = true;
      h += `<p style="${S.p}">${inlineMarkup(b.text, S)}</p>`;
    }
  });
  return h;
}
function coverHTML(m, S, t){
  if(!m.mast && !m.title && !m.cover) return '';
  const layout = t.cover || 'classic';
  const bar = (m.mast || m.kicker)
    ? `<div style="${S.bar}"><span style="${S.barL}">${esc(m.mast||'')}</span><span style="${S.barR}">${esc(m.kicker||'')}</span></div>`
    : '';
  const img = m.cover ? `<img src="${esc(m.cover)}" style="${S.cimg}">` : '';
  const txt = (m.kicker || m.title || m.deck)
    ? `<div style="${S.ctext}">` +
      (m.kicker ? `<div style="${S.kicker}">${esc(m.kicker)}</div>` : '') +
      (m.title  ? `<h1 style="${S.title}">${esc(m.title)}</h1>` : '') +
      (m.deck   ? `<div style="${S.deck}">${esc(m.deck)}</div>` : '') + `</div>`
    : '';
  let h = `<section style="${S.cover}">`;
  if(layout === 'banner'){
    h += bar + img + txt;                                   /* 通栏压图 */
  }else if(layout === 'minimal'){
    h += `<div style="${S.ctext}">` +
         (m.mast   ? `<div style="${S.mastline}">${esc(m.mast)}</div>` : '') +
         (m.kicker ? `<div style="${S.kicker}">${esc(m.kicker)}</div>` : '') +
         (m.title  ? `<h1 style="${S.title}">${esc(m.title)}</h1>` : '') +
         (m.deck   ? `<div style="${S.deck}">${esc(m.deck)}</div>` : '') +
         `</div>` + img;                                    /* 极简：文字在前，图在后 */
  }else{
    h += bar + img + txt;                                   /* 经典刊头 */
  }
  return h + `</section>`;
}

/** 生成最终 HTML 片段（全内联，可直接粘贴微信后台） */
function render(opt){
  opt = opt || {};
  const st = STYLES.find(s => s.id === String(opt.style || 'time').toLowerCase()) || STYLES[0];
  const t = {
    red  : opt.red   || st.red,
    font : opt.font  || st.font,
    size : opt.size  ? +opt.size  : st.size,
    frame: opt.frame !== undefined && opt.frame !== null ? +opt.frame : st.frame,
    cover: opt.cover || st.cover,
    drop : opt.drop !== undefined ? !!opt.drop : st.drop
  };
  const S = buildStyle(t);
  const m = opt.meta || {};
  let h = `<section style="${S.root}">`;
  h += coverHTML(m, S, t);
  if(m.by || m.date){
    h += `<div style="${S.byline}">` +
         (m.by ? `<span style="${S.byred}">${esc(m.by)}</span>` : '') +
         (m.by && m.date ? `&nbsp;&nbsp;·&nbsp;&nbsp;` : '') + esc(m.date || '') + `</div>`;
  }
  h += blocksToHTML(parse(opt.md || ''), S, t);
  if(m.mast || m.kicker){
    h += `<div style="${S.foot}">${esc(m.mast||'')}${m.mast && m.kicker ? ' · ' : ''}${esc(m.kicker||'')}</div>`;
  }
  return h + `</section>`;
}

/** 包成可预览的完整 HTML 文件（手机宽度居中） */
function wrapDocument(fragment, title){
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title || '公众号排版')}</title>` +
    `<style>body{margin:0;background:#f2f2f3;display:flex;justify-content:center;padding:24px 12px}` +
    `#w{width:100%;max-width:414px;box-shadow:0 2px 24px rgba(0,0,0,.09)}</style></head>` +
    `<body><div id="w">${fragment}</div></body></html>`;
}

/* ─────────── front-matter ─────────── */
function splitFrontMatter(src){
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(src);
  if(!m) return { meta:{}, md:src };
  const meta = {}, lines = m[1].split('\n');
  lines.forEach(l => {
    const kv = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(l.trim());
    if(kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  });
  return { meta, md: src.slice(m[0].length) };
}

/* ─────────── CLI ─────────── */
const USAGE = `typeset.js — 公众号杂志风排版（全内联 HTML）

  node typeset.js <input.md> [选项]

选项:
  -o, --out <file>      输出文件（默认 stdout）
  --full                输出可直接预览的完整 HTML 文件（默认只输出片段）
  --style <id>          风格方案: ${STYLES.map(s=>s.id).join(', ')}
  --red <#hex>          自定义主色（覆盖风格方案）
  --font <serif|sans>   字体
  --size <14-19>        正文字号
  --frame <0-6>         框线粗细（0 = 无框）
  --cover <版式>        classic | banner | minimal
  --no-drop             关闭首字下沉
  --mast / --kicker / --title / --deck / --by / --date / --cover-img <值>
  --list-styles         列出所有风格方案
  -h, --help            显示帮助

元信息也可写在 md 顶部 front-matter（见文件头注释）。`;
function main(argv){
  const a = argv.slice(2);
  if(!a.length || a.includes('-h') || a.includes('--help')){ console.log(USAGE); return 0; }
  if(a.includes('--list-styles')){
    console.log('可用风格方案：');
    STYLES.forEach(s => console.log(`  ${s.id.padEnd(8)} ${s.n.padEnd(6)} ${s.red}  ${s.d}`));
    return 0;
  }
  const get = (...names) => {
    for(const n of names){ const i = a.indexOf(n); if(i > -1 && a[i+1] !== undefined) return a[i+1]; }
    return undefined;
  };
  const has = (...names) => names.some(n => a.includes(n));
  const input = a.find(x => !x.startsWith('-')) || '-';
  const src = input === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(input, 'utf8');

  const fm = splitFrontMatter(src);
  const meta = {
    mast  : get('--mast')      || fm.meta.mast   || '',
    kicker: get('--kicker')    || fm.meta.kicker || '',
    title : get('--title')     || fm.meta.title  || '',
    deck  : get('--deck')      || fm.meta.deck   || '',
    by    : get('--by')        || fm.meta.by     || '',
    date  : get('--date')      || fm.meta.date   || '',
    cover : get('--cover-img') || fm.meta.cover  || ''
  };
  const opt = {
    md: fm.md, meta,
    style: get('--style') || fm.meta.style || 'time',
    red   : get('--red'),
    font  : get('--font'),
    size  : get('--size'),
    frame : get('--frame'),
    cover : get('--cover'),
    drop  : has('--no-drop') ? false : undefined
  };
  const frag = render(opt);
  const out = has('--full') ? wrapDocument(frag, meta.title) : frag;
  const o = get('-o', '--out');
  if(o){ fs.writeFileSync(o, out, 'utf8'); console.error('已生成: ' + o); }
  else console.log(out);
  return 0;
}

module.exports = { render, wrapDocument, buildStyle, parse, STYLES, splitFrontMatter, mix, ink, on, lum };

if(require.main === module) process.exit(main(process.argv));
