/* Common shell for the map concepts: thin bar, store, states, card, legend, list alternative, URL state.
   Each concept supplies draw(ctx) that lays out nodes and connections. */
(function () {
  window.MapShell = function (opts) {
    if (window.RT_FRAMED) return;
    const R = window.Radar, M = window.RadarMap, P = window.RadarParts, esc = R.esc;
    const store = R.createStore({ pageSize: 100, allClubs: !!opts.allClubs });
    store.state.dir = "all";
    const st = store.state;
    const $ = (id) => document.getElementById(id);
    let selected = R.caseParam();
    let pop = null; // "legend" | "list" | null

    document.body.insertAdjacentHTML("afterbegin", `
      <a class="skip" href="#map">지도로 건너뛰기</a>
      <header class="bar">
        <p class="bar__name">K리그 이적 레이더<small>독립 팬 서비스</small></p>
        <label class="pick"><span class="sr-only">이적시장</span><select id="window"></select></label>
        ${opts.clubPicker === false ? "" : `<label class="pick"><span class="sr-only">구단</span><select id="club"></select></label>`}
        <button type="button" class="ib" id="lg-btn" aria-expanded="false" aria-controls="pop" aria-label="${opts.legendLabel || "선 읽는 법"}"><i class="ph ph-${opts.legendIcon || "line-segments"}" aria-hidden="true"></i></button>
        <button type="button" class="ib" id="list-btn" aria-expanded="false" aria-controls="pop" aria-label="글 목록으로 보기"><i class="ph ph-list-bullets" aria-hidden="true"></i></button>
      </header>
      <div class="stagewrap" id="stage">
        <div class="board" id="board"${opts.dom ? "" : " hidden"}></div>
        <svg class="map" id="map"${opts.dom ? " hidden" : ""} tabindex="-1" role="group" aria-label="이적 연결 지도"><defs id="defs"></defs><g id="layer-cx"></g><g id="layer-nodes"></g></svg>
        <div id="overlay"></div>
        <div class="pop" id="pop" hidden></div>
        <aside class="card" id="card" aria-labelledby="card-title" hidden></aside>
        <p class="status" id="status"></p>
      </div>`);

    function bar() {
      $("window").innerHTML = st.windows.map((w) => `<option value="${w.id}"${w.id === st.windowId ? " selected" : ""}>${esc(w.label)}${w.archived_at ? " 보관" : ""}</option>`).join("");
      if ($("club")) {
        const g = (lg, l) => { const list = st.clubs.filter((c) => c.league === lg); return list.length ? `<optgroup label="${l}">${list.map((c) => `<option value="${c.id}"${c.id === st.clubId ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</optgroup>` : ""; };
        $("club").innerHTML = g("K1", "K리그1") + g("K2", "K리그2");
        $("club").disabled = !st.clubs.length;
      }
      $("window").disabled = !st.windows.length;
      $("status").innerHTML = `${st.meta ? M.freshText(st.meta, store.window) : ""}${store.archived ? '<span class="tag"><i class="ph ph-archive" aria-hidden="true"></i>지난 시장 · 읽기 전용</span>' : ""}<span class="synthetic-note">가상 선수·가상 소식, 구단명만 실제</span>`;
      document.body.classList.toggle("archived", store.archived);
    }
    function overlay() {
      const o = $("overlay");
      if (st.status === "no-window") return (o.innerHTML = P.stateView("no-window"));
      if ((st.status === "loading" || !st.booted) && !st.items.length) return (o.innerHTML = `<div class="loading-ring" aria-hidden="true"></div><p class="sr-only" role="status">불러오는 중</p>`);
      if (st.status === "error" && !st.items.length) return (o.innerHTML = P.stateView("error", { error: st.error }));
      if (st.status === "error") return (o.innerHTML = `<div class="pop" style="left:auto;right:16px;top:auto;bottom:44px;width:auto">${P.staleBanner(st)}</div>`);
      if (!st.items.length && !opts.allowEmpty) return (o.innerHTML = P.stateView("empty", { archived: store.archived }));
      o.innerHTML = "";
    }
    function draw() {
      const svg = $("map"), defs = $("defs");
      defs.innerHTML = ""; $("layer-cx").innerHTML = ""; $("layer-nodes").innerHTML = ""; $("board").innerHTML = "";
      overlay();
      if (!st.booted || st.status === "no-window" || (st.status === "error" && !st.items.length) || (st.status === "loading" && !st.items.length)) return;
      const box = (opts.dom ? $("board") : svg).getBoundingClientRect();
      const ctx = { R, M, P, store, st, svg, defs, board: $("board"), cx: $("layer-cx"), nodes: $("layer-nodes"), w: box.width, h: box.height, portrait: box.height > box.width * 1.05, selected, cases: st.items, club: store.club };
      opts.draw(ctx);
      markSel(selected);
      svg.dataset.pinned = selected || "";
      highlight(selected);
    }
    const highlight = M.wireHighlight($("map"));
    function markSel(id) { document.querySelectorAll("#map .pn, #board [data-case]").forEach((n) => n.classList.toggle("is-sel", n.dataset.case === id)); }

    function select(id, focusCard) {
      selected = id;
      const u = new URL(location.href);
      id ? u.searchParams.set("case", id) : u.searchParams.delete("case");
      history.replaceState(null, "", u);
      const c = st.items.find((x) => x.id === id);
      if (opts.renderCard) opts.renderCard($("card"), c || null, { store, st, archived: store.archived });
      else M.card($("card"), c || null, { archived: store.archived });
      $("map").dataset.pinned = id || "";
      markSel(id);
      highlight(id);
      if (focusCard && c) $("card-title").focus();
    }
    function togglePop(kind) {
      pop = pop === kind ? null : kind;
      $("pop").hidden = !pop;
      $("lg-btn").setAttribute("aria-expanded", pop === "legend");
      $("list-btn").setAttribute("aria-expanded", pop === "list");
      if (pop === "legend") $("pop").innerHTML = opts.legend ? opts.legend() : M.legend();
      if (pop === "list") $("pop").innerHTML = `<p class="lg__h">${opts.allClubs ? "이번 시장의 모든 연결" : `${store.club ? esc(store.club.name) : ""}의 연결`}, 최근 갱신순</p>${M.textList(st.items, st.clubId)}`;
    }

    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-case],[data-club],[data-act],#lg-btn,#list-btn");
      if (!t) { if (e.target.closest("#map, #board")) select(null); return; }
      if (t.id === "lg-btn") return togglePop("legend");
      if (t.id === "list-btn") return togglePop("list");
      if (t.dataset.case && !t.closest(".card")) { if (t.closest("#pop")) togglePop(null); return select(t.dataset.case, true); }
      if (t.dataset.club && t.closest("#map") && opts.onClub) return opts.onClub(t.dataset.club, store);
      const a = t.dataset.act;
      if (a === "card-close") { const id = selected; select(null); const n = document.querySelector(`#map .pn[data-case="${id}"], #board [data-case="${id}"]`); n && n.focus(); }
      if (a === "card-evidence" || a === "card-evidence-retry") M.cardEvidence($("card"), store, selected, store.archived);
      if (a === "retry") store.retry();
      if (a === "clear") store.clearFilters();
      if (opts.onAct) opts.onAct(a, t, store);
    });
    document.addEventListener("keydown", (e) => {
      const n = e.target.closest && e.target.closest(".pn,.cn[role=button],.cx");
      if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); n.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
      if (e.key === "Escape") { if (pop) togglePop(null); else if (selected) { const id = selected; select(null); const p = document.querySelector(`#map .pn[data-case="${id}"], #board [data-case="${id}"]`); p && p.focus(); } }
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "window") { select(null); store.setWindow(e.target.value); }
      if (e.target.id === "club") { select(null); store.setClub(e.target.value); }
    });

    store.subscribe(() => { bar(); draw(); if (pop === "list") { pop = null; togglePop("list"); } });
    M.onSize($("stage"), draw);
    store.init().then(() => { if (selected) select(selected); });
    return { store, redraw: draw, select };
  };
})();
