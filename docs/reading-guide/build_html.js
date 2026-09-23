/* Build a standalone single-file HTML from the .canvas.tsx by executing its JSX
   tree with a stub `qoder/canvas` module, then rendering that tree to HTML.
   No content is retyped, so numbers cannot drift from the canvas.

   Usage:  node build_html.js [outputPath]

   Requires esbuild-wasm. Set ESBUILD_WASM_DIR if the Qoder IDE copy is not at
   the default location below (npm/npx are not used on purpose: this repo has no
   Node dependency tree of its own). */
const ESBUILD_DIR =
  process.env.ESBUILD_WASM_DIR ||
  'C:/Users/N4G/AppData/Local/Programs/Qoder/resources/extensions/qoder.canvas/dist/node/node_modules/esbuild-wasm';
const esbuild = require(ESBUILD_DIR);
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'source', 'doc-hieu-paper-durian-fair2026.canvas.tsx');
const OUT = process.argv[2] || path.join(__dirname, 'index.html');

/* ---------- light theme tokens (mirrors CanvasTokens paths used by the canvas) ---------- */
const TOKENS = {
  bg: { editor: '#ffffff', chrome: '#f2f4f7', elevated: '#ffffff', sidebar: '#f7f8fa', panel: '#f7f8fa', overlay: '#ffffff', highlight: '#eef1f5', highlightHover: '#e6ebf1' },
  text: { primary: '#1a1d21', secondary: '#55606e', tertiary: '#78838f', quaternary: '#98a2ae', base: '#1a1d21', link: '#0b57d0', onAccent: '#ffffff' },
  stroke: { primary: '#c2c9d2', secondary: '#d6dce4', tertiary: '#e4e8ee', quaternary: '#eef1f5' },
  fill: { primary: '#e8ecf1', secondary: '#eff2f6', tertiary: '#f5f7fa', quaternary: '#fafbfc', disable: '#eceff3' },
  accent: { primary: '#0b57d0', control: '#0b57d0', controlHover: '#0a4cb8', hover: '#e8f0fe', active: '#0a4cb8', focus: '#0b57d0' },
  status: {
    success: '#146c3f', successHover: '#0f5a34', successBg: '#e9f5ee', successBgHover: '#ddf0e6', successBorder: '#b4ddc6',
    warning: '#8a5a06', warningHover: '#744b05', warningBg: '#fdf4e2', warningBgHover: '#fbedd3', warningBorder: '#ecd7a4',
    danger: '#a72b21', dangerHover: '#8e241c', dangerBg: '#fdeeed', dangerBgHover: '#fbe2e0', dangerBorder: '#f0bfba',
    info: '#0b57a8', infoHover: '#094a8f', infoBg: '#e9f1fb', infoBgHover: '#dceaf8', infoBorder: '#b9d4f0',
  },
  chart: {
    blue: '#3b7ddd', lightBlue: '#6fa8e8', teal: '#2f9c95', cyan: '#39b0c7', green: '#2e9e5b', lightGreen: '#6cc08a',
    brightOrange: '#e08a2e', deepOrange: '#c9621c', goldenYellow: '#d9a521', darkAmber: '#a8791a', red: '#d1483f',
    purple: '#7a5cd0', violet: '#9171dd', warmPink: '#d76a9a', warmPeach: '#e8a184', brown: '#8d6a4f',
    muted: '#a9b3c0', neutralLine: '#d6dce4',
    sequence: ['#3b7ddd', '#2e9e5b', '#d9a521', '#d1483f', '#7a5cd0', '#2f9c95', '#e08a2e', '#9171dd'],
  },
  radius: { none: 0, xs: 3, sm: 5, md: 8, lg: 12, xl: 16, full: 9999 },
  shadow: { sm: '0 1px 2px rgba(16,24,40,.06)', md: '0 2px 8px rgba(16,24,40,.08)', lg: '0 8px 24px rgba(16,24,40,.12)' },
  typography: {
    body: { fontSize: '14px', lineHeight: '1.6', fontWeight: 400 },
    small: { fontSize: '12.5px', lineHeight: '1.55', fontWeight: 400 },
    h1: { fontSize: '26px', lineHeight: '1.25', fontWeight: 700 },
    h2: { fontSize: '19px', lineHeight: '1.3', fontWeight: 650 },
    h3: { fontSize: '15.5px', lineHeight: '1.4', fontWeight: 650 },
    mono: { fontSize: '12.5px', lineHeight: '1.5', fontWeight: 400 },
  },
  spacing: {}, fontSize: {}, motion: {},
};

const SPACING = { micro: 4, inline: 8, component: 12, container: 16, sectionCompact: 20, section: 32, reportSection: 40, page: 40 };
const sp = (v, fb) => (typeof v === 'number' ? v : SPACING[v] != null ? SPACING[v] : SPACING[fb]);

/* ---------- JSX factory ---------- */
const OPAQUE = new Set(['Reveal', 'PredictionBox', 'QA', 'DefenseRow']);

function __H(comp, props, ...children) {
  props = props || {};
  const kids = children.flat(Infinity).filter((c) => c !== false && c !== null && c !== undefined && c !== '');
  if (typeof comp === 'function') {
    const nm = comp.name || '';
    if (OPAQUE.has(nm)) return { t: nm, p: { ...props, children: kids.length ? kids : props.children } , k: [] };
    return comp({ ...props, children: kids.length ? kids : props.children });
  }
  let name;
  if (typeof comp === 'string') name = comp;
  else if (comp && comp.__c) name = comp.__c;
  else name = 'Fragment';
  return { t: name, p: props, k: kids };
}
const __F = (props, ...children) => __H('Fragment', props, ...children);

