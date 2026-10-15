/* Shared connection graphics for the mind-map concepts.
   Encoding: a rumor "solidifies" as it advances. Bead spacing tightens interest -> near agreement,
   only an officially confirmed case is a solid (green) line, a failed case breaks off.
   Stroke width = evidence confidence. Node marks = review state. Text only on demand. */
(function () {
  const R = window.Radar, P = window.RadarParts, esc = R.esc;
  const NS = "http://www.w3.org/2000/svg";

  // dash: [dash, gap] with round caps; 0-length dash renders a bead.
  const LINE = {
    unknown:        { dash: "0 9",   flow: true,  color: "var(--st-unknown)" },
    interest:       { dash: "0 7",   flow: true,  color: "var(--st-interest)" },
    contact:        { dash: "0 4.5", flow: true,  color: "var(--st-contact)" },
    negotiation:    { dash: "7 5",   flow: true,  color: "var(--st-negotiation)" },
    near_agreement: { dash: "16 4",  flow: true,  color: "var(--st-near)" },
    confirmed:      { dash: "",      flow: false, color: "var(--st-confirmed-bg)" },
    failed:         { dash: "2 6",   flow: false, color: "var(--st-failed)" },
  };
  const WIDTH = { low: 2, medium: 3, high: 4.4 };

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  // Catmull-Rom through points -> cubic bezier path
  function spline(pts, t = 0.5) {
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * t * 2, y: p1.y + ((p2.y - p0.y) / 6) * t * 2 };
      const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * t * 2, y: p2.y - ((p3.y - p1.y) / 6) * t * 2 };
      d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }
  // Mind-map branch: each segment leaves and arrives along one axis ("x" or "y"), giving S-shaped limbs.
  function branch(pts, axis) {
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const k = 0.55;
      const c1 = axis === "x" ? { x: a.x + (b.x - a.x) * k, y: a.y } : { x: a.x, y: a.y + (b.y - a.y) * k };
      const c2 = axis === "x" ? { x: b.x - (b.x - a.x) * k, y: b.y } : { x: b.x, y: b.y - (b.y - a.y) * k };
      d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    }
    return d;
  }
  function describe(c) {
    const from = c.from_club ? c.from_club.name : "출발 구단 미확인";
    const to = c.to_club ? c.to_club.name : "도착 구단 미확인";
    return `${c.player.name}${c.player.id ? "" : "(선수 미확정)"}, ${from}에서 ${to}로, ${R.STAGES[c.stage].label}, 신뢰도 ${R.CONFIDENCE[c.confidence].label}, ${R.REVIEW[c.review_status].label}`;
  }

  /* Draw one connection. pts: ordered from origin to destination.
     Returns the <g> so concepts can attach the player node to it. */
  let gid = 0;
  function connection(svg, defs, c, pts, opt = {}) {
    const s = LINE[c.stage] || LINE.unknown;
    const g = el("g", { class: `cx cx--${c.stage}${c.review_status === "refuted" ? " cx--refuted" : ""}`, "data-case": c.id }, opt.layer || svg);
    const a = pts[0], b = pts[pts.length - 1];
    const id = `gr${++gid}`;
    const grad = el("linearGradient", { id, gradientUnits: "userSpaceOnUse", x1: a.x, y1: a.y, x2: b.x, y2: b.y }, defs);
    el("stop", { offset: "0", "stop-color": s.color, "stop-opacity": c.stage === "failed" ? 1 : 0.28 }, grad);
    el("stop", { offset: c.stage === "failed" ? ".55" : "1", "stop-color": s.color, "stop-opacity": c.stage === "failed" ? 0.9 : 1 }, grad);
    if (c.stage === "failed") el("stop", { offset: "1", "stop-color": s.color, "stop-opacity": 0 }, grad);
    const d = opt.axis ? branch(pts, opt.axis) : spline(pts, opt.tension || 0.5);
    el("path", { class: "cx__hit", d }, g); // wide invisible hit area
    if (c.stage === "confirmed") el("path", { class: "cx__halo", d, "stroke-width": WIDTH[c.confidence] + 5 }, g);
    const line = el("path", { class: `cx__line${s.flow ? " cx__line--flow" : ""}`, d, stroke: opt.flat ? s.color : `url(#${id})`, "stroke-width": WIDTH[c.confidence], "stroke-dasharray": s.dash || null }, g);
    if (s.flow) line.style.setProperty("--period", s.dash.split(" ").reduce((x, y) => x + Number(y), 0));
    // failed: the line fades out past a small break mark
    if (c.stage === "failed") {
      const m = midpointOf(d, 0.6);
      const x = el("g", { class: "cx__break", transform: `translate(${m.x},${m.y})` }, g);
      el("path", { d: "M-4,-4 L4,4 M4,-4 L-4,4" }, x);
    }
    return g;
  }
  const measurer = el("path", {});
  const hiddenSvg = el("svg", { width: 0, height: 0, style: "position:absolute;width:0;height:0" });
  hiddenSvg.appendChild(measurer);
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(hiddenSvg));
  function midpointOf(d, f = 0.5) {
    measurer.setAttribute("d", d);
    try { const L = measurer.getTotalLength(); return measurer.getPointAtLength(L * f); } catch (e) { return { x: 0, y: 0 }; }
  }

  // Player node: dot + name. Review marks: pending = orbit ring, refuted = slash, unresolved = hollow.
  function playerNode(layer, c, p, opt = {}) {
    const g = el("g", { class: `pn pn--${c.stage}${!c.player.id ? " pn--unresolved" : ""}${c.review_status === "pending" ? " pn--pending" : ""}${c.review_status === "refuted" ? " pn--refuted" : ""}`, transform: `translate(${p.x},${p.y})`, tabindex: 0, role: "button", "data-case": c.id, "aria-label": describe(c) }, layer);
    el("circle", { class: "pn__hit", r: 18 }, g);
    if (c.review_status === "pending") el("circle", { class: "pn__orbit", r: 10 }, g);
    el("circle", { class: "pn__dot", r: c.stage === "confirmed" ? 6 : 5 }, g);
    if (c.stage === "confirmed") el("path", { class: "pn__seal", d: "M-2.4,0.2 L-0.6,2 L2.6,-1.8" }, g);
    if (c.review_status === "refuted") el("path", { class: "pn__slash", d: "M-7,7 L7,-7" }, g);
    if (opt.label !== false) {
      const t = el("text", { class: "pn__label", x: opt.dx || 0, y: opt.dy || 0, "text-anchor": opt.anchor || "middle", "dominant-baseline": "middle" }, g);
      t.textContent = shortName(c.player.name, opt.max || 9);
    }
    return g;
  }
  function shortName(n, max) { return n.length > max ? n.slice(0, max - 1).trimEnd() + "…" : n; }
  function clubNode(layer, club, p, opt = {}) {
    const r = opt.r || 22;
    const g = el("g", { class: `cn${opt.center ? " cn--center" : ""}${opt.unknown ? " cn--unknown" : ""}${opt.selected ? " cn--sel" : ""}`, transform: `translate(${p.x},${p.y})`, "data-club": club ? club.id : "", tabindex: opt.focusable ? 0 : null, role: opt.focusable ? "button" : null, "aria-label": opt.focusable ? `${club ? club.name : "구단 미확인"} 선택` : null }, layer);
    el("circle", { class: "cn__disc", r }, g);
    const t = el("text", { class: "cn__label", "text-anchor": "middle", "dominant-baseline": "central", y: opt.labelBelow ? r + 12 : 0 }, g);
    t.textContent = opt.unknown ? "?" : club.short_name || club.name;
    if (opt.labelBelow && !opt.unknown) t.classList.add("cn__label--below");
    return g;
  }

  // ---------- focus / hover highlighting ----------
  function wireHighlight(svg) {
    const set = (id) => {
      svg.classList.toggle("is-focus", !!id);
      svg.querySelectorAll("[data-case]").forEach((n) => n.classList.toggle("is-on", n.dataset.case === id));
    };
    svg.addEventListener("pointerover", (e) => { const n = e.target.closest("[data-case]"); set(n ? n.dataset.case : null); });
    svg.addEventListener("pointerleave", () => set(svg.dataset.pinned || null));
    svg.addEventListener("focusin", (e) => { const n = e.target.closest("[data-case]"); if (n) set(n.dataset.case); });
    svg.addEventListener("focusout", () => set(svg.dataset.pinned || null));
    return set;
  }

  // ---------- card (text appears only here) ----------
  function card(host, c, opts = {}) {
    if (!c) { host.hidden = true; host.innerHTML = ""; return; }
    host.hidden = false;
    host.innerHTML = `
      <div class="card__head">
        <div><p class="card__name" id="card-title" tabindex="-1">${R.playerName(c)}</p><p class="card__route">${R.route(c)}</p></div>
        <button type="button" class="card__x" data-act="card-close" aria-label="닫기"><i class="ph ph-x" aria-hidden="true"></i></button>
      </div>
      <div class="card__sig">${R.stage(c.stage)}${R.conf(c.confidence)}${R.review(c.review_status)}</div>
      <p class="card__meta">${R.sources(c)}<span>갱신 ${R.time(c.updated_at, { archived: opts.archived })}</span></p>
      <div class="card__more" id="card-more"></div>
      <button type="button" class="card__btn" data-act="card-evidence" aria-expanded="false" aria-controls="card-more">근거 ${c.source_count}건 보기</button>`;
  }
  async function cardEvidence(host, store, id, archived) {
    const more = host.querySelector("#card-more");
    const btn = host.querySelector('[data-act="card-evidence"]');
    if (btn.getAttribute("aria-expanded") === "true") { more.innerHTML = ""; btn.setAttribute("aria-expanded", "false"); btn.textContent = btn.textContent.replace("접기", "보기"); return; }
    more.innerHTML = `<span class="skel" style="height:80px"></span>`;
    try {
      const c = (await store.detail(id)).data;
      more.innerHTML = `${P.pending(c)}${P.official(c)}${P.identityNotes(c)}<div class="card__evs">${c.evidence.map((e) => P.evidence(e, c, { archived })).join("")}</div>`;
      btn.setAttribute("aria-expanded", "true"); btn.textContent = `근거 ${c.source_count}건 접기`;
    } catch (e) { const er = R.errorOf(e); more.innerHTML = `<p class="card__err" role="alert">${er.title}. <button type="button" class="card__retry" data-act="card-evidence-retry">다시 시도</button></p>`; }
  }

  // ---------- legend ----------
  function legend() {
    const row = (s) => {
      const L = LINE[s];
      return `<li><svg width="64" height="12" aria-hidden="true"><path d="M4,6 L60,6" stroke="${L.color}" stroke-width="2.6" stroke-linecap="round" fill="none"${L.dash ? ` stroke-dasharray="${L.dash}"` : ""}/>${s === "failed" ? '<path d="M40,2 L48,10 M48,2 L40,10" stroke="var(--st-failed)" stroke-width="1.6" stroke-linecap="round"/>' : ""}</svg><span>${R.STAGES[s].label}</span></li>`;
    };
    return `
      <p class="lg__h">선의 모양은 단계, 굵기는 근거 신뢰도</p>
      <ul class="lg__lines">${["interest", "contact", "negotiation", "near_agreement", "confirmed", "failed", "unknown"].map(row).join("")}</ul>
      <ul class="lg__lines">
        ${["low", "medium", "high"].map((k) => `<li><svg width="64" height="12" aria-hidden="true"><path d="M4,6 L60,6" stroke="currentColor" stroke-width="${WIDTH[k]}" stroke-linecap="round" fill="none"/></svg><span>신뢰도 ${R.CONFIDENCE[k].label}</span></li>`).join("")}
      </ul>
      <ul class="lg__lines">
        <li><svg width="64" height="24" aria-hidden="true"><circle cx="32" cy="12" r="10" class="lg__orbit"/><circle cx="32" cy="12" r="5" fill="currentColor"/></svg><span>검토 대기</span></li>
        <li><svg width="64" height="24" aria-hidden="true"><circle cx="32" cy="12" r="5" fill="currentColor" opacity=".4"/><path d="M25,19 L39,5" stroke="var(--st-failed)" stroke-width="1.8" stroke-linecap="round"/></svg><span>반박됨</span></li>
        <li><svg width="64" height="24" aria-hidden="true"><circle cx="32" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2"/></svg><span>선수 미확정</span></li>
      </ul>
      <p class="lg__note">점선은 모두 출처의 주장입니다. 실선 초록은 공식 발표를 확인한 경우에만 씁니다. 신뢰도는 이적 확률이 아닙니다.</p>`;
  }

  // text alternative for screen readers and for anyone who prefers a list
  function textList(cases, clubId) {
    if (!cases.length) return `<p>연결된 이적 건이 없습니다.</p>`;
    return `<ul class="alt">${cases.map((c) => `<li><button type="button" data-case="${c.id}">${esc(describe(c))}</button></li>`).join("")}</ul>`;
  }

  function freshText(meta, win) {
    const f = R.freshness(meta, win);
    return `<span class="fr fr--${f.tone}" title="${esc(f.detail)}"><i class="ph ${f.icon}" aria-hidden="true"></i>${f.tone === "ok" ? R.relTime(meta.last_successful_sync_at) + " 갱신" : f.text}</span>`;
  }

  // ResizeObserver-based redraw helper
  function onSize(node, fn) {
    let raf; const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fn); });
    ro.observe(node);
  }

  window.RadarMap = { LINE, WIDTH, el, spline, branch, connection, playerNode, clubNode, wireHighlight, card, cardEvidence, legend, textList, describe, freshText, onSize, midpointOf, shortName };
})();
