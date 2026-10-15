(function () {
  if (window.RT_FRAMED) return;
  const R = window.Radar, P = window.RadarParts, esc = R.esc;
  const store = R.createStore({ pageSize: 30 });
  const st = store.state;
  const $ = (id) => document.getElementById(id);
  const url = () => new URL(location.href);
  let openId = R.caseParam();
  let expanded = url().searchParams.get("x") || null;
  let compare = (url().searchParams.get("cmp") || "").split(",").filter(Boolean);
  const details = {}; // id -> {state, c, err}
  let listScroll = 0;

  function saveUi() {
    const u = url();
    expanded ? u.searchParams.set("x", expanded) : u.searchParams.delete("x");
    compare.length ? u.searchParams.set("cmp", compare.join(",")) : u.searchParams.delete("cmp");
    history.replaceState(history.state, "", u);
  }
  async function fetchDetail(id) {
    if (details[id] && details[id].state === "ready") return;
    details[id] = { state: "loading" };
    try { details[id] = { state: "ready", c: (await store.detail(id)).data }; }
    catch (e) { details[id] = { state: "error", err: e }; }
  }

  // ---------- bar + filters ----------
  function renderBar() {
    $("window").innerHTML = st.windows.map((w) => `<option value="${w.id}"${w.id === st.windowId ? " selected" : ""}>${esc(w.label)}${w.archived_at ? " · 보관됨" : ""}</option>`).join("");
    const grp = (lg, l) => { const list = st.clubs.filter((c) => c.league === lg); return list.length ? `<optgroup label="${l}">${list.map((c) => `<option value="${c.id}"${c.id === st.clubId ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</optgroup>` : ""; };
    $("club").innerHTML = grp("K1", "K리그1") + grp("K2", "K리그2");
    $("window").disabled = $("club").disabled = !st.windows.length;
    const n = store.counts;
    $("dirs").innerHTML = ["incoming", "outgoing"].map((d) => `<button type="button" data-dir="${d}" aria-pressed="${st.dir === d}">${d === "incoming" ? "영입" : "방출"} <span class="n">${d === "incoming" ? n.incoming : n.outgoing}</span></button>`).join("");
    const f = R.freshness(st.meta, store.window);
    $("fresh").className = `fresh fresh--${f.tone}`;
    $("fresh").innerHTML = `<i class="ph ${f.icon}" aria-hidden="true"></i><span>${f.text}</span>${f.tone !== "ok" && f.detail ? `<span class="fresh__d">${f.detail}</span>` : ""}`;
  }
  function filtersHTML(prefix) {
    const group = (kind, title, entries, render) => `
      <fieldset class="fg"><legend>${title}</legend>
        <label class="opt"><input type="radio" name="${prefix}-${kind}" data-filter="${kind}" value=""${!st[kind] ? " checked" : ""}><span>전체</span></label>
        ${entries.map(([v, l]) => `<label class="opt"><input type="radio" name="${prefix}-${kind}" data-filter="${kind}" value="${v}"${st[kind] === v ? " checked" : ""}><span>${render ? render(v) : l}</span></label>`).join("")}
      </fieldset>`;
    return `
      <form class="fq" data-qform role="search"><label for="${prefix}-q">선수·구단 검색</label><div class="fq__in"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input id="${prefix}-q" data-q type="search" value="${esc(st.q)}" autocomplete="off"></div></form>
      ${group("stage", "반영 단계", R.STAGE_ORDER.map((s) => [s, ""]), (s) => R.stage(s))}
      ${group("confidence", "근거 신뢰도", Object.keys(R.CONFIDENCE).map((k) => [k, ""]), (k) => R.conf(k))}
      ${group("review", "검토 상태", Object.keys(R.REVIEW).map((k) => [k, ""]), (k) => R.review(k))}
      ${store.hasFilters ? `<button type="button" class="tbtn" data-act="clear">조건 모두 지우기</button>` : ""}`;
  }

  // ---------- table ----------
  function mix(c) {
    // Prototype-only: claimed-stage mix per case. Needs an added list field (see README).
    const full = window.RadarData.cases.concat(window.RadarData.stress).find((x) => x.id === c.id);
    if (!full) return "";
    const by = {};
    full.evidence.forEach((e) => { const g = e.independence_group_id || e.id; by[e.claimed_stage] = by[e.claimed_stage] || new Set(); by[e.claimed_stage].add(g); });
    return Object.entries(by).map(([s, g]) => `<span class="mix${s !== c.stage ? " mix--diff" : ""}">${R.STAGES[s].label} ${g.size}</span>`).join("");
  }
  function sourceTable(c, archived) {
    const groups = new Map();
    c.evidence.forEach((e) => { const k = e.independence_group_id || e.id; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
    let i = 0;
    return `
      <table class="srct">
        <caption class="sr-only">${esc(c.player.name)} 출처별 주장</caption>
        <thead><tr><th scope="col">출처</th><th scope="col">관계</th><th scope="col">게시</th><th scope="col">주장한 단계</th><th scope="col">신뢰도</th><th scope="col">검토</th><th scope="col">원문</th></tr></thead>
        ${[...groups.values()].map((g) => `
          <tbody>
            <tr class="srct__g"><th colspan="7" scope="rowgroup">정보 계통 ${++i}${g.length > 1 ? ` · ${g.length}건 (독립 근거 1개로 셈)` : ""}</th></tr>
            ${g.map((e) => `<tr class="${e.review_status === "pending" ? "is-pending" : ""}${e.source.kind === "official" ? " is-official" : ""}">
              <td data-l="출처"><strong>${esc(e.source.publisher)}</strong><span class="srct__claim">${esc(e.claim)}</span></td>
              <td data-l="관계">${R.KIND[e.source.kind]} · ${R.RELATION[e.source_relation]}</td>
              <td data-l="게시">${R.time(e.source.posted_at, { archived })}</td>
              <td data-l="주장한 단계">${R.stage(e.claimed_stage)}${e.claimed_stage !== c.stage ? '<span class="diff">반영 단계와 다름</span>' : ""}</td>
              <td data-l="신뢰도">${R.conf(e.confidence, { short: true })}</td>
              <td data-l="검토">${R.review(e.review_status)}</td>
              <td data-l="원문">${e.source.availability === "available" ? `<a href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">열기<span class="sr-only"> ${esc(e.source.publisher)} 원문 (새 창)</span> <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>` : `<span class="gone"><i class="ph ph-link-break" aria-hidden="true"></i>${e.source.availability === "unavailable" ? "삭제·접근 불가" : "확인 불가"}</span>`}</td>
            </tr>`).join("")}
          </tbody>`).join("")}
      </table>`;
  }
  function expansion(c) {
    const d = details[c.id];
    if (!d || d.state === "loading") return `<div class="xp" aria-busy="true"><span class="skel" style="height:16px;width:40%"></span><span class="skel" style="height:90px;margin-top:10px"></span></div>`;
    if (d.state === "error") { const e = R.errorOf(d.err); return `<div class="xp"><p class="xp__err" role="alert"><i class="ph ${e.icon}" aria-hidden="true"></i>${e.title}. <button type="button" class="tbtn" data-act="x-retry" data-id="${c.id}">다시 시도</button></p></div>`; }
    const full = d.c;
    return `<div class="xp">
      <p class="xp__sum">${esc(full.summary)}</p>
      ${P.pending(full)}${P.official(full)}
      ${sourceTable(full, store.archived)}
      <a class="tbtn tbtn--solid" href="${R.openCaseUrl(c.id).search}" data-open="${c.id}">상세와 변경 이력 보기<i class="ph ph-arrow-right" aria-hidden="true"></i></a>
    </div>`;
  }
  function rowHTML(c) {
    const other = R.counterpart(c, st.clubId);
    const isX = expanded === c.id;
    const inCmp = compare.includes(c.id);
    return `
      <tbody class="r${isX ? " r--x" : ""}">
        <tr>
          <td class="c-cmp"><input type="checkbox" data-cmp="${c.id}" aria-label="${esc(c.player.name)} 비교에 넣기"${inCmp ? " checked" : ""}${!inCmp && compare.length >= 3 ? " disabled" : ""}></td>
          <th scope="row" class="c-player"><button type="button" class="xbtn" data-x="${c.id}" aria-expanded="${isX}"><i class="ph ph-caret-right" aria-hidden="true"></i><span class="c-name">${R.playerName(c)}</span></button><span class="c-pos">${c.player.position ? R.POS[c.player.position] : "포지션 미상"}</span></th>
          <td class="c-club" data-l="${st.dir === "incoming" ? "출발" : "도착"}">${R.clubName(other, "구단 미확인")}</td>
          <td class="c-stage" data-l="반영 단계">${R.stage(c.stage)}</td>
          <td class="c-mix" data-l="출처 주장 (독립 계통)">${mix(c)}</td>
          <td class="c-conf" data-l="근거 신뢰도">${R.conf(c.confidence, { short: true })}</td>
          <td class="c-rev" data-l="검토">${R.review(c.review_status)}</td>
          <td class="c-src" data-l="출처">${c.source_count} <span class="muted">/ 독립 ${c.independent_source_count}</span></td>
          <td class="c-time" data-l="갱신">${R.time(c.updated_at, { archived: store.archived })}</td>
        </tr>
        ${isX ? `<tr class="r__xp"><td colspan="9">${expansion(c)}</td></tr>` : ""}
      </tbody>`;
  }
  function compareHTML() {
    if (!compare.length) return "";
    const list = compare.map((id) => st.items.find((c) => c.id === id)).filter(Boolean);
    const rows = [
      ["경로", (c) => R.route(c)], ["반영 단계", (c) => R.stage(c.stage)], ["근거 신뢰도", (c) => R.conf(c.confidence)],
      ["검토", (c) => R.review(c.review_status)], ["출처", (c) => `${c.source_count}건 · 독립 ${c.independent_source_count}`],
      ["공식 확인", (c) => (c.official_confirmation ? `${R.absTime(c.official_confirmation.verified_at)} 확인` : '<span class="muted">없음</span>')],
      ["갱신", (c) => R.time(c.updated_at, { archived: store.archived })],
    ];
    return `<section class="cmp" aria-labelledby="cmp-h">
      <div class="cmp__head"><h2 id="cmp-h">비교 <span class="n">${list.length}/3</span></h2><button type="button" class="tbtn" data-act="cmp-clear">비교 비우기</button></div>
      <div class="cmp__scroll"><table class="cmpt"><thead><tr><th scope="col"><span class="sr-only">항목</span></th>${list.map((c) => `<th scope="col">${R.playerName(c)}<button type="button" class="ibtn ibtn--sm" data-cmp-rm="${c.id}" aria-label="${esc(c.player.name)} 비교에서 빼기"><i class="ph ph-x" aria-hidden="true"></i></button></th>`).join("")}</tr></thead>
      <tbody>${rows.map(([l, f]) => `<tr><th scope="row">${l}</th>${list.map((c) => `<td>${f(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    </section>`;
  }
  function renderMain() {
    const main = $("main");
    if (st.status === "no-window") { main.innerHTML = P.stateView("no-window"); return; }
    const club = store.club;
    const tools = `<div class="tools"><h1 class="h1">${club ? esc(club.name) : ""} <span class="h1__sub">${st.dir === "incoming" ? "영입" : "방출"} 이적 건</span></h1><button type="button" class="tbtn tbtn--filters" data-act="filters"><i class="ph ph-funnel" aria-hidden="true"></i>필터${[st.stage, st.confidence, st.review, st.q].filter(Boolean).length ? ` <span class="n">${[st.stage, st.confidence, st.review, st.q].filter(Boolean).length}</span>` : ""}</button><p class="tools__hint">최근 갱신순 · 낮은 신뢰도와 검토 대기 포함 · 행을 펼치면 출처별 주장이 보입니다</p></div>`;
    const archive = store.archived ? `<div class="archive" role="note"><i class="ph ph-archive" aria-hidden="true"></i><span><strong>지난 시장 기록 · 읽기 전용.</strong> ${R.absTime(store.window.archived_at, { dateOnly: true, year: true })}에 보관한 상태입니다.</span><button type="button" class="tbtn" data-act="current">진행 중인 시장 보기</button></div>` : "";
    let body;
    if ((st.status === "loading" || !st.booted) && !st.items.length) body = `<div class="tbl-wrap" aria-busy="true">${Array.from({ length: 7 }, () => `<span class="skel" style="height:40px;margin:6px 0"></span>`).join("")}</div>`;
    else if (st.status === "error" && !st.items.length) body = P.stateView("error", { error: st.error });
    else if (!st.items.length) body = P.stateView(store.hasFilters ? "filter-empty" : "empty", { archived: store.archived });
    else body = `${st.status === "error" ? P.staleBanner(st) : ""}${compareHTML()}
      <div class="tbl-wrap">
        <table class="t${st.status === "refreshing" ? " is-busy" : ""}">
          <caption class="sr-only">${club ? esc(club.name) : ""} ${st.dir === "incoming" ? "영입" : "방출"} 이적 건, 최근 갱신순</caption>
          <thead><tr><th scope="col" class="c-cmp"><span class="sr-only">비교</span><i class="ph ph-columns" aria-hidden="true"></i></th><th scope="col">선수</th><th scope="col">${st.dir === "incoming" ? "출발 구단" : "도착 구단"}</th><th scope="col">반영 단계</th><th scope="col">출처 주장 (독립 계통)</th><th scope="col">근거 신뢰도</th><th scope="col">검토</th><th scope="col">출처 / 독립</th><th scope="col">갱신</th></tr></thead>
          ${st.items.map(rowHTML).join("")}
        </table>
      </div>${P.pageFooter(st)}`;
    main.innerHTML = archive + tools + body;
  }

  // ---------- full detail ----------
  function renderDetail() {
    const d = details[openId];
    const back = `<a class="back" href="${R.openCaseUrl(null).search}" data-act="close"><i class="ph ph-arrow-left" aria-hidden="true"></i>표로 돌아가기</a>`;
    if (!d || d.state === "loading") { $("main").innerHTML = `${back}<div aria-busy="true"><span class="skel" style="height:36px;width:40%"></span><span class="skel" style="height:200px;margin-top:16px"></span></div>`; return; }
    if (d.state === "error") { const e = R.errorOf(d.err); $("main").innerHTML = `${back}<div class="state state--error" role="alert"><i class="ph ${e.icon}" aria-hidden="true"></i><p class="state__title">${e.title}</p><p class="state__body">${e.body}</p><button type="button" class="tbtn tbtn--solid" data-act="d-retry">다시 시도</button></div>`; return; }
    const c = d.c, archived = c.window_id !== "2027-winter";
    $("main").innerHTML = `
      ${back}
      ${archived ? `<p class="archive archive--sm"><i class="ph ph-archive" aria-hidden="true"></i>지난 시장 기록 · 보관 당시 상태</p>` : ""}
      <div class="dt">
        <section class="dt__l">
          <p class="dt__pos">${c.player.position ? R.POS[c.player.position] : "포지션 미상"}</p>
          <h1 class="dt__name" id="detail-title" tabindex="-1">${R.playerName(c)}</h1>
          <p class="dt__route">${R.route(c)}</p>
          <dl class="dt__kv">
            <dt>반영 단계</dt><dd>${R.stage(c.stage, { lg: true })}</dd>
            <dt>근거 신뢰도</dt><dd>${R.conf(c.confidence)}</dd>
            <dt>검토</dt><dd>${R.review(c.review_status)}</dd>
            <dt>출처</dt><dd>${c.source_count}건 · 독립 계통 ${c.independent_source_count}개</dd>
            <dt>갱신</dt><dd>${R.time(c.updated_at, { archived })}</dd>
          </dl>
          <p>${esc(c.summary)}</p>
          ${P.pending(c)}${P.official(c)}${P.identityNotes(c)}
          <h2 class="h2">반영된 단계 변경</h2>${P.historyList(c, { archived })}
        </section>
        <section class="dt__r" aria-labelledby="src-h"><h2 class="h2" id="src-h">출처별 주장</h2>${sourceTable(c, archived)}</section>
      </div>`;
  }

  function render() {
    renderBar();
    $("side").innerHTML = st.booted && st.status !== "no-window" ? `<h2 class="side__h">조건</h2>${filtersHTML("s")}` : "";
    if (openId) { document.body.classList.add("is-detail"); renderDetail(); }
    else { document.body.classList.remove("is-detail"); renderMain(); }
  }
  async function toggleX(id) {
    expanded = expanded === id ? null : id;
    saveUi(); renderMain();
    if (expanded) { await fetchDetail(id); if (expanded === id && !openId) renderMain(); }
    const b = document.querySelector(`[data-x="${id}"]`); b && b.focus();
  }
  async function open(id, push) {
    if (!openId) listScroll = scrollY;
    openId = id;
    if (push) history.pushState({ case: id }, "", R.openCaseUrl(id));
    render(); scrollTo(0, 0);
    await fetchDetail(id);
    if (openId === id) { renderDetail(); const t = $("detail-title"); t && t.focus({ preventScroll: true }); }
  }
  function close(push) {
    const last = openId; openId = null;
    if (push) history.pushState({}, "", R.openCaseUrl(null));
    render(); scrollTo(0, listScroll);
    const b = document.querySelector(`[data-x="${last}"]`); b && b.focus({ preventScroll: true });
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-x],[data-open],[data-dir],[data-act],[data-close],[data-cmp-rm],#guide-open");
    if (!t) return;
    if (t.dataset.x) { toggleX(t.dataset.x); return; }
    if (t.dataset.open) { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); open(t.dataset.open, true); return; }
    if (t.dataset.dir) { expanded = null; saveUi(); store.setDir(t.dataset.dir); return; }
    if (t.dataset.cmpRm) { compare = compare.filter((x) => x !== t.dataset.cmpRm); saveUi(); renderMain(); return; }
    if (t.id === "guide-open") { $("guide-body").innerHTML = P.guide; $("guide").showModal(); return; }
    if (t.hasAttribute("data-close")) { t.closest("dialog").close(); return; }
    const a = t.dataset.act;
    if (a === "close") { e.preventDefault(); close(true); }
    if (a === "retry") store.retry();
    if (a === "more") store.more();
    if (a === "clear") { store.clearFilters(); $("fsheet").open && $("fsheet").close(); }
    if (a === "filters") { $("fsheet-body").innerHTML = filtersHTML("m"); $("fsheet").showModal(); }
    if (a === "cmp-clear") { compare = []; saveUi(); renderMain(); }
    if (a === "x-retry") { delete details[t.dataset.id]; toggleX(t.dataset.id); toggleX(t.dataset.id); }
    if (a === "d-retry") { delete details[openId]; open(openId, false); }
    if (a === "current") { const w = st.windows.find((x) => !x.archived_at); w && store.setWindow(w.id); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "window") { expanded = null; compare = []; saveUi(); store.setWindow(t.value); }
    if (t.id === "club") { expanded = null; compare = []; saveUi(); store.setClub(t.value); }
    if (t.dataset.filter !== undefined) { expanded = null; saveUi(); store.setFilter(t.dataset.filter, t.value || store.state[t.dataset.filter]); }
    if (t.dataset.cmp) { compare = t.checked ? compare.concat(t.dataset.cmp).slice(0, 3) : compare.filter((x) => x !== t.dataset.cmp); saveUi(); renderMain(); }
  });
  document.addEventListener("submit", (e) => { if (e.target.hasAttribute("data-qform")) { e.preventDefault(); store.setQuery(e.target.querySelector("[data-q]").value); } });
  let qt;
  document.addEventListener("input", (e) => { if (e.target.hasAttribute("data-q")) { clearTimeout(qt); const v = e.target.value; qt = setTimeout(() => store.setQuery(v), 350); } });
  addEventListener("popstate", () => { const id = R.caseParam(); if (id) open(id, false); else if (openId) close(false); });

  store.subscribe(() => {
    const a = document.activeElement, id = a && a.id;
    if (openId) { renderBar(); return; }
    render();
    if (id) { const el = $(id); if (el) { el.focus(); if (el.setSelectionRange && el.type === "search") el.setSelectionRange(el.value.length, el.value.length); } }
  });
  store.init().then(async () => {
    if (openId) { open(openId, false); return; }
    if (expanded) { await fetchDetail(expanded); renderMain(); }
  });
})();