/* ---------- execute the canvas module ---------- */
function loadTree() {
  const src = fs.readFileSync(SRC, 'utf8');
  const res = esbuild.transformSync(src, {
    loader: 'tsx', jsx: 'transform', jsxFactory: '__H', jsxFragment: '__F',
    format: 'cjs', target: 'es2019', sourcefile: 'canvas.tsx',
  });
  const stubBase = {
    useCanvasState: (key, def) => [def, () => {}],
    useHostTheme: () => ({ kind: 'light', tokens: TOKENS, palette: {} }),
    useHostLanguage: () => ({ locale: 'vi-vn', language: 'vi', direction: 'ltr', isChinese: false, isEnglish: false }),
    useLocalizedText: (b) => b.default,
    canvasImage: (s) => s,
    sendToChat: async () => false,
    useSendToChat: () => async () => false,
    useCanvasAction: () => () => {},
    useCanvasTargetFilePath: () => undefined,
    getCanvasTargetFilePath: () => undefined,
  };
  const mod = new Proxy(stubBase, { get: (t, k) => (k in t ? t[k] : { __c: String(k) }) });
  const req = (m) => { if (m === 'qoder/canvas') return mod; throw new Error('unexpected require: ' + m); };
  const module = { exports: {} };
  const fn = new Function('exports', 'require', 'module', '__H', '__F', res.code + '\n;return module.exports;');
  const exp = fn(module.exports, req, module, __H, __F);
  const Root = exp.default;
  if (typeof Root !== 'function') throw new Error('no default export');
  return Root({});
}

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SVG_ATTR = {
  viewBox: 'viewBox', textAnchor: 'text-anchor', fontSize: 'font-size', fontWeight: 'font-weight',
  strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', markerEnd: 'marker-end',
  markerWidth: 'marker-width', markerHeight: 'marker-height', refX: 'refX', refY: 'refY',
  ariaLabel: 'aria-label', clipPath: 'clip-path', fillRule: 'fill-rule', strokeLinecap: 'stroke-linecap',
};
function attrName(n) { return SVG_ATTR[n] || n; }
const VOID = new Set(['br', 'hr', 'img', 'input', 'path', 'rect', 'circle', 'ellipse', 'line', 'use', 'tspan']);

function attrs(p, skip) {
  let out = '';
  for (const k of Object.keys(p || {})) {
    if (k === 'children' || k === 'key' || k === 'dangerouslySetInnerHTML') continue;
    if (skip && skip.has(k)) continue;
    let v = p[k];
    if (v === undefined || v === null || v === false || typeof v === 'function') continue;
    if (k === 'style' && typeof v === 'object') {
      const css = Object.entries(v).map(([a, b]) => `${a.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${typeof b === 'number' && !/^(opacity|zIndex|fontWeight|lineHeight|flex|order|gridColumn|gridRow)/.test(a) ? b + 'px' : b}`).join(';');
      out += ` style="${esc(css)}"`;
      continue;
    }
    if (v === true) { out += ` ${attrName(k)}`; continue; }
    out += ` ${attrName(k)}="${esc(v)}"`;
  }
  return out;
}

let idSeq = 0;
const nextId = (p) => `${p}${++idSeq}`;
let secSeq = 0;

/* ---------- BarChart -> responsive HTML/CSS bars ---------- */
function renderBar(p) {
  const cats = p.categories || [];
  const series = (p.series || []).map((s, i) => ({ ...s, _c: s.color || TOKENS.chart.sequence[i % TOKENS.chart.sequence.length] }));
  let lo = 0, hi = 1;
  if (Array.isArray(p.domain)) {
    const all = series.flatMap((s) => s.data);
    lo = p.domain[0] === 'auto' ? Math.min(0, ...all) : p.domain[0];
    hi = p.domain[1] === 'auto' ? Math.max(...all) : p.domain[1];
  } else {
    hi = Math.max(...series.flatMap((s) => s.data)) * 1.08;
    if (p.includeZero !== false) lo = 0;
    else lo = Math.min(...series.flatMap((s) => s.data)) * 0.96;
  }
  const prec = p.valuePrecision != null ? p.valuePrecision : 2;
  const suf = p.valueSuffix || '';
  const span = hi - lo || 1;
  let h = '<div class="bars">';
  cats.forEach((c, ci) => {
    h += `<div class="bargroup"><div class="barcat">${esc(c)}</div>`;
    series.forEach((s) => {
      const v = s.data[ci];
      const w = Math.max(0.6, Math.min(100, ((v - lo) / span) * 100));
      h += `<div class="barrow"><span class="bartrack"><span class="barfill" style="width:${w.toFixed(2)}%;background:${s._c}"></span></span><span class="barval">${v.toFixed(prec)}${esc(suf)}</span></div>`;
    });
    h += '</div>';
  });
  h += '</div>';
  if (series.length > 1 && p.showLegend !== false) {
    h += '<div class="legend">' + series.map((s) => `<span class="lg"><i style="background:${s._c}"></i>${esc(s.name)}</span>`).join('') + '</div>';
  }
  return h;
}

/* ---------- main renderer ---------- */
let defenseSeq = 0;
const sections = [];

