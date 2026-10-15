(function () {
  if (window.RT_FRAMED) return;
  const R = window.Radar, P = window.RadarParts, esc = R.esc;
  const store = R.createStore({ pageSize: 30 });
  const st = store.state;
  const $ = (id) => document.getElementById(id);
  const wide = matchMedia("(min-width: 1100px)");
  let openId = R.caseParam();
  let detailCase = null, detailState = "idle", detailErr = null, detailSeq = 0;
  let listScroll = 0;

  // ---------- header ----------
  function renderWindows() {
    const cur = st.windows.filter((w) => !w.archived_at), past = st.windows.filter((w) => w.archived_at);
    const opt = (w) => `<option value="${w.id}"${w.id === st.windowId ? " selected" : ""}>${esc(w.label)}${w.archived_at ? " (보관됨)" : " (진행 중)"}</option>`;
    $("window").innerHTML = `${cur.length ? `<optgroup label="진행 중">${cur.map(opt).join("")}</optgroup>` : ""}${past.length ? `<optgroup label="지난 시장">${past.map(opt).join("")}</optgroup>` : ""}`;
    $("window").disabled = !st.windows.length;
  }
  function renderFresh() {
    const f = R.freshness(st.meta, store.window);
    $("fresh").className = `fresh fresh--${f.tone}`;
    $("fresh").innerHTML = `<i class="ph ${f.icon}" aria-hidden="true"></i><span>${f.text}</span>${f.detail ? `<span class="fresh__detail">${f.detail}</span>` : ""}`;
  }

  // ---------- club index ----------
  function clubIndex(compact) {
    const totals = store.clubTotals;
    const group = (lg, title) => {
      const list = st.clubs.filter((c) => c.league === lg);
      if (!list.length) return "";
      return `<section class="idx"><h2 class="idx__h">${title}</h2><ul>${list.map((c) => `
        <li><button type="button" class="idx__club" data-club="${c.id}" aria-current="${c.id === st.clubId}">
          <span class="idx__name">${esc(c.name)}</span><span class="idx__n" aria-label="이적 건 ${totals[c.id] || 0}개">${totals[c.id] || 0}</span>
        </button></li>`).join("")}</ul></section>`;
    };
    return `${compact ? "" : `<p class="rail__season">${store.window ? store.window.season : ""} 시즌 소속 기준</p>`}${group("K1", "K리그1")}${group("K2", "K리그2")}`;
  }

  // ---------- list ----------
  function filterSelect(kind, label, entries) {
    return `<label class="field"><span class="field__label">${label}</span><select data-filter="${kind}"><option value="">전체</option>${entries.map(([v, l]) => `<option value="${v}"${st[kind] === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>`;
  }
  function row(c) {
    const other = R.counterpart(c, st.clubId);
    const dirWord = R.direction(c, st.clubId) === "incoming" ? "출발" : "도착";
    return `
      <li class="row${c.id === openId ? " row--open" : ""}">
        <a class="row__link" href="${R.openCaseUrl(c.id).search}" data-case="${c.id}" aria-current="${c.id === openId ? "true" : "false"}">
          <span class="row__player"><span class="row__name">${R.playerName(c)}</span><span class="row__pos">${c.player.position ? R.POS[c.player.position] || esc(c.player.position) : "포지션 미상"}</span></span>
          <span class="row__club"><span class="row__label">${dirWord}</span>${R.clubName(other, dirWord + " 구단 미확인")}</span>
          <span class="row__stage">${R.stage(c.stage)}</span>
          <span class="row__conf">${R.conf(c.confidence)}</span>
          <span class="row__review">${R.review(c.review_status)}</span>
          <span class="row__src">${R.sources(c)}</span>
          <span class="row__time">${R.time(c.updated_at, { archived: store.archived })}</span>
        </a>
      </li>`;
  }
  function skeletonRows(n) {
    return `<ul class="rows" aria-hidden="true">${Array.from({ length: n }, () => `<li class="row row--skel"><span class="skel" style="height:16px;width:42%"></span><span class="skel" style="height:14px;width:68%"></span></li>`).join("")}</ul>`;
  }
  function renderMain() {
    const main = $("main");
    if (st.status === "no-window") { main.innerHTML = P.stateView("no-window"); return; }
    if (!st.booted) { main.innerHTML = `<div class="main__head"><span class="skel" style="height:30px;width:200px"></span></div>${skeletonRows(6)}<p class="sr-only" role="status">불러오는 중</p>`; return; }
    const club = store.club;
    const counts = store.counts;
    const archived = store.archived;
    const head = `
      ${archived ? `<div class="archive-band" role="note"><i class="ph ph-archive" aria-hidden="true"></i><span><strong>지난 시장 기록 · 읽기 전용</strong> ${R.absTime(store.window.archived_at, { dateOnly: true, year: true })}에 보관한 상태입니다. 이후 소식은 반영하지 않습니다.</span><button type="button" class="btn btn--sm" data-act="current">진행 중인 시장 보기</button></div>` : ""}
      <div class="main__head">
        <button type="button" class="club-pick" id="club-pick" aria-haspopup="dialog"><span class="club-pick__lg">${club ? (club.league === "K1" ? "K리그1" : "K리그2") : ""}</span><span class="club-pick__name">${club ? esc(club.name) : "구단 선택"}</span><i class="ph ph-caret-down" aria-hidden="true"></i><span class="sr-only">구단 바꾸기</span></button>
        <h1 class="main__title"><span class="main__lg">${club ? (club.league === "K1" ? "K리그1" : "K리그2") : ""}</span>${club ? esc(club.name) : ""}</h1>
        <div class="seg" role="group" aria-label="이적 방향">
          <button type="button" data-dir="incoming" aria-pressed="${st.dir === "incoming"}">영입 <span class="seg__n">${counts.incoming}</span></button>
          <button type="button" data-dir="outgoing" aria-pressed="${st.dir === "outgoing"}">방출 <span class="seg__n">${counts.outgoing}</span></button>
        </div>
      </div>
      <form class="filters" id="filters" role="search">
        <label class="field field--q"><span class="field__label">선수·구단 검색</span><span class="q"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input id="q" type="search" value="${esc(st.q)}" placeholder="이름 일부" autocomplete="off"></span></label>
        <details class="filters__more"${store.hasFilters && (st.stage || st.confidence || st.review) ? " open" : ""}>
          <summary class="btn btn--ghost"><i class="ph ph-sliders-horizontal" aria-hidden="true"></i>필터${[st.stage, st.confidence, st.review].filter(Boolean).length ? ` <span class="seg__n">${[st.stage, st.confidence, st.review].filter(Boolean).length}</span>` : ""}</summary>
          <div class="filters__grid">
            ${filterSelect("stage", "단계", R.STAGE_ORDER.map((s) => [s, R.STAGES[s].label]))}
            ${filterSelect("confidence", "근거 신뢰도", Object.entries(R.CONFIDENCE).map(([k, v]) => [k, v.label]))}
            ${filterSelect("review", "검토 상태", Object.entries(R.REVIEW).map(([k, v]) => [k, v.label]))}
          </div>
        </details>
        ${store.hasFilters ? `<button type="button" class="btn btn--ghost btn--sm" data-act="clear">조건 지우기</button>` : ""}
      </form>
      <p class="list-note">최근 갱신순 · 낮은 신뢰도와 검토 대기 포함</p>`;

    let body = "";
    if (st.status === "loading" && !st.items.length) body = skeletonRows(6) + `<p class="sr-only" role="status">목록을 불러오는 중</p>`;
    else if (st.status === "error" && !(st.last && st.last.key === st.lastKey && st.items.length)) body = P.stateView("error", { error: st.error });
    else if (!st.items.length) body = P.stateView(store.hasFilters ? "filter-empty" : "empty", { archived });
    else {
      body = `${st.status === "error" ? P.staleBanner(st) : ""}
        <div class="table" role="region" aria-label="${club ? esc(club.name) : ""} ${st.dir === "incoming" ? "영입" : "방출"} 목록">
          <div class="thead" aria-hidden="true"><span>선수</span><span>${st.dir === "incoming" ? "출발 구단" : "도착 구단"}</span><span>단계</span><span>근거 신뢰도</span><span>검토</span><span>출처</span><span>갱신</span></div>
          <ul class="rows${st.status === "refreshing" || st.status === "loading" ? " rows--busy" : ""}" aria-busy="${st.status === "loading" || st.status === "refreshing"}">${st.items.map(row).join("")}</ul>
        </div>
        ${P.pageFooter(st)}`;
    }
    main.innerHTML = head + body;
  }

  // ---------- detail ----------
  function evidenceGroups(c) {
    const groups = new Map();
    c.evidence.forEach((e) => { const k = e.independence_group_id || e.id; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
    const list = [...groups.values()].sort((a, b) => (a[a.length - 1].source.posted_at < b[b.length - 1].source.posted_at ? 1 : -1));
    return list.map((g, i) => {
      const head = g.find((e) => e.source_relation === "original") || g[0];
      const rest = g.filter((e) => e !== head);
      return `<li class="grp"><p class="grp__h">정보 계통 ${i + 1}${g.length > 1 ? ` · ${g.length}건` : ""}</p>
        ${P.evidence(head, c, { archived: store.archived })}
        ${rest.length ? `<details class="grp__more"><summary>같은 계통의 재게시·인용 ${rest.length}건</summary>${rest.map((e) => P.evidence(e, c, { archived: store.archived })).join("")}</details>` : ""}</li>`;
    }).join("");
  }
  function renderDetail() {
    const el = $("detail");
    if (!openId) { el.hidden = true; document.body.classList.remove("has-detail"); return; }
    el.hidden = false;
    document.body.classList.add("has-detail");
    const back = `<button type="button" class="btn btn--ghost detail__back" data-act="close"><i class="ph ph-arrow-left" aria-hidden="true"></i><span>${wide.matches ? "닫기" : "목록으로"}</span></button>`;
    if (detailState === "loading") { el.innerHTML = `${back}<div class="detail__body" aria-busy="true"><span class="skel" style="height:28px;width:60%"></span><span class="skel" style="height:18px;width:80%;margin-top:12px"></span><span class="skel" style="height:120px;margin-top:20px"></span></div>`; return; }
    if (detailState === "error") { const e = R.errorOf(detailErr); el.innerHTML = `${back}<div class="state state--error" role="alert"><i class="ph ${e.icon}" aria-hidden="true"></i><p class="state__title">${e.title}</p><p class="state__body">${e.body} 목록은 그대로 볼 수 있습니다.</p><button type="button" class="btn" data-act="detail-retry">다시 시도</button></div>`; return; }
    const c = detailCase;
    if (!c) return;
    const archived = c.window_id !== "2027-winter";
    el.innerHTML = `
      ${back}
      <article class="detail__body">
        ${archived ? `<p class="archive-band archive-band--sm"><i class="ph ph-archive" aria-hidden="true"></i>지난 시장 기록 · 보관 당시 상태</p>` : ""}
        <header class="dh">
          <p class="dh__pos">${c.player.position ? R.POS[c.player.position] : "포지션 미상"}</p>
          <h2 class="dh__name" id="detail-title" tabindex="-1">${R.playerName(c)}</h2>
          <p class="dh__route">${R.route(c)}</p>
          <div class="dh__badges">${R.stage(c.stage, { lg: true })}${R.conf(c.confidence)}${R.review(c.review_status)}</div>
          <p class="dh__summary">${esc(c.summary)}</p>
          <p class="dh__time">이적 건 갱신 ${R.time(c.updated_at, { archived })}</p>
        </header>
        ${P.pending(c)}
        ${P.official(c)}
        ${P.identityNotes(c)}
        <section class="dsec" aria-labelledby="ev-h"><h3 id="ev-h" class="dsec__h">근거 <span class="dsec__n">${R.sources(c)}</span></h3>
          <p class="dsec__hint">같은 내용을 다시 올린 글은 하나의 정보 계통으로 묶었습니다.</p>
          <ul class="grps">${evidenceGroups(c)}</ul></section>
        <section class="dsec" aria-labelledby="hist-h"><h3 id="hist-h" class="dsec__h">반영된 단계 변경</h3>${P.historyList(c, { archived })}</section>
      </article>`;
  }
  async function loadDetail(focus) {
    if (!openId) { renderDetail(); return; }
    const my = ++detailSeq;
    detailState = "loading"; renderDetail();
    try {
      const r = await store.detail(openId);
      if (my !== detailSeq) return;
      detailCase = r.data; detailState = "ready";
    } catch (e) { if (my !== detailSeq) return; detailState = "error"; detailErr = e; }
    renderDetail();
    if (focus) { const t = $("detail-title") || $("detail").querySelector("button"); t && t.focus(); }
  }
  function openCase(id, push) {
    if (!wide.matches && !openId) listScroll = scrollY;
    openId = id;
    if (push) history.pushState({ case: id }, "", R.openCaseUrl(id));
    renderMain();
    loadDetail(true);
    if (!wide.matches) scrollTo(0, 0);
  }
  function closeCase(push) {
    const last = openId;
    openId = null; detailCase = null;
    if (push) history.pushState({}, "", R.openCaseUrl(null));
    renderDetail(); renderMain();
    if (!wide.matches) scrollTo(0, listScroll);
    const link = document.querySelector(`[data-case="${last}"]`);
    link && link.focus({ preventScroll: wide.matches ? false : true });
  }

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-case],[data-club],[data-dir],[data-act],[data-close],#club-pick,#guide-open");
    if (!t) return;
    if (t.dataset.case) { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); openCase(t.dataset.case, true); return; }
    if (t.dataset.club) { store.setClub(t.dataset.club); $("club-sheet").open && $("club-sheet").close(); return; }
    if (t.dataset.dir) { store.setDir(t.dataset.dir); return; }
    if (t.id === "club-pick") { $("club-sheet-body").innerHTML = clubIndex(true); $("club-sheet").showModal(); return; }
    if (t.id === "guide-open") { $("guide-body").innerHTML = P.guide; $("guide").showModal(); return; }
    if (t.hasAttribute("data-close")) { t.closest("dialog").close(); return; }
    const a = t.dataset.act;
    if (a === "retry") store.retry();
    if (a === "more") store.more();
    if (a === "clear") store.clearFilters();
    if (a === "close") closeCase(true);
    if (a === "detail-retry") loadDetail(true);
    if (a === "current") { const w = st.windows.find((x) => !x.archived_at); w && store.setWindow(w.id); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "window") store.setWindow(e.target.value);
    if (e.target.dataset.filter) store.setFilter(e.target.dataset.filter, e.target.value);
  });
  document.addEventListener("submit", (e) => { if (e.target.id === "filters") { e.preventDefault(); store.setQuery($("q").value); } });
  let qTimer;
  document.addEventListener("input", (e) => {
    if (e.target.id !== "q") return;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { const pos = e.target.selectionStart; store.setQuery(e.target.value); const q = $("q"); q.focus(); q.setSelectionRange(pos, pos); }, 350);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openId && wide.matches && !document.querySelector("dialog[open]")) closeCase(true); });
  addEventListener("popstate", () => { const id = R.caseParam(); if (id) openCase(id, false); else if (openId) closeCase(false); });
  wide.addEventListener("change", () => renderDetail());

  store.subscribe(() => {
    renderWindows(); renderFresh();
    $("rail").innerHTML = st.booted ? clubIndex(false) : "";
    const active = document.activeElement && document.activeElement.id === "q";
    renderMain();
    if (active) { const q = $("q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  });
  store.init().then(() => { if (openId) loadDetail(false); });
})();
