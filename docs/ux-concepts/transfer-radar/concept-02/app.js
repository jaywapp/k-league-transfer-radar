(function () {
  if (window.RT_FRAMED) return;
  const R = window.Radar, P = window.RadarParts, esc = R.esc;
  const store = R.createStore({ pageSize: 30 });
  const st = store.state;
  const $ = (id) => document.getElementById(id);
  const params = () => new URLSearchParams(location.search);
  let openId = R.caseParam();
  let pane = params().get("pane") || "feed"; // mobile only: feed | now
  let feedLimit = 20;
  let detail = { id: null, state: "idle", c: null, err: null, seq: 0 };
  let listScroll = 0;

  function setPane(p) {
    pane = p;
    const u = new URL(location.href);
    if (p === "feed") u.searchParams.delete("pane"); else u.searchParams.set("pane", p);
    history.replaceState(history.state, "", u);
    render();
  }

  // ---------- header ----------
  function renderTop() {
    const opt = (w) => `<option value="${w.id}"${w.id === st.windowId ? " selected" : ""}>${esc(w.label)} 이적시장${w.archived_at ? " · 보관됨" : " · 진행 중"}</option>`;
    $("window").innerHTML = st.windows.map(opt).join("");
    $("window").disabled = !st.windows.length;
    const strip = (lg, label) => {
      const list = st.clubs.filter((c) => c.league === lg);
      if (!list.length) return "";
      return `<span class="clubs__lg" aria-hidden="true">${label}</span>${list.map((c) => `<button type="button" class="club" data-club="${c.id}" aria-pressed="${c.id === st.clubId}"><span class="sr-only">${label} </span>${esc(c.short_name)}</button>`).join("")}`;
    };
    $("clubs").innerHTML = st.clubs.length ? `<div class="clubs__track">${strip("K1", "K리그1")}${strip("K2", "K리그2")}</div>` : "";
    const sel = $("clubs").querySelector('[aria-pressed="true"]');
    if (sel && !$("clubs").dataset.scrolled) { sel.scrollIntoView({ block: "nearest", inline: "center" }); $("clubs").dataset.scrolled = "1"; }
    const f = R.freshness(st.meta, store.window);
    $("fresh").className = `fresh fresh--${f.tone}`;
    $("fresh").innerHTML = `<i class="ph ${f.icon}" aria-hidden="true"></i><span>${f.text}</span>${f.tone !== "ok" && f.detail ? `<span class="fresh__detail">${f.detail}</span>` : ""}`;
  }

  // ---------- feed ----------
  function feedItem(x) {
    const c = x.c;
    const other = R.counterpart(c, st.clubId);
    const dir = R.direction(c, st.clubId) === "incoming" ? "영입" : "방출";
    let what = "", why = "";
    if (x.type === "stage") {
      what = `<span class="chg">${R.stage(x.h.stage_before)}<i class="ph ph-arrow-right" aria-label="에서"></i>${R.stage(x.h.stage_after)}</span>`;
      why = x.h.stage_after === "confirmed" ? "공식 발표를 확인했습니다." : `${esc(x.h.reason)}.`;
    } else if (x.type === "pending") {
      what = `<span class="chg"><span class="chg__new">새 주장</span>${R.stage(x.e.claimed_stage)}${R.review("pending")}</span>`;
      why = `검토가 끝날 때까지 ${R.STAGES[c.stage].label === "공식 확정" ? "공식 확정" : R.STAGES[c.stage].label}을 유지합니다.`;
    } else {
      what = `<span class="chg"><span class="chg__new">새 이적 건</span>${R.stage(c.stage)}</span>`;
      why = "처음 들어온 주장입니다.";
    }
    return `
      <li class="log">
        <time class="log__t" datetime="${x.at}">${R.absTime(x.at).split(" ").pop()}</time>
        <a class="log__body" href="${R.openCaseUrl(c.id).search}" data-case="${c.id}">
          <span class="log__who"><span class="log__name">${R.playerName(c)}</span><span class="log__dir">${dir} · ${R.clubName(other, R.direction(c, st.clubId) === "incoming" ? "출발 구단 미확인" : "도착 구단 미확인")}</span></span>
          <span class="log__what">${what}</span>
          <span class="log__why">${why}</span>
          <span class="log__now">지금 ${R.stage(c.stage)} ${R.conf(c.confidence)} ${R.review(c.review_status)}</span>
        </a>
      </li>`;
  }
  function feedHTML() {
    if (st.status === "loading" && !st.items.length) return `<div aria-busy="true">${Array.from({ length: 5 }, () => `<div class="log log--skel"><span class="skel" style="height:14px;width:44px"></span><span class="skel" style="height:56px"></span></div>`).join("")}</div>`;
    if (st.status === "error" && !st.items.length) return P.stateView("error", { error: st.error });
    const all = store.feed();
    if (!all.length) return P.stateView(store.hasFilters ? "filter-empty" : "empty", { archived: store.archived });
    const shown = all.slice(0, feedLimit);
    const days = [];
    shown.forEach((x) => { const k = R.dayKey(x.at); let d = days.find((y) => y.k === k); if (!d) days.push((d = { k, label: R.dayLabel(x.at), items: [] })); d.items.push(x); });
    return `${days.map((d) => `<section class="day" aria-label="${d.label}"><h3 class="day__h">${d.label}</h3><ol class="logs">${d.items.map(feedItem).join("")}</ol></section>`).join("")}
      ${all.length > shown.length ? `<div class="more"><button type="button" class="btn btn--ghost" data-act="feed-more">이전 기록 더 보기</button><span class="muted">${shown.length} / ${all.length}</span></div>` : `<p class="more muted">${store.archived ? "보관 시점까지의" : "이번 시장의"} 기록 끝</p>`}`;
  }

  // ---------- now list ----------
  function nowRow(c) {
    const other = R.counterpart(c, st.clubId);
    return `<li class="now"><a href="${R.openCaseUrl(c.id).search}" data-case="${c.id}">
      <span class="now__top"><span class="now__name">${R.playerName(c)}</span>${R.stage(c.stage)}</span>
      <span class="now__club">${R.clubName(other, "구단 미확인")}</span>
      <span class="now__sig">${R.conf(c.confidence)} ${R.review(c.review_status)} ${R.sources(c)}</span>
      <span class="now__t">갱신 ${R.time(c.updated_at, { archived: store.archived })}</span></a></li>`;
  }
  function chip(kind, v, label) { return `<button type="button" class="fchip" data-filter="${kind}" data-v="${v}" aria-pressed="${st[kind] === v}">${label}</button>`; }
  function nowHTML() {
    const filters = `
      <form class="q" id="qform" role="search"><label class="sr-only" for="q">선수·구단 검색</label><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input id="q" type="search" placeholder="선수·구단 검색" value="${esc(st.q)}" autocomplete="off"></form>
      <details class="fbox"${st.stage || st.confidence || st.review ? " open" : ""}><summary>단계·신뢰도·검토로 좁히기${[st.stage, st.confidence, st.review].filter(Boolean).length ? ` (${[st.stage, st.confidence, st.review].filter(Boolean).length})` : ""}</summary>
        <fieldset><legend>단계</legend>${R.STAGE_ORDER.map((s) => chip("stage", s, R.STAGES[s].label)).join("")}</fieldset>
        <fieldset><legend>근거 신뢰도</legend>${Object.entries(R.CONFIDENCE).map(([k, v]) => chip("confidence", k, v.label)).join("")}</fieldset>
        <fieldset><legend>검토 상태</legend>${Object.entries(R.REVIEW).map(([k, v]) => chip("review", k, v.label)).join("")}</fieldset>
      </details>
      ${store.hasFilters ? `<button type="button" class="btn btn--ghost btn--sm" data-act="clear">조건 지우기</button>` : ""}`;
    let body;
    if (st.status === "loading" && !st.items.length) body = `<div aria-busy="true">${Array.from({ length: 4 }, () => `<span class="skel" style="height:64px;margin:8px 0"></span>`).join("")}</div>`;
    else if (st.status === "error" && !(st.items.length)) body = P.stateView("error", { error: st.error });
    else if (!st.items.length) body = P.stateView(store.hasFilters ? "filter-empty" : "empty", { archived: store.archived });
    else body = `${st.status === "error" ? P.staleBanner(st) : ""}<ul class="nows${st.status === "refreshing" ? " is-busy" : ""}">${st.items.map(nowRow).join("")}</ul>${P.pageFooter(st)}`;
    return `${filters}<p class="hint">최근 갱신순 · 낮은 신뢰도와 검토 대기 포함</p>${body}`;
  }

  function renderBoard() {
    const main = $("main");
    if (st.status === "no-window") { main.innerHTML = `<div class="wrap">${P.stateView("no-window")}</div>`; return; }
    const club = store.club;
    const counts = store.counts;
    const dirBtn = (d, l, n) => `<button type="button" data-dir="${d}" aria-pressed="${st.dir === d}">${l}${n == null ? "" : ` <span class="n">${n}</span>`}</button>`;
    main.innerHTML = `
      <div class="wrap">
        ${store.archived ? `<div class="archive" role="note"><i class="ph ph-archive" aria-hidden="true"></i><p><strong>지난 시장 기록 · 읽기 전용</strong><br>${R.absTime(store.window.archived_at, { dateOnly: true, year: true })}에 보관했습니다. 시각은 당시 기록 그대로입니다.</p><button type="button" class="btn btn--sm" data-act="current">진행 중인 시장 보기</button></div>` : ""}
        <div class="board-head">
          <h1 class="title">${club ? esc(club.name) : '<span class="skel" style="height:32px;width:180px"></span>'}<span class="title__lg">${club ? (club.league === "K1" ? "K리그1" : "K리그2") : ""}</span></h1>
          <div class="dirs" role="group" aria-label="이적 방향">${dirBtn("incoming", "영입", counts.incoming)}${dirBtn("outgoing", "방출", counts.outgoing)}</div>
        </div>
        <div class="panes" role="group" aria-label="보기 전환">
          <button type="button" data-pane="feed" aria-pressed="${pane === "feed"}">변화 기록</button>
          <button type="button" data-pane="now" aria-pressed="${pane === "now"}">지금 상태 ${st.items.length && st.status !== "loading" ? `<span class="n">${st.items.length}${st.cursor ? "+" : ""}</span>` : ""}</button>
        </div>
        <div class="board" data-pane="${pane}">
          <section class="feed" aria-labelledby="feed-h"><h2 id="feed-h" class="sec-h">변화 기록 <span class="sec-h__sub">단계 변경과 새 주장, 최신순</span></h2>${feedHTML()}</section>
          <section class="nowcol" aria-labelledby="now-h"><h2 id="now-h" class="sec-h">지금 상태 <span class="sec-h__sub">${st.dir === "incoming" ? "영입" : "방출"} 이적 건</span></h2>${nowHTML()}</section>
        </div>
      </div>`;
  }

  // ---------- detail page: one merged timeline ----------
  function timeline(c, archived) {
    const evById = Object.fromEntries(c.evidence.map((e) => [e.id, e]));
    const rows = [];
    c.evidence.forEach((e) => rows.push({ at: e.source.posted_at, kind: "ev", e }));
    c.history.forEach((h) => rows.push({ at: h.changed_at, kind: "h", h }));
    rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.kind === "h" ? -1 : 1));
    // collapse long repost runs so 22 sources stay readable
    const out = [];
    let run = [];
    const flush = () => { if (!run.length) return; if (run.length < 3) run.forEach((r) => out.push(r)); else out.push({ kind: "run", items: run, at: run[0].at }); run = []; };
    rows.forEach((r) => { if (r.kind === "ev" && r.e.source_relation === "repost") run.push(r); else { flush(); out.push(r); } });
    flush();
    return `<ol class="tl">${out.map((r) => {
      if (r.kind === "h") return `<li class="tl__i tl__i--h"><span class="tl__t">${R.time(r.at, { archived })}</span><div class="tl__card tl__card--h"><p class="tl__k">단계 반영</p><p class="chg">${R.stage(r.h.stage_before)}<i class="ph ph-arrow-right" aria-label="에서"></i>${R.stage(r.h.stage_after, { lg: true })}</p><p class="tl__why">${esc(r.h.reason)}${r.h.evidence_id && evById[r.h.evidence_id] ? ` · 근거: ${esc(evById[r.h.evidence_id].source.publisher)}` : ""}</p></div></li>`;
      if (r.kind === "run") return `<li class="tl__i tl__i--run"><span class="tl__t">${R.time(r.items[r.items.length - 1].at, { archived, noRel: true })} ~</span><details class="tl__card"><summary>재게시·인용 ${r.items.length}건 <span class="muted">독립 근거로 세지 않음</span></summary>${r.items.map((x) => P.evidence(x.e, c, { archived })).join("")}</details></li>`;
      return `<li class="tl__i${r.e.review_status === "pending" ? " tl__i--pending" : ""}"><span class="tl__t">${R.time(r.at, { archived })}</span>${P.evidence(r.e, c, { archived })}</li>`;
    }).join("")}</ol>`;
  }
  function renderDetail() {
    const main = $("main");
    const back = `<a class="back" href="${R.openCaseUrl(null).search}" data-act="close"><i class="ph ph-arrow-left" aria-hidden="true"></i>${store.club ? esc(store.club.name) : ""} 변화 기록으로</a>`;
    if (detail.state === "loading") { main.innerHTML = `<div class="wrap wrap--detail">${back}<div aria-busy="true"><span class="skel" style="height:40px;width:50%"></span><span class="skel" style="height:160px;margin-top:16px"></span></div></div>`; return; }
    if (detail.state === "error") { const e = R.errorOf(detail.err); main.innerHTML = `<div class="wrap wrap--detail">${back}<div class="state state--error" role="alert"><i class="ph ${e.icon}" aria-hidden="true"></i><p class="state__title">${e.title}</p><p class="state__body">${e.body}</p><button type="button" class="btn" data-act="detail-retry">다시 시도</button></div></div>`; return; }
    const c = detail.c;
    if (!c) return;
    const archived = c.window_id !== "2027-winter";
    main.innerHTML = `
      <div class="wrap wrap--detail">
        ${back}
        ${archived ? `<p class="archive archive--sm"><i class="ph ph-archive" aria-hidden="true"></i>지난 시장 기록 · 보관 당시 상태</p>` : ""}
        <header class="case">
          <h1 class="case__name" id="detail-title" tabindex="-1">${R.playerName(c)}</h1>
          <p class="case__meta">${c.player.position ? R.POS[c.player.position] : "포지션 미상"} · ${R.route(c)}</p>
          <div class="case__now"><span class="case__label">지금 반영된 단계</span>${R.stage(c.stage, { lg: true })}<span class="case__sig">${R.conf(c.confidence)} ${R.review(c.review_status)} ${R.sources(c)}</span></div>
          <p class="case__sum">${esc(c.summary)}</p>
          <p class="case__t">이적 건 갱신 ${R.time(c.updated_at, { archived })}</p>
        </header>
        ${P.pending(c)}${P.official(c)}${P.identityNotes(c)}
        <h2 class="sec-h">타임라인 <span class="sec-h__sub">원문 게시와 단계 반영을 한 줄로, 최신순</span></h2>
        ${timeline(c, archived)}
      </div>`;
  }
  async function loadDetail(focus) {
    const my = ++detail.seq;
    detail.state = "loading"; renderDetail();
    try { const r = await store.detail(openId); if (my !== detail.seq) return; detail.c = r.data; detail.state = "ready"; }
    catch (e) { if (my !== detail.seq) return; detail.state = "error"; detail.err = e; }
    renderDetail();
    if (focus) { scrollTo(0, 0); const t = $("detail-title"); t && t.focus({ preventScroll: true }); }
  }

  function render() { renderTop(); if (openId) { document.body.classList.add("is-detail"); return; } document.body.classList.remove("is-detail"); renderBoard(); }
  function open(id, push) {
    if (!openId) listScroll = scrollY;
    openId = id;
    if (push) history.pushState({ case: id }, "", R.openCaseUrl(id));
    render(); loadDetail(true);
  }
  function close(push) {
    const last = openId; openId = null; detail.c = null;
    if (push) history.pushState({}, "", R.openCaseUrl(null));
    render(); scrollTo(0, listScroll);
    const el = document.querySelector(`[data-case="${last}"]`); el && el.focus({ preventScroll: true });
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-case],[data-club],[data-dir],[data-pane],[data-filter],[data-act],[data-close],#guide-open");
    if (!t) return;
    if (t.dataset.case) { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); open(t.dataset.case, true); return; }
    if (t.dataset.club) { feedLimit = 20; if (openId) { openId = null; history.pushState({}, "", R.openCaseUrl(null)); } store.setClub(t.dataset.club); return; }
    if (t.dataset.dir) { feedLimit = 20; store.setDir(t.dataset.dir); return; }
    if (t.dataset.pane) { setPane(t.dataset.pane); return; }
    if (t.dataset.filter) { store.setFilter(t.dataset.filter, t.dataset.v); return; }
    if (t.id === "guide-open") { $("guide-body").innerHTML = P.guide; $("guide").showModal(); return; }
    if (t.hasAttribute("data-close")) { t.closest("dialog").close(); return; }
    const a = t.dataset.act;
    if (a === "close") { e.preventDefault(); close(true); }
    if (a === "retry") store.retry();
    if (a === "more") store.more();
    if (a === "clear") store.clearFilters();
    if (a === "feed-more") { feedLimit += 20; renderBoard(); }
    if (a === "detail-retry") loadDetail(true);
    if (a === "current") { const w = st.windows.find((x) => !x.archived_at); w && store.setWindow(w.id); }
  });
  document.addEventListener("change", (e) => { if (e.target.id === "window") { feedLimit = 20; store.setWindow(e.target.value); } });
  document.addEventListener("submit", (e) => { if (e.target.id === "qform") { e.preventDefault(); store.setQuery($("q").value); } });
  let qt;
  document.addEventListener("input", (e) => { if (e.target.id === "q") { clearTimeout(qt); qt = setTimeout(() => store.setQuery(e.target.value), 350); } });
  addEventListener("popstate", () => { const id = R.caseParam(); if (id) open(id, false); else if (openId) close(false); });

  store.subscribe(() => {
    if (openId) { renderTop(); return; }
    const active = document.activeElement && document.activeElement.id === "q";
    render();
    if (active) { const q = $("q"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  });
  store.init().then(() => { if (openId) { render(); loadDetail(false); } });
})();