function render(n) {
  if (n === null || n === undefined || n === false || n === true) return '';
  if (typeof n === 'string') return esc(n);
  if (typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(render).join('');
  if (!n.t) return '';

  const p = n.p || {};
  const kids = () => (n.k || []).map(render).join('') + (p.children && !n.k.length ? render(p.children) : '');
  const inner = (p.children != null && (n.k || []).length === 0) ? render(p.children) : (n.k || []).map(render).join('');

  switch (n.t) {
    /* ---- intrinsic ---- */
    case 'svg': case 'rect': case 'path': case 'ellipse': case 'circle': case 'line':
    case 'g': case 'defs': case 'marker': case 'text': case 'tspan': case 'polygon':
      if (n.t === 'svg') return `<svg${attrs(p)}>${inner}</svg>`;
      if (VOID.has(n.t)) return `<${n.t}${attrs(p)}/>`;
      return `<${n.t}${attrs(p)}>${inner}</${n.t}>`;
    case 'b': case 'i': case 'em': case 'strong': case 'code': case 'span': case 'u':
      return `<${n.t}${attrs(p, new Set(['size', 'tone', 'weight', 'as', 'truncate', 'italic']))}>${inner}</${n.t}>`;
    case 'br': return '<br/>';
    case 'Fragment': return inner;

    /* ---- shell ---- */
    case 'ReportShell': return `<main class="shell">${inner}</main>`;
    case 'ReportSection': {
      const sid = 'sec-' + (++secSeq);
      sections.push({ id: sid, title: textOf(p.title) });
      return `<section class="sec" id="${sid}"><div class="sec-h"><h2>${render(p.title)}</h2>` +
        (p.description ? `<p class="sec-d">${render(p.description)}</p>` : '') +
        (p.meta ? `<span class="sec-m">${render(p.meta)}</span>` : '') +
        `</div><div class="sec-b">${inner}</div></section>`;
    }
    case 'Stack': return `<div class="stack"${p.style ? attrs({ style: p.style }) : ''} style="gap:${sp(p.gap, 'component')}px">${inner}</div>`;
    case 'Row': return `<div class="row" style="gap:${sp(p.gap, 'inline')}px${p.wrap === false ? ';flex-wrap:nowrap' : ''}">${inner}</div>`;
    case 'Grid': {
      const cols = typeof p.columns === 'number' ? `repeat(auto-fit,minmax(${p.minColumnWidth || 200}px,1fr))` : p.columns;
      return `<div class="grid" style="grid-template-columns:${cols};gap:${sp(p.gap, 'container')}px">${inner}</div>`;
    }
    case 'Divider': return '<hr class="div"/>';
    case 'Spacer': return '<div class="spacer"></div>';
    case 'H1': return `<h1>${inner}</h1>`;
    case 'H2': return `<h2>${inner}</h2>`;
    case 'H3': return `<h3>${inner}</h3>`;
    case 'Text': {
      const cls = ['txt', p.size === 'small' || p.size === 'sm' ? 'sm' : '', p.tone ? 'tn-' + p.tone : '', p.weight ? 'w-' + p.weight : '', p.italic ? 'it' : ''].filter(Boolean).join(' ');
      const tag = p.as === 'span' ? 'span' : 'p';
      return `<${tag} class="${cls}"${p.style ? attrs({ style: p.style }) : ''}>${inner}</${tag}>`;
    }
    case 'Code': return `<code class="inl">${inner}</code>`;
    case 'Link': return `<a href="${esc(p.href)}" target="_blank" rel="noopener">${inner}</a>`;
    case 'Tag': return `<span class="tag t-${p.tone || 'neutral'}">${inner}</span>`;
    case 'Pill': return `<span class="pill t-${p.tone || 'neutral'}">${inner}</span>`;

    case 'Callout': case 'Banner': {
      const tone = p.tone || p.type || 'info';
      return `<aside class="co co-${tone}">${p.title ? `<div class="co-t">${render(p.title)}</div>` : ''}<div class="co-b">${inner}</div></aside>`;
    }

    case 'Stat': return `<div class="stat st-${p.tone || 'neutral'}"><div class="stat-l">${render(p.label)}</div>` +
      `<div class="stat-v">${render(p.valuePrefix)}${render(p.value)}${p.unit ? `<span class="stat-u">${render(p.unit)}</span>` : ''}${render(p.valueSuffix)}</div>` +
      (p.description ? `<div class="stat-d">${render(p.description)}</div>` : '') +
      (p.change ? `<div class="stat-c">${render(p.change)}</div>` : '') + '</div>';

    case 'MetricsGrid': {
      const items = p.items || p.metrics || [];
      return `<div class="mgrid mg-${p.variant || 'card'}" style="--cols:${p.columns || items.length}">` +
        items.map((m) => `<div class="mi mi-${m.tone || 'neutral'}"><div class="mi-l">${render(m.label)}</div>` +
          `<div class="mi-v">${render(m.value)}${m.valueSuffix ? `<span class="mi-s">${render(m.valueSuffix)}</span>` : ''}${m.unit ? `<span class="mi-u">${render(m.unit)}</span>` : ''}</div>` +
          (m.description ? `<div class="mi-d">${render(m.description)}</div>` : '') + '</div>').join('') + '</div>';
    }

    case 'Table': {
      const heads = p.headers || (p.columns || []).map((c) => c.title || c.header);
      const rows = p.rows || [];
      const cols = p.columns;
      const tone = Array.isArray(p.rowTone) ? p.rowTone : null;
      let h = `<div class="tw"><table class="tb${p.density === 'compact' ? ' dense' : ''}"><thead><tr>` +
        heads.map((x, i) => `<th${cols && cols[i] && cols[i].align ? ` class="al-${cols[i].align}"` : ''}>${render(x)}</th>`).join('') + '</tr></thead><tbody>';
      rows.forEach((r, ri) => {
        const cells = cols ? cols.map((c) => (c.render ? c.render(r, ri) : r[c.key])) : r;
        h += `<tr${tone && tone[ri] && tone[ri] !== 'default' ? ` class="rt-${tone[ri]}"` : ''}>` +
          (Array.isArray(cells) ? cells : [cells]).map((c) => `<td>${render(c)}</td>`).join('') + '</tr>';
      });
      return h + '</tbody></table></div>';
    }

    case 'DocsSection': return `<div class="docs"><h4>${esc(p.title || '')}</h4>${inner}</div>`;

    case 'CollapsibleSection': case 'CollapsibleCard': {
      const open = p.defaultOpen ? ' open' : '';
      return `<details class="coll"${open}><summary><span class="coll-t">${render(p.title)}</span>${p.trailing ? `<span class="coll-x">${render(p.trailing)}</span>` : ''}</summary><div class="coll-b">${inner}</div></details>`;
    }

    case 'ChartContainer': return `<figure class="chart"><figcaption><div class="ch-t">${render(p.title)}</div>` +
      (p.description ? `<div class="ch-d">${render(p.description)}</div>` : '') + '</figcaption>' +
      `<div class="ch-b">${inner}</div>` +
      (p.footer ? `<div class="ch-f">${render(p.footer)}</div>` : '') +
      (p.caption ? `<div class="ch-c">${render(p.caption)}</div>` : '') + '</figure>';

    case 'BarChart': return renderBar(p);

    case 'Timeline': {
      const ev = p.events || [];
      return '<ol class="tl">' + ev.map((e) =>
        `<li class="tl-i tl-${e.state || 'upcoming'} tl-t-${e.tone || 'neutral'}"><div class="tl-mark"></div>` +
        `<div class="tl-c">${e.timestamp ? `<div class="tl-ts">${esc(e.timestamp)}</div>` : ''}` +
        `<div class="tl-ti">${render(e.title)}</div>` +
        (e.description ? `<div class="tl-d">${render(e.description)}</div>` : '') + '</div></li>').join('') + '</ol>';
    }

    case 'ReferencePanel': {
      const items = p.items || [];
      return `<div class="rp"><h4>${esc(p.title || '')}</h4><div class="rp-g" style="--cols:${p.columns || 2}">` +
        items.map((it) => `<div class="rp-i">${it.kind ? `<span class="rp-k">${esc(it.kind)}</span>` : ''}` +
          `<div class="rp-l">${it.href ? `<a href="${esc(it.href)}" target="_blank" rel="noopener">${render(it.label)}</a>` : render(it.label)}</div>` +
          (it.description ? `<div class="rp-d">${render(it.description)}</div>` : '') +
          ((it.source || it.meta) ? `<div class="rp-m">${it.source ? esc(it.source) : ''}${it.source && it.meta ? ' · ' : ''}${it.meta ? esc(it.meta) : ''}</div>` : '') +
          '</div>').join('') + '</div></div>';
    }

    case 'Progress': return `<div class="prog" data-prog="1"><div class="prog-h"><span>${render(p.label || '')}</span><span class="prog-n" data-prog-n>0 / 0</span></div>` +
      `<div class="prog-t"><div class="prog-f" data-prog-f style="width:0%"></div></div></div>`;

    case 'Checkbox': return `<label class="cb"><input type="checkbox" data-check="${esc(p.key || nextId('cb'))}"/><span>${render(p.label)}</span></label>`;

    case 'TextArea': return `<textarea class="ta" rows="${p.rows || 3}" data-pred="${esc(p.id || '')}" placeholder="${esc(p.placeholder || '')}"></textarea>`;

    case 'Button': {
      const lbl = textOf(p.children != null ? p.children : (n.k || []));
      let act = '';
      if (/Hiện tất cả đáp án/.test(lbl)) act = ' data-act="reveal-all-q"';
      else if (/Ẩn tất cả đáp án/.test(lbl)) act = ' data-act="hide-all-q"';
      else if (/Xoá toàn bộ dự đoán/.test(lbl)) act = ' data-act="reset-pred"';
      else if (/Đặt lại checklist/.test(lbl)) act = ' data-act="reset-checks"';
      return `<button class="btn b-${p.variant || 'secondary'}" type="button"${act}>${render(p.children != null ? p.children : (n.k || []))}</button>`;
    }

    case 'SendToChatButton': {
      const lbl = textOf(p.label || '');
      let act = 'copy-ask';
      if (/dự đoán/i.test(lbl)) act = 'copy-pred';
      else if (/tiến độ/i.test(lbl)) act = 'copy-progress';
      return `<button class="btn b-primary" type="button" data-act="${act}">${esc(lbl)}</button>`;
    }

    /* ---- local interactive components ---- */
    case 'QA': {
      const id = String(p.code || '').toLowerCase();
      return `<div class="qa" data-qa="${esc(id)}"><div class="qa-h">` +
        `<span class="tag t-${p.tone || 'neutral'}">${esc(p.level || '')}</span>` +
        `<span class="qa-q">${esc(p.code || '')}. ${esc(p.question || '')}</span>` +
        `<button class="btn b-text" type="button" data-toggle="${esc(id)}">Xem đáp án</button></div>` +
        `<div class="qa-b" data-panel="${esc(id)}"><div class="qa-hint">Trả lời ra giấy hoặc nói thành tiếng trước, rồi mới mở đáp án để đối chiếu.</div>` +
        `<div class="qa-a">${render(p.answer)}</div></div></div>`;
    }

    case 'PredictionBox': {
      const id = String(p.code || '');
      return `<div class="pred" data-predbox="${esc(id)}"><div class="pred-h"><span class="pill t-primary">${esc(id)}</span><span class="pred-q">${esc(p.question || '')}</span></div>` +
        `<textarea class="ta" rows="3" data-pred="${esc(id)}" placeholder="Viết dự đoán của em TRƯỚC KHI bấm hiện đáp án. Ghi cả lý do, không chỉ đoán kết quả."></textarea>` +
        `<button class="btn b-outline sm" type="button" data-toggle="${esc(id)}">Hiện đáp án</button>` +
        `<div class="pred-a" data-panel="${esc(id)}">${render(p.answer)}</div></div>`;
    }

    case 'Reveal': {
      const id = nextId('rv');
      return `<div class="rev"><button class="btn b-outline sm" type="button" data-toggle="${id}">Hiện đáp án</button>` +
        (p.hint ? `<span class="rev-h">${esc(p.hint)}</span>` : '') +
        `<div class="rev-b" data-panel="${id}">${render(p.children)}</div></div>`;
    }

    case 'DefenseRow': {
      const id = 'd' + (++defenseSeq);
      return `<div class="def" data-def="${id}"><div class="def-h"><button class="def-x" type="button" data-toggle="${id}" aria-expanded="false">+</button><span class="def-q">${esc(p.q || '')}</span></div>` +
        `<div class="def-b" data-panel="${id}">` +
        `<aside class="co co-danger"><div class="co-t">Trả lời thế này là mất điểm</div><div class="co-b"><p class="txt sm">${esc(p.wrong || '')}</p></div></aside>` +
        `<aside class="co co-success"><div class="co-t">Trả lời thế này</div><div class="co-b"><p class="txt sm">${esc(p.right || '')}</p></div></aside>` +
        '</div></div>';
    }

    default:
      return inner;
  }
}

function textOf(n) {
  if (n == null || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join('');
  if (n.t) return textOf(n.k && n.k.length ? n.k : n.p && n.p.children);
  return '';
}

/* ---------- assemble ---------- */
const tree = loadTree();
const body = render(tree);

// section nav
const nav = sections.map((s, i) => `<a href="#${s.id}" class="nv">${esc(s.title.replace(/^\d+\.\s*/, ''))}</a>`).join('');

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Đọc hiểu paper FAIR 2026 — Bệnh lá sầu riêng</title>
<meta name="description" content="Tài liệu tự học tiếng Việt cho bài báo FAIR 2026: Cost-Aware Durian Leaf Disease Classification for Vietnamese Orchards."/>
<style>
:root{
 --bg:${TOKENS.bg.editor}; --bg2:${TOKENS.fill.tertiary}; --bg3:${TOKENS.fill.quaternary};
 --fg:${TOKENS.text.primary}; --fg2:${TOKENS.text.secondary}; --fg3:${TOKENS.text.tertiary};
 --bd:${TOKENS.stroke.secondary}; --bd2:${TOKENS.stroke.tertiary};
 --ac:${TOKENS.accent.primary};
 --ok:${TOKENS.status.success}; --okbg:${TOKENS.status.successBg}; --okbd:${TOKENS.status.successBorder};
 --wa:${TOKENS.status.warning}; --wabg:${TOKENS.status.warningBg}; --wabd:${TOKENS.status.warningBorder};
 --da:${TOKENS.status.danger}; --dabg:${TOKENS.status.dangerBg}; --dabd:${TOKENS.status.dangerBorder};
 --in:${TOKENS.status.info}; --inbg:${TOKENS.status.infoBg}; --inbd:${TOKENS.status.infoBorder};
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg2);color:var(--fg);
 font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans Vietnamese",Arial,sans-serif;
 font-size:15px;line-height:1.62}
.shell{max-width:1080px;margin:0 auto;padding:24px 20px 80px}
header{margin-bottom:8px}
h1{font-size:27px;line-height:1.26;margin:6px 0 8px;font-weight:750;letter-spacing:-.2px}
h2{font-size:20px;margin:0;font-weight:700;line-height:1.3}
h3{font-size:16px;margin:18px 0 8px;font-weight:680}
h4{font-size:14.5px;margin:14px 0 6px;font-weight:680}
a{color:var(--ac);text-decoration:none}
a:hover{text-decoration:underline}
code.inl{background:var(--bg3);border:1px solid var(--bd2);border-radius:4px;padding:1px 5px;
 font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;word-break:break-word}
b,strong{font-weight:680}

/* nav */
.nav{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);
 border:1px solid var(--bd2);border-radius:10px;padding:8px 10px;margin-bottom:22px;
 display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.nv{flex:0 0 auto;font-size:12.5px;padding:4px 9px;border-radius:6px;color:var(--fg2);white-space:nowrap;background:var(--bg3)}
.nv:hover{background:var(--inbg);color:var(--in);text-decoration:none}

/* sections */
.sec{background:var(--bg);border:1px solid var(--bd2);border-radius:12px;padding:22px 22px 24px;margin-bottom:20px}
.sec-h{border-bottom:1px solid var(--bd2);padding-bottom:12px;margin-bottom:16px}
.sec-d{margin:6px 0 0;color:var(--fg2);font-size:13.8px}
.sec-m{display:inline-block;margin-top:8px;font-size:12px;color:var(--fg3);background:var(--bg3);
 border:1px solid var(--bd2);border-radius:999px;padding:2px 10px}
.sec-b>*+*{margin-top:14px}
.stack{display:flex;flex-direction:column}
.row{display:flex;flex-wrap:wrap;align-items:center}
.grid{display:grid}
.div{border:0;border-top:1px solid var(--bd2);margin:16px 0}
.spacer{height:8px}

/* text */
.txt{margin:0}
.txt.sm{font-size:13.5px;line-height:1.6}
.tn-secondary{color:var(--fg2)} .tn-tertiary{color:var(--fg3)} .tn-quaternary{color:var(--fg3)}
.w-medium{font-weight:600} .w-semibold{font-weight:680} .w-bold{font-weight:750} .it{font-style:italic}

/* tags & pills */
.tag,.pill{display:inline-block;font-size:11.5px;font-weight:650;border-radius:999px;padding:2px 10px;
 border:1px solid var(--bd);background:var(--bg3);color:var(--fg2);white-space:nowrap}
.pill{font-size:12px;padding:3px 12px}
.t-primary{background:var(--inbg);border-color:var(--inbd);color:var(--in)}
.t-info{background:var(--inbg);border-color:var(--inbd);color:var(--in)}
.t-success{background:var(--okbg);border-color:var(--okbd);color:var(--ok)}
.t-warning{background:var(--wabg);border-color:var(--wabd);color:var(--wa)}
.t-danger{background:var(--dabg);border-color:var(--dabd);color:var(--da)}
.t-neutral{background:var(--bg3);border-color:var(--bd);color:var(--fg2)}

/* callouts */
.co{border:1px solid var(--bd);border-left-width:4px;border-radius:8px;padding:12px 14px;background:var(--bg3)}
.co-t{font-weight:700;font-size:13.8px;margin-bottom:5px}
.co-b .txt+.txt{margin-top:7px}
.co-info{background:var(--inbg);border-color:var(--inbd);border-left-color:var(--in)} .co-info .co-t{color:var(--in)}
.co-success,.co-positive{background:var(--okbg);border-color:var(--okbd);border-left-color:var(--ok)} .co-success .co-t,.co-positive .co-t{color:var(--ok)}
.co-warning,.co-caution{background:var(--wabg);border-color:var(--wabd);border-left-color:var(--wa)} .co-warning .co-t,.co-caution .co-t{color:var(--wa)}
.co-danger,.co-critical{background:var(--dabg);border-color:var(--dabd);border-left-color:var(--da)} .co-danger .co-t,.co-critical .co-t{color:var(--da)}

/* stats & metrics */
.stat{border:1px solid var(--bd2);border-radius:10px;padding:13px 15px;background:var(--bg)}
.stat-l{font-size:12.2px;color:var(--fg3);font-weight:600;letter-spacing:.1px}
.stat-v{font-size:24px;font-weight:750;margin:3px 0 2px;letter-spacing:-.4px}
.stat-u{font-size:13px;font-weight:600;color:var(--fg2);margin-left:4px}
.stat-d{font-size:12.3px;color:var(--fg2);line-height:1.5}
.st-success .stat-v{color:var(--ok)} .st-danger .stat-v{color:var(--da)}
.st-warning .stat-v{color:var(--wa)} .st-primary .stat-v,.st-info .stat-v{color:var(--in)}
.mgrid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:12px}
.mg-header{gap:0;border:1px solid var(--bd2);border-radius:10px;overflow:hidden;background:var(--bg)}
.mg-header .mi{padding:12px 14px;border-right:1px solid var(--bd2)}
.mg-header .mi:last-child{border-right:0}
.mg-card .mi{border:1px solid var(--bd2);border-radius:10px;padding:12px 14px;background:var(--bg)}
.mi-l{font-size:11.8px;color:var(--fg3);font-weight:650;text-transform:none}
.mi-v{font-size:21px;font-weight:750;margin:2px 0;letter-spacing:-.3px}
.mi-s,.mi-u{font-size:12.5px;font-weight:600;color:var(--fg2)}
.mi-d{font-size:12px;color:var(--fg2);line-height:1.45}
.mi-success .mi-v{color:var(--ok)} .mi-danger .mi-v{color:var(--da)}
.mi-warning .mi-v{color:var(--wa)} .mi-info .mi-v,.mi-primary .mi-v{color:var(--in)}

