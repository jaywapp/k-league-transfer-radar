#!/usr/bin/env node
// Builds the brand kit for the selected "route" concept: SVG sources, PNG exports,
// favicon set, social image and application examples.
// Needs headless Chrome/Chromium and ffmpeg on PATH. Run from the repository root:
//   node branding/scripts/build-kit.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const run = promisify(execFile);
const root = resolve('branding');
const kit = join(root, 'kit');
const fontUrl = pathToFileURL(join(root, 'assets', 'PretendardVariable.woff2')).href;
const tmp = join(os.tmpdir(), `ktr-kit-${process.pid}`);

// ---------- colors ----------
const C = {
  ink: '#121823', ink2: '#434c5c', paper: '#f4f5f7', surface: '#ffffff', line: '#dfe2e8',
  dInk: '#e9edf3', dInk2: '#c0c7d2', dMuted: '#8f99a9', dPaper: '#0c0f14', dSurface: '#151a22', dLine: '#252c38',
};
const VARIANTS = {
  light: { fg: C.ink, halo: 0.12 },
  dark: { fg: C.dInk, halo: 0.16 },
  'mono-black': { fg: '#000000', halo: 0 },
  'mono-white': { fg: '#ffffff', halo: 0 },
};

// ---------- symbol geometry (1024 grid; tight box 216,294 - 808,724) ----------
const ARC = 'M300 540 Q512 220 724 540';
const BOX = { x: 216, y: 294, w: 592, h: 430 };
// The arc is cut around the "now" marker so the marker needs no fill and works on any background.
function symbolInner(v, id) {
  const { fg, halo } = VARIANTS[v];
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#fff"/><circle cx="512" cy="380" r="80" fill="#000"/></mask></defs>
  <circle cx="300" cy="640" r="84" fill="${fg}"/>
  <path d="${ARC}" fill="none" stroke="${fg}" stroke-width="32" stroke-dasharray="44 40" stroke-linecap="round" mask="url(#${id})"/>
  <circle cx="724" cy="640" r="66" fill="none" stroke="${fg}" stroke-width="36"/>
  ${halo ? `<circle cx="512" cy="380" r="75.5" fill="none" stroke="${fg}" stroke-opacity="${halo}" stroke-width="21"/>` : ''}
  <circle cx="512" cy="380" r="50" fill="none" stroke="${fg}" stroke-width="30"/>`;
}
const svgOpen = (w, h, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">\n  <title>${title}</title>\n`;
const fontAttr = `font-family="Pretendard, 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"`;

function symbol(v) {
  return `${svgOpen(BOX.w, BOX.h, 'K리그 이적 레이더 심벌')}  <g transform="translate(${-BOX.x} ${-BOX.y})">
  ${symbolInner(v, 'cut')}
  </g>
</svg>
`;
}
// Horizontal lockup: symbol height 56, Korean wordmark 30px, English line 13px.
function logoH(v) {
  const s = 56 / BOX.h, fg = VARIANTS[v].fg;
  const sub = v === 'light' ? C.ink2 : v === 'dark' ? C.dInk2 : fg;
  return `${svgOpen(316, 56, 'K리그 이적 레이더 가로 로고')}  <g transform="scale(${s.toFixed(5)}) translate(${-BOX.x} ${-BOX.y})">
  ${symbolInner(v, 'cut')}
  </g>
  <text x="94" y="29" ${fontAttr} font-size="30" font-weight="800" letter-spacing="-0.9" fill="${fg}">K리그 이적 레이더</text>
  <text x="95" y="51" ${fontAttr} font-size="13" font-weight="500" letter-spacing="0.2" fill="${sub}">K League Transfer Radar</text>
</svg>
`;
}
// Vertical lockup: symbol height 96 centered over the wordmark.
function logoV(v) {
  const s = 96 / BOX.h, fg = VARIANTS[v].fg, w = 240;
  const sub = v === 'light' ? C.ink2 : v === 'dark' ? C.dInk2 : fg;
  const sw = BOX.w * s;
  return `${svgOpen(w, 170, 'K리그 이적 레이더 세로 로고')}  <g transform="translate(${((w - sw) / 2).toFixed(2)} 0) scale(${s.toFixed(5)}) translate(${-BOX.x} ${-BOX.y})">
  ${symbolInner(v, 'cut')}
  </g>
  <text x="${w / 2}" y="140" text-anchor="middle" ${fontAttr} font-size="28" font-weight="800" letter-spacing="-0.8" fill="${fg}">K리그 이적 레이더</text>
  <text x="${w / 2}" y="164" text-anchor="middle" ${fontAttr} font-size="12" font-weight="500" letter-spacing="0.2" fill="${sub}">K League Transfer Radar</text>
</svg>
`;
}
// App icon: full-bleed tile, symbol scaled 1.12x around the tile center to fill the 66% safe zone.
function appIcon(v) {
  const bg = v === 'dark' ? C.ink : C.paper;
  const k = 1.12, cx = BOX.x + BOX.w / 2, cy = BOX.y + BOX.h / 2;
  return `${svgOpen(1024, 1024, 'K리그 이적 레이더 앱 아이콘')}  <rect width="1024" height="1024" fill="${bg}"/>
  <g transform="translate(512 512) scale(${k}) translate(${-cx} ${-cy})">
  ${symbolInner(v, 'cut')}
  </g>
</svg>
`;
}
// Favicon: redrawn on a 32 grid; ink tile so it reads on light and dark browser chrome.
const favicon = `${svgOpen(32, 32, 'K리그 이적 레이더')}  <rect width="32" height="32" rx="7" fill="${C.ink}"/>
  <circle cx="8.5" cy="22" r="4.2" fill="#ffffff"/>
  <path d="M10.4 15.6 L12.6 12.6 M19.4 12.6 L21.6 15.6" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="23.5" cy="22" r="3.3" fill="none" stroke="#ffffff" stroke-width="2.4"/>
  <circle cx="16" cy="9.6" r="3.2" fill="none" stroke="#ffffff" stroke-width="2.4"/>
</svg>
`;

// ---------- pages ----------
const fontFace = (url) => `@font-face{font-family:"Pretendard";src:url("${url}") format("woff2");font-weight:100 900;font-display:block}`;
// Pages live in kit/<dir>/, so the bundled font is two levels up.
const page = (body, css, bg) => `<!doctype html><html lang="ko"><meta charset="utf-8"><style>${fontFace('../../assets/PretendardVariable.woff2')}
*{box-sizing:border-box}html,body{margin:0;background:${bg}}body{font-family:Pretendard,"Malgun Gothic",sans-serif;word-break:keep-all;-webkit-font-smoothing:antialiased}
${css}</style>${body}</html>`;

// Stage track used in examples (same rules as docs/design/components.md: dashed past stations for rumors).
const track = (stage, color, at, dark) => {
  const line = dark ? C.dLine : C.line;
  const pct = at / 4 * 100;
  const st = [0, 1, 2, 3, 4].map((i) => `<i style="left:${i * 25}%;${i <= at ? `background:${color};border-color:${color}` : `background:${dark ? C.dSurface : C.surface};border-color:${line}`}"></i>`).join('');
  return `<span class="trk"><span class="trk__l" style="background:${line}"></span><span class="trk__f" style="width:${pct}%;${stage === 'confirmed' ? `background:${color}` : `background:repeating-linear-gradient(90deg,${color} 0 8px,transparent 8px 13px)`}"></span>${st}<b style="left:${pct}%;background:${color};box-shadow:0 0 0 6px ${color}33"></b></span>`;
};

function appPage(theme, width) {
  const d = theme === 'dark';
  const t = d ? { bg: C.dPaper, sf: C.dSurface, ink: C.dInk, ink2: C.dInk2, mut: C.dMuted, line: C.dLine, neg: '#f2c46b', negBg: '#33270f', ok: '#4cc77f', okInk: '#06210f' }
    : { bg: C.paper, sf: C.surface, ink: C.ink, ink2: C.ink2, mut: '#6a7384', line: C.line, neg: '#8a5a00', negBg: '#fdf2dc', ok: '#157a3d', okInk: '#ffffff' };
  const narrow = width < 600;
  // Fixed body width: headless Chrome keeps a wider minimum viewport than a phone.
  const css = `body{width:${width}px;overflow:hidden}
.hd{display:flex;align-items:center;gap:12px;padding:14px ${narrow ? 16 : 32}px;background:${t.sf};border-bottom:1px solid ${t.line}}
.hd img{height:28px;width:auto;display:block}.hd .nm{font-size:17px;font-weight:800;letter-spacing:-.02em;color:${t.ink}}
.hd .tag{font-size:12px;font-weight:600;color:${t.ink2};border:1px solid ${t.line};border-radius:999px;padding:3px 10px}
.hd .sp{flex:1}.hd .win{font-size:13px;font-weight:700;color:${t.ink};background:${t.bg};border:1px solid ${t.line};border-radius:999px;padding:6px 12px}
.wrap{padding:${narrow ? 16 : 28}px ${narrow ? 16 : 32}px;display:grid;gap:16px;grid-template-columns:${narrow ? '1fr' : 'minmax(0,1.35fr) minmax(0,1fr)'};align-items:start}
.sec{background:${t.sf};border-radius:16px;padding:18px 20px;display:grid;gap:4px}
.ttl{margin:0 0 6px;font-size:22px;font-weight:800;color:${t.ink};letter-spacing:-.02em}.ttl small{font-size:13px;font-weight:600;color:${t.ink2};margin-left:8px}
.row{display:grid;grid-template-columns:${narrow ? '36px minmax(0,1fr)' : '36px 150px minmax(0,1fr)'};gap:${narrow ? '6px 12px' : '14px'};align-items:center;padding:10px 0;border-top:1px solid ${t.line}}
.av{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;background:${t.bg};color:${t.ink};border:1px solid ${t.line}}
.who b{display:block;font-size:15px;font-weight:800;color:${t.ink}}.who small{font-size:12px;color:${t.ink2}}
.row .trk{${narrow ? 'grid-column:1/-1' : ''}}
.trk{position:relative;height:30px;display:block;margin:0 12px}.trk__l,.trk__f{position:absolute;left:0;top:14px;height:4px;border-radius:2px}.trk__l{right:0}
.trk i{position:absolute;top:10px;width:12px;height:12px;margin-left:-6px;border-radius:50%;border:2px solid}
.trk b{position:absolute;top:6px;width:20px;height:20px;margin-left:-10px;border-radius:50%}
.det h3{margin:0;font-size:12px;font-weight:700;color:${t.mut};letter-spacing:.04em}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:800;border-radius:999px;padding:4px 12px;border:1.5px dashed ${t.neg};color:${t.neg};background:${t.negBg};justify-self:start}
.hist{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:10px}.hist li{border-left:2px solid ${t.line};padding-left:12px}
.hist time{font-size:12px;color:${t.mut}}.hist p{margin:2px 0 0;font-size:14px;color:${t.ink}}.hist p b{font-weight:800}
.note{font-size:12px;color:${t.ink2};padding:0 ${narrow ? 16 : 32}px 20px}`;
  const logo = `../svg/ktr-symbol-${d ? 'dark' : 'light'}.svg`;
  const rows = [
    ['한', '한도윤', '구단 B에서 영입', 'negotiation', t.neg, 2],
    ['서', '서민재', '구단 C에서 영입', 'confirmed', t.ok, 4],
  ].map(([a, n, w, s, c, at]) => `<div class="row"><span class="av">${a}</span><span class="who"><b>${n}</b><small>${w}</small></span>${track(s, c, at, d)}</div>`).join('');
  const body = `<header class="hd"><img src="${logo}" alt=""><span class="nm">${narrow ? '이적 레이더' : 'K리그 이적 레이더'}</span>${narrow ? '' : '<span class="tag">독립 팬 서비스</span>'}<span class="sp"></span><span class="win">2027 겨울</span></header>
<div class="wrap"><section class="sec"><p class="ttl">구단 A<small>영입 2</small></p>${rows}</section>
${narrow ? '' : `<section class="sec det"><h3>현재 위치</h3><span class="badge">협상설</span><ol class="hist"><li><time>10월 15일 15:30</time><p><b>협상설 반영</b> · 독립 출처 2곳</p></li><li><time>10월 14일 09:10</time><p><b>접촉 주장</b> · 지역 언론</p></li></ol></section>`}</div>
<p class="note">예시 화면 · 가상 선수와 가상 소식입니다.</p>`;
  return page(body, css, t.bg);
}

function socialPage() {
  const css = `.og{width:1200px;height:630px;display:grid;grid-template-columns:1fr 470px;gap:56px;align-items:center;padding:0 72px;background:${C.paper};color:${C.ink}}
.l img{width:150px;display:block;margin-bottom:36px}.l h1{margin:0;font-size:64px;font-weight:800;letter-spacing:-.035em;line-height:1.1}
.l p{margin:18px 0 0;font-size:26px;font-weight:500;color:${C.ink2};line-height:1.45}.l .ind{margin-top:30px;font-size:18px;font-weight:600;color:${C.ink2}}
.card{background:${C.surface};border-radius:24px;padding:28px 30px;box-shadow:0 18px 50px #0b18331f,0 0 0 1px ${C.line};display:grid;gap:14px}
.card .lab{font-size:15px;font-weight:700;color:${C.ink2}}.card .nm{font-size:30px;font-weight:800}.card .rt{font-size:18px;color:${C.ink2}}
.trk{position:relative;height:36px;display:block;margin:6px 14px 0}.trk__l,.trk__f{position:absolute;left:0;top:16px;height:5px;border-radius:3px}.trk__l{right:0}
.trk i{position:absolute;top:11px;width:15px;height:15px;margin-left:-7.5px;border-radius:50%;border:2.5px solid}.trk b{position:absolute;top:6px;width:25px;height:25px;margin-left:-12.5px;border-radius:50%}
.st{display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:#6a7384;margin:0 2px}
.badge{justify-self:start;font-size:18px;font-weight:800;border-radius:999px;padding:5px 14px;border:2px dashed #8a5a00;color:#8a5a00;background:#fdf2dc}`;
  const body = `<div class="og"><div class="l"><img src="../svg/ktr-symbol-light.svg" alt=""><h1>K리그 이적 레이더</h1><p>구단별 이적 소식을<br>출처와 검토 상태와 함께</p><p class="ind">독립 팬 서비스 · 구단·리그 공식 서비스가 아닙니다</p></div>
<div class="card"><span class="lab">예시 · 가상 선수와 가상 소식</span><span class="nm">한도윤</span><span class="rt">구단 B → 구단 A</span>${track('negotiation', '#8a5a00', 2, false)}<span class="st"><span>관심</span><span>접촉</span><span>협상</span><span>임박</span><span>확정</span></span><span class="badge">협상설</span></div></div>`;
  return page(body, css, C.paper);
}

// Guide sheet: clear space and minimum size, rendered for the guide.
function clearSpacePage() {
  const css = `.sh{width:1000px;height:420px;background:${C.surface};display:grid;grid-template-columns:1.3fr 1fr;gap:40px;padding:40px;color:${C.ink}}
.box{position:relative;display:grid;place-items:center;background:${C.paper};border-radius:12px}
.cs{position:relative;padding:25px;outline:1.5px dashed #6a7384;outline-offset:0}.cs img{display:block;height:64px}
.cs::before{content:"";position:absolute;inset:25px;outline:1px solid #6a738466}
.x{position:absolute;left:0;top:0;width:25px;height:25px;background:#6a738433}
.lbl{position:absolute;left:14px;top:12px;font-size:14px;font-weight:700;color:${C.ink2}}
.min{display:flex;gap:28px;align-items:flex-end}.min figure{margin:0;display:grid;gap:8px;justify-items:center;font-size:13px;color:${C.ink2}}`;
  const body = `<div class="sh"><div class="box"><span class="lbl">여백: 로고 둘레에 출발 원 지름(x)만큼</span><div class="cs"><span class="x"></span><img src="../png/ktr-logo-h-light@2x.png" alt=""></div></div>
<div class="box"><span class="lbl">최소 크기</span><div class="min"><figure><img src="../png/ktr-logo-h-light@2x.png" style="height:40px" alt=""><span>가로 로고 높이 40px</span></figure><figure><img src="../svg/ktr-symbol-light.svg" style="height:18px" alt=""><span>심벌 18px</span></figure><figure><img src="../favicon/ktr-favicon.svg" style="height:16px" alt=""><span>파비콘 16px</span></figure></div></div></div>`;
  return page(body, css, C.surface);
}

// ---------- render ----------
function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const pw = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ms-playwright') : join(os.homedir(), '.cache', 'ms-playwright');
  if (existsSync(pw)) {
    for (const b of readdirSync(pw).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      for (const sub of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        if (existsSync(join(pw, b, sub))) return join(pw, b, sub);
      }
    }
  }
  for (const p of ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium']) if (existsSync(p)) return p;
  throw new Error('Chrome not found. Set CHROME_PATH.');
}
const chrome = findChrome();
let seq = 0;
// Headless Chrome will not shrink the viewport below ~400px tall, so short shots are taken tall and cropped.
async function shot(url, out, w, h, transparent = false) {
  if (h < 400) {
    const big = join(tmp, `tall${seq++}.png`);
    await shot(url, big, w, 400, transparent);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', big, '-vf', `crop=${w}:${h}:0:0`, out]);
    return;
  }
  const profile = join(tmp, `p${seq++}`);
  const a = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', `--user-data-dir=${profile}`,
    '--allow-file-access-from-files', '--force-device-scale-factor=1', '--virtual-time-budget=3000', `--window-size=${w},${h}`, `--screenshot=${out}`];
  if (transparent) a.push('--default-background-color=00000000');
  await run(chrome, [...a, url], { timeout: 60000 });
  rmSync(profile, { recursive: true, force: true });
  if (!existsSync(out)) throw new Error(`missing ${out}`);
}
// Wrap an SVG file in a page sized to the output, so text uses the bundled font.
async function svgPng(svgPath, out, w, h, bg) {
  const html = join(tmp, `s${seq}.html`);
  // An <img> SVG cannot load web fonts, so the markup is inlined.
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${fontFace(fontUrl)}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${bg || 'transparent'}}svg{display:block;width:${w}px;height:${h}px}</style>${readFileSync(svgPath, 'utf8')}`);
  await shot(pathToFileURL(html).href, out, w, h, !bg);
}

const dirs = ['svg', 'png', 'favicon', 'social', 'examples'].map((d) => join(kit, d));
// Clear generated files but keep the kit folder itself (it may be open in another program).
if (existsSync(kit)) for (const f of readdirSync(kit)) rmSync(join(kit, f), { recursive: true, force: true });
dirs.forEach((d) => mkdirSync(d, { recursive: true }));
mkdirSync(tmp, { recursive: true });

const W = (p, s) => writeFileSync(join(kit, p), s, 'utf8');
for (const v of Object.keys(VARIANTS)) {
  W(`svg/ktr-symbol-${v}.svg`, symbol(v));
  W(`svg/ktr-logo-h-${v}.svg`, logoH(v));
  W(`svg/ktr-logo-v-${v}.svg`, logoV(v));
}
W('svg/ktr-app-icon-light.svg', appIcon('light'));
W('svg/ktr-app-icon-dark.svg', appIcon('dark'));
W('favicon/ktr-favicon.svg', favicon);
W('social/og.html', socialPage());
for (const th of ['light', 'dark']) for (const w of [1280, 390]) W(`examples/app-${th}-${w}.html`, appPage(th, w));
W('examples/clear-space.html', clearSpacePage());

const jobs = [];
const P = (p) => join(kit, p);
for (const v of Object.keys(VARIANTS)) {
  jobs.push(svgPng(P(`svg/ktr-logo-h-${v}.svg`), P(`png/ktr-logo-h-${v}@2x.png`), 632, 112));
  jobs.push(svgPng(P(`svg/ktr-logo-v-${v}.svg`), P(`png/ktr-logo-v-${v}@2x.png`), 480, 340));
  jobs.push(svgPng(P(`svg/ktr-symbol-${v}.svg`), P(`png/ktr-symbol-${v}-512.png`), 512, Math.round(512 * BOX.h / BOX.w)));
}
for (const v of ['light', 'dark']) for (const s of [1024, 512, 192]) jobs.push(svgPng(P(`svg/ktr-app-icon-${v}.svg`), P(`png/ktr-app-icon-${v}-${s}.png`), s, s, '#000'));
jobs.push(svgPng(P('svg/ktr-app-icon-light.svg'), P('favicon/apple-touch-icon.png'), 180, 180, '#000'));
for (const s of [16, 32, 48]) jobs.push(svgPng(P('favicon/ktr-favicon.svg'), P(`favicon/favicon-${s}.png`), s, s));
await Promise.all(jobs);
await shot(pathToFileURL(P('social/og.html')).href, P('social/ktr-og-1200x630.png'), 1200, 630);
for (const th of ['light', 'dark']) {
  await shot(pathToFileURL(P(`examples/app-${th}-1280.html`)).href, P(`examples/app-${th}-1280.png`), 1280, 420);
  await shot(pathToFileURL(P(`examples/app-${th}-390.html`)).href, P(`examples/app-${th}-390.png`), 390, 360);
}
await shot(pathToFileURL(P('examples/clear-space.html')).href, P('examples/clear-space.png'), 1000, 420);
await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', P('favicon/favicon-32.png'), P('favicon/favicon.ico')]);
rmSync(tmp, { recursive: true, force: true });

const list = (d) => readdirSync(d, { recursive: true }).filter((f) => /\.[a-z0-9]+$/i.test(f)).map((f) => `${d.slice(root.length + 1)}/${f}`.replace(/\\/g, '/'));
console.log(dirs.flatMap(list).join('\n'));