/* tables */
.tw{overflow-x:auto;border:1px solid var(--bd2);border-radius:9px;-webkit-overflow-scrolling:touch}
.tb{border-collapse:collapse;width:100%;font-size:13.5px}
.tb.dense{font-size:12.6px}
.tb th{background:var(--bg3);text-align:left;font-weight:700;padding:9px 11px;border-bottom:1px solid var(--bd);
 color:var(--fg2);font-size:12.3px;white-space:nowrap}
.tb td{padding:9px 11px;border-bottom:1px solid var(--bd2);vertical-align:top}
.tb tbody tr:last-child td{border-bottom:0}
.tb .al-right{text-align:right} .tb .al-center{text-align:center}
tr.rt-success{background:var(--okbg)} tr.rt-danger{background:var(--dabg)}
tr.rt-warning{background:var(--wabg)} tr.rt-info,tr.rt-accent{background:var(--inbg)}
tr.rt-muted{background:var(--bg3)}

/* docs section */
.docs{border-left:3px solid var(--inbd);padding:2px 0 2px 14px}
.docs h4{margin-top:0;color:var(--in)}

/* collapsible */
.coll{border:1px solid var(--bd2);border-radius:9px;background:var(--bg);overflow:hidden}
.coll summary{cursor:pointer;padding:11px 14px;font-weight:680;font-size:14px;list-style:none;
 display:flex;align-items:center;gap:10px;justify-content:space-between;background:var(--bg3)}
.coll summary::-webkit-details-marker{display:none}
.coll summary::before{content:"›";font-size:18px;color:var(--fg3);transform:rotate(0deg);transition:transform .15s;flex:0 0 auto}
.coll[open] summary::before{transform:rotate(90deg)}
.coll-b{padding:14px}

/* charts */
.chart{margin:0;border:1px solid var(--bd2);border-radius:10px;background:var(--bg);padding:14px 16px 12px}
.ch-t{font-weight:700;font-size:14.5px}
.ch-d{font-size:12.8px;color:var(--fg2);margin-top:2px}
.ch-b{margin:14px 0 10px}
.ch-f{font-size:12.8px;color:var(--fg);border-top:1px solid var(--bd2);padding-top:9px;margin-top:4px}
.ch-c{font-size:11.5px;color:var(--fg3);margin-top:6px}
.bars{display:flex;flex-direction:column;gap:12px}
.bargroup{display:flex;flex-direction:column;gap:4px}
.barcat{font-size:12.6px;font-weight:650;color:var(--fg2)}
.barrow{display:flex;align-items:center;gap:9px}
.bartrack{flex:1 1 auto;height:15px;background:var(--bg3);border:1px solid var(--bd2);border-radius:4px;overflow:hidden;min-width:60px}
.barfill{display:block;height:100%;border-radius:3px}
.barval{flex:0 0 auto;font-size:12.2px;font-weight:650;font-variant-numeric:tabular-nums;color:var(--fg);min-width:62px;text-align:right}
.legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:11px;font-size:12px;color:var(--fg2)}
.lg{display:flex;align-items:center;gap:5px}
.lg i{width:10px;height:10px;border-radius:2px;display:block}
svg{max-width:100%;height:auto;display:block}
svg text{font-family:inherit}

/* timeline */
.tl{list-style:none;margin:0;padding:0;position:relative}
.tl::before{content:"";position:absolute;left:6px;top:6px;bottom:6px;width:2px;background:var(--bd)}
.tl-i{position:relative;padding:0 0 16px 26px}
.tl-i:last-child{padding-bottom:0}
.tl-mark{position:absolute;left:0;top:5px;width:14px;height:14px;border-radius:50%;background:var(--bg);border:2px solid var(--bd)}
.tl-current .tl-mark{border-color:var(--ac);background:var(--ac);box-shadow:0 0 0 4px var(--inbg)}
.tl-completed .tl-mark{border-color:var(--ok);background:var(--ok)}
.tl-ts{font-size:11.8px;font-weight:650;color:var(--fg3);letter-spacing:.2px}
.tl-ti{font-size:14.5px;font-weight:680;margin:1px 0 3px}
.tl-d{font-size:13.2px;color:var(--fg2)}
.tl-t-success .tl-ti{color:var(--ok)} .tl-t-danger .tl-ti{color:var(--da)}
.tl-t-warning .tl-ti{color:var(--wa)} .tl-t-info .tl-ti{color:var(--in)}

/* reference panel */
.rp h4{margin-bottom:9px}
.rp-g{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:10px}
.rp-i{border:1px solid var(--bd2);border-radius:9px;padding:11px 13px;background:var(--bg)}
.rp-k{display:inline-block;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;
 color:var(--fg3);background:var(--bg3);border:1px solid var(--bd2);border-radius:4px;padding:1px 6px;margin-bottom:5px}
.rp-l{font-weight:680;font-size:13.6px}
.rp-d{font-size:12.6px;color:var(--fg2);margin-top:3px}
.rp-m{font-size:11.5px;color:var(--fg3);margin-top:5px}

/* interactive */
.btn{font:inherit;font-size:13px;font-weight:650;border-radius:7px;padding:6px 13px;cursor:pointer;
 border:1px solid var(--bd);background:var(--bg);color:var(--fg);white-space:nowrap}
.btn:hover{background:var(--bg3)}
.btn.sm{font-size:12.2px;padding:4px 10px}
.b-primary{background:var(--ac);border-color:var(--ac);color:#fff}
.b-primary:hover{background:#0a4cb8}
.b-secondary{background:var(--bg);border-color:var(--bd)}
.b-outline{background:transparent;border-color:var(--bd)}
.b-text{background:transparent;border-color:transparent;color:var(--ac);padding:4px 8px}
.ta{width:100%;font:inherit;font-size:13.5px;padding:9px 11px;border:1px solid var(--bd);border-radius:8px;
 background:var(--bg);color:var(--fg);resize:vertical;line-height:1.55}
.ta:focus{outline:2px solid var(--inbd);outline-offset:1px;border-color:var(--ac)}
.cb{display:flex;gap:9px;align-items:flex-start;padding:7px 10px;border:1px solid var(--bd2);border-radius:8px;
 background:var(--bg);cursor:pointer;font-size:13.5px}
.cb:hover{background:var(--bg3)}
.cb input{margin-top:3px;flex:0 0 auto;width:15px;height:15px;accent-color:var(--ac)}
.cb.on{background:var(--okbg);border-color:var(--okbd)}

/* prediction / QA / defense */
.pred,.qa{border:1px solid var(--bd2);border-radius:10px;padding:14px 15px;background:var(--bg)}
.pred-h,.qa-h{display:flex;gap:9px;align-items:flex-start;flex-wrap:wrap}
.pred-q,.qa-q{font-weight:650;font-size:14.2px;flex:1 1 300px}
.qa-h .btn{margin-left:auto}
.pred .ta{margin:10px 0}
.qa-b,.pred-a,.rev-b,.def-b{display:none;margin-top:12px;padding-top:12px;border-top:1px dashed var(--bd)}
.qa-b.open,.pred-a.open,.rev-b.open,.def-b.open{display:block}
.qa-hint{font-size:12.5px;color:var(--fg3);font-style:italic;margin-bottom:9px}
.qa-b.open .qa-hint{display:none}
.def{border-bottom:1px solid var(--bd2);padding:9px 0}
.def:last-child{border-bottom:0}
.def-h{display:flex;gap:10px;align-items:flex-start}
.def-x{flex:0 0 auto;width:24px;height:24px;border-radius:6px;border:1px solid var(--bd);background:var(--bg);
 cursor:pointer;font-size:15px;line-height:1;font-weight:700;color:var(--fg2);padding:0}
.def-x:hover{background:var(--bg3);color:var(--ac)}
.def-q{font-weight:680;font-size:14.2px}
.def-b .co+.co{margin-top:9px}
.rev{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.rev-h{font-size:12.3px;color:var(--fg3)}
.rev-b{width:100%;flex-basis:100%}

/* progress */
.prog-h{display:flex;justify-content:space-between;font-size:12.8px;font-weight:650;color:var(--fg2);margin-bottom:6px}
.prog-n{font-variant-numeric:tabular-nums}
.prog-t{height:9px;background:var(--bg3);border:1px solid var(--bd2);border-radius:999px;overflow:hidden}
.prog-f{height:100%;background:var(--ok);border-radius:999px;transition:width .25s}

.foot{margin-top:26px;padding:16px;text-align:center;font-size:12.3px;color:var(--fg3);
 border-top:1px solid var(--bd2)}

@media (max-width:720px){
 body{font-size:14.5px}
 .shell{padding:14px 12px 60px}
 h1{font-size:22px}
 .sec{padding:16px 14px 18px;border-radius:10px}
 .mgrid{grid-template-columns:1fr!important}
 .mg-header .mi{border-right:0;border-bottom:1px solid var(--bd2)}
 .mg-header .mi:last-child{border-bottom:0}
 .rp-g{grid-template-columns:1fr!important}
 .grid{grid-template-columns:1fr!important}
 .barval{min-width:54px;font-size:11.5px}
 .qa-h .btn{margin-left:0}
}
@media print{
 .nav,.btn,.ta{display:none!important}
 .sec{break-inside:avoid;border:0;padding:0 0 12px}
 body{background:#fff}
 .qa-b,.pred-a,.rev-b,.def-b{display:block!important}
}
</style>
</head>
<body>
<nav class="nav" aria-label="Mục lục">${nav}</nav>
<div class="shell-wrap">${body}</div>
<div class="foot">
 Tài liệu tự học · dựng tự động từ canvas <code class="inl">doc-hieu-paper-durian-fair2026.canvas.tsx</code> ·
 mọi số liệu trace về artefact JSON/CSV trong <code class="inl">results/</code>, không nhập tay.<br/>
 Ta Chi Hieu &amp; Vu Thi Thanh Nhai — FAIR 2026, Thuy Loi University.
</div>
<script>
(function(){
 var LS='nhai-durian-reading-v1';
 var store={};
 try{store=JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){store={};}
 function save(){try{localStorage.setItem(LS,JSON.stringify(store));}catch(e){}}

 /* restore textareas */
 document.querySelectorAll('textarea[data-pred]').forEach(function(t){
   var k='p:'+t.getAttribute('data-pred');
   if(store[k])t.value=store[k];
   t.addEventListener('input',function(){store[k]=t.value;save();});
 });

 /* toggles */
 function setPanel(id,open,btn){
   document.querySelectorAll('[data-panel="'+id+'"]').forEach(function(el){
     el.classList.toggle('open',open);
   });
   document.querySelectorAll('[data-toggle="'+id+'"]').forEach(function(b){
     var isDef=b.classList.contains('def-x');
     b.textContent=isDef?(open?'\\u2212':'+'):(open?'Ẩn đáp án':'Hiện đáp án');
     b.setAttribute('aria-expanded',open?'true':'false');
   });
 }
 document.addEventListener('click',function(e){
   var b=e.target.closest('[data-toggle]');
   if(b){
     var id=b.getAttribute('data-toggle');
     var panel=document.querySelector('[data-panel="'+id+'"]');
     var open=panel?!panel.classList.contains('open'):true;
     setPanel(id,open);
     if(!open&&b.classList.contains('def-x'))b.textContent='+';
     e.preventDefault();return;
   }
   var a=e.target.closest('[data-act]');
   if(a){
     var act=a.getAttribute('data-act');
     if(act==='reveal-all-q')document.querySelectorAll('[data-qa]').forEach(function(d){setPanel(d.getAttribute('data-qa'),true);});
     if(act==='hide-all-q')document.querySelectorAll('[data-qa]').forEach(function(d){setPanel(d.getAttribute('data-qa'),false);});
     if(act==='reset-pred'){
       if(confirm('Xoá toàn bộ nội dung dự đoán em đã viết?')){
         Object.keys(store).forEach(function(k){if(k.indexOf('p:')===0)delete store[k];});
         save();document.querySelectorAll('textarea[data-pred]').forEach(function(t){t.value='';});
       }
     }
     if(act==='reset-checks'){
       Object.keys(store).forEach(function(k){if(k.indexOf('c:')===0)delete store[k];});
       save();refresh();
     }
     if(act==='copy-pred'||act==='copy-progress'||act==='copy-ask'){
       var txt='';
       if(act==='copy-pred'){
         var ids=[];document.querySelectorAll('[data-predbox]').forEach(function(d){ids.push(d.getAttribute('data-predbox'));});
         txt='Thầy ơi, đây là phiếu dự đoán trước khi đọc của em cho paper FAIR 2026 (durian leaf).\\nThầy chấm giúp em chỗ nào em hiểu sai ạ:\\n\\n'+
           ids.map(function(i){var t=document.querySelector('textarea[data-pred="'+i+'"]');return i+': '+(((t&&t.value)||'(chưa viết)').trim());}).join('\\n');
       }else if(act==='copy-progress'){
         var all=document.querySelectorAll('input[data-check]');
         var done=[],todo=[];
         all.forEach(function(c){(c.checked?done:todo).push(c.parentNode.querySelector('span').textContent.trim());});
         txt='Tiến độ đọc hiểu paper FAIR 2026 của em: '+done.length+'/'+all.length+' mục.\\nĐã xong: '+(done.join(' | ')||'(chưa có)')+'\\nChưa xong: '+(todo.join(' | ')||'(không)');
       }else{
         txt='Thầy ơi, em đang đọc paper FAIR 2026 (durian leaf) và chưa hiểu chỗ này: ';
       }
       if(navigator.clipboard&&navigator.clipboard.writeText){
         navigator.clipboard.writeText(txt).then(function(){flash(a,'Đã sao chép — dán vào chat/gmail gửi thầy');},function(){fallback(txt);});
       }else fallback(txt);
       function fallback(s){
         var w=window.open('','_blank');
         if(w){w.document.write('<pre style="font:14px/1.6 monospace;white-space:pre-wrap;padding:20px">'+s.replace(/[<>&]/g,function(c){return{'<':'&lt;','>':'&gt;','&':'&amp;'}[c];})+'</pre>');}
         else prompt('Sao chép nội dung này:',s);
       }
     }
     e.preventDefault();
   }
 });
 function flash(btn,msg){
   var old=btn.textContent;btn.textContent=msg;btn.disabled=true;
   setTimeout(function(){btn.textContent=old;btn.disabled=false;},2200);
 }

 /* checklist + progress */
 function refresh(){
   var boxes=document.querySelectorAll('input[data-check]');
   var done=0;
   boxes.forEach(function(c){
     var k='c:'+c.getAttribute('data-check');
     c.checked=!!store[k];
     c.closest('.cb').classList.toggle('on',c.checked);
     if(c.checked)done++;
   });
   document.querySelectorAll('[data-prog]').forEach(function(p){
     var n=p.querySelector('[data-prog-n]'),f=p.querySelector('[data-prog-f]');
     if(n)n.textContent=done+' / '+boxes.length;
     if(f)f.style.width=(boxes.length?(done/boxes.length*100):0).toFixed(1)+'%';
   });
 }
 document.querySelectorAll('input[data-check]').forEach(function(c){
   c.addEventListener('change',function(){store['c:'+c.getAttribute('data-check')]=c.checked;save();refresh();});
 });
 refresh();
})();
</script>
</body>
</html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('WROTE', OUT, '|', (html.length / 1024).toFixed(1) + ' KB', '|', sections.length, 'sections');
