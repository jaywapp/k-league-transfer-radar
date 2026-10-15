/* 05 배송 조회형: each case is a parcel-tracking strip with five stations (관심 접촉 협상 임박 확정).
   The strip fills to the reflected stage; the current station is marked large with its name.
   A claim still under review shows as a hollow amber "ghost" marker where it claims the case is, never as progress.
   The detail reads like a delivery history: reflected changes, incoming claims and official confirmation, newest first. */
(function () {
  const R = window.Radar, S = () => window.RadarSteps, esc = R.esc;
  const FILTERS = [["all", "전체"], ["moving", "진행 중"], ["done", "확정"], ["stopped", "결렬·반박"]];
  let filter = "all";
  const group = (c) => (c.stage === "confirmed" ? "done" : c.stage === "failed" || c.review_status === "refuted" ? "stopped" : "moving");
  const GROUP_ORDER = { moving: 0, done: 1, stopped: 2 };
  // Prototype only: pending claims need evidence, which the list response does not carry (see README).
  const full = (id) => window.RadarData.cases.concat(window.RadarData.stress).find((x) => x.id === id);

  function track(c, opt = {}) {
    const st = S();
    const at = c.stage === "failed" ? 2 : st.idx(c.stage);
    const w = { low: 3, medium: 5, high: 7 }[c.confidence];
    const ghosts = R.pendingClaims(full(c.id) || c);
    const ghostAt = (s) => (s === "failed" ? 0.92 : s === "confirmed" ? 1 : Math.max(st.idx(s), 0) / 4);
    return `<span class="trk trk--${c.stage}${opt.big ? " trk--big" : ""}" style="--w:${w}px;--p:${Math.max(at, 0) / 4}">
      <span class="trk__line"></span><span class="trk__fill"></span>
      ${st.STEPS.map((s, i) => { const now = i === at && c.stage !== "failed"; return `<span class="trk__st${i <= at ? " on" : ""}${now ? " now" : ""}" style="--x:${i / 4}">${now ? `<b class="trk__now">${st.SHORT[s]}</b>` : ""}</span>`; }).join("")}
      ${c.stage === "unknown" ? '<span class="trk__st now trk__st--unknown" style="--x:0"><b class="trk__now">미확인</b></span>' : ""}
      ${c.stage === "failed" ? '<span class="trk__break" style="--x:.56"><i class="ph ph-x"></i></span><b class="trk__now trk__now--failed" style="--x:.56">결렬</b>' : ""}
      ${ghosts.map((e) => `<span class="trk__ghost trk__ghost--${e.claimed_stage}" style="--x:${ghostAt(e.claimed_stage)}" title="${st.SHORT[e.claimed_stage]} 주장 검토 중">${e.claimed_stage === "failed" ? '<i class="ph ph-x"></i>' : ""}</span>`).join("")}
    </span>`;
  }

  const shell = MapShell({
    dom: true, allowEmpty: true, legendLabel: "읽는 법", legendIcon: "package",
    legend: () => `<p class="lg__h">어디까지 왔는지 보여 주는 조회 막대</p>
      <p class="lg__note">채워진 곳까지가 검토를 거쳐 반영된 단계입니다. 큰 점이 현재 위치이고, 마지막 초록 역은 공식 발표를 확인한 경우에만 켜집니다. 막대 굵기는 근거 신뢰도입니다.</p>
      <p class="lg__note">주황 빈 고리는 아직 검토 중인 새 주장이 가리키는 위치입니다. 반영되기 전까지 막대는 움직이지 않습니다. 결렬설은 막대가 빨갛게 끊깁니다.</p>`,
    draw(ctx) {
      const { st, cases, club, board, portrait } = ctx;
      const s = S();
      const row = (c) => {
        const w = s.who(c, st, club.id);
        const pend = R.pendingClaims(full(c.id) || c);
        return `<button type="button" class="parcel parcel--${group(c)}" data-case="${c.id}" aria-label="${esc(RadarMap.describe(c))}${pend.length ? `, ${pend.map((e) => s.SHORT[e.claimed_stage]).join(", ")} 주장 검토 중` : ""}">
          ${s.avatar(c, portrait ? 30 : 36)}
          <span class="parcel__who"><b>${esc(RadarMap.shortName(c.player.name, portrait ? 7 : 12))}</b><small><i class="ph ${w.arrow}" aria-hidden="true"></i>${esc(w.club)}</small></span>
          ${track(c)}
          <span class="parcel__tags">${pend.length ? `<em class="tag-pending"><i class="ph ph-clock-countdown" aria-hidden="true"></i>${pend.map((e) => s.SHORT[e.claimed_stage]).join("·")} 주장 검토 중</em>` : ""}${c.review_status === "refuted" ? '<em class="tag-refuted">반박됨</em>' : ""}</span>
        </button>`;
      };
      const sec = (dir) => {
        const list = cases.filter((c) => R.direction(c, club.id) === dir && (filter === "all" || group(c) === filter))
          .sort((a, b) => GROUP_ORDER[group(a)] - GROUP_ORDER[group(b)] || (a.updated_at < b.updated_at ? 1 : -1));
        let last = null;
        const rows = list.map((c) => { const g = group(c); const head = filter === "all" && g !== last ? `<p class="grp-h grp-h--${g}">${{ moving: "진행 중", done: "확정", stopped: "결렬·반박" }[g]}</p>` : ""; last = g; return head + row(c); }).join("");
        return `<section class="pk-sec"><h2 class="sec-h">${dir === "incoming" ? "영입" : "방출"} <span class="n">${list.length}</span></h2>
          <div class="pk-head" aria-hidden="true"><span></span><span></span><span class="pk-steps">${s.STEPS.map((x) => `<i>${s.SHORT[x]}</i>`).join("")}</span><span></span></div>
          ${rows || '<p class="none">해당하는 소식 없음</p>'}</section>`;
      };
      if (!cases.length) { board.innerHTML = `<div class="board-wrap"><p class="board-title">${esc(club.name)}<span>${esc(ctx.store.window.label)} 이적시장</span></p>${window.RadarParts.stateView("empty", { archived: ctx.store.archived })}</div>`; return; }
      const count = (g) => cases.filter((c) => g === "all" || group(c) === g).length;
      board.innerHTML = `<div class="board-wrap">
        <p class="board-title">${esc(club.name)}<span>${esc(ctx.store.window.label)} 이적시장</span></p>
        <div class="pk-filter" role="group" aria-label="보기">${FILTERS.map(([k, l]) => `<button type="button" data-act="filter" data-f="${k}" aria-pressed="${filter === k}">${l} <span class="n">${count(k)}</span></button>`).join("")}</div>
        ${sec("incoming")}${sec("outgoing")}</div>`;
    },
    onAct(a, t) { if (a === "filter") { filter = t.dataset.f; shell.redraw(); } if (a === "hist-more") { t.closest(".hist-run").classList.add("open"); t.remove(); } },
    renderCard(host, c, { store, st, archived }) {
      if (!c) { host.hidden = true; host.innerHTML = ""; return; }
      const s = S();
      host.hidden = false;
      host.classList.add("card--track");
      host.innerHTML = `
        <div class="card__head">
          <div><p class="card__name" id="card-title" tabindex="-1">${R.playerName(c)}</p><p class="card__route">${R.route(c)}</p></div>
          <button type="button" class="card__x" data-act="card-close" aria-label="닫기"><i class="ph ph-x" aria-hidden="true"></i></button>
        </div>
        <div class="tc-now"><span class="tc-label">현재 위치</span>${R.stage(c.stage, { lg: true })}<span class="tc-sig">${R.conf(c.confidence)}${R.review(c.review_status)}</span></div>
        <div class="tc-track">${track(c, { big: true })}</div>
        <p class="tc-meta">${R.sources(c)}<span>갱신 ${R.time(c.updated_at, { archived })}</span></p>
        <h3 class="tc-h">조회 이력</h3>
        <div id="tc-hist" aria-busy="true"><span class="skel" style="height:120px"></span></div>`;
      store.detail(c.id).then((r) => {
        if (host.querySelector("#tc-hist")) host.querySelector("#tc-hist").outerHTML = history(r.data, archived);
      }).catch((e) => {
        const er = R.errorOf(e);
        const h = host.querySelector("#tc-hist");
        if (h) h.outerHTML = `<p class="card__err" role="alert">${er.title}. 카드를 닫았다가 다시 열어 주세요.</p>`;
      });
    },
  });

  // Delivery-history list: newest first; long runs of reposts fold into one line.
  function history(c, archived) {
    const s = S();
    const ev = [];
    if (c.official_confirmation) ev.push({ at: c.official_confirmation.verified_at, kind: "verified", c });
    c.history.forEach((h) => ev.push({ at: h.changed_at, kind: "reflect", h }));
    c.evidence.forEach((e) => {
      const kind = e.source.kind === "official" ? "official" : e.review_status === "pending" && e.claimed_stage !== c.stage ? "pending" : e.source_relation === "repost" ? "repost" : "claim";
      ev.push({ at: e.source.posted_at, kind, e });
    });
    ev.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : (a.kind === "reflect" || a.kind === "verified") ? -1 : 1));
    const link = (e) => e.source.availability === "available"
      ? `<a href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">원문<span class="sr-only"> ${esc(e.source.publisher)} (새 창)</span> <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>`
      : `<span class="gone"><i class="ph ph-link-break" aria-hidden="true"></i>원문 삭제·접근 불가</span>`;
    const item = (x) => {
      const t = `<time datetime="${x.at}">${R.absTime(x.at, { archived })}</time>`;
      if (x.kind === "verified") return `<li class="hi hi--verified">${t}<p class="hi__t"><i class="ph ph-seal-check" aria-hidden="true"></i>공식 발표 확인</p><p class="hi__s">서버가 구단 공식 발표를 확인했습니다. <a href="${esc(c.official_confirmation.url)}" target="_blank" rel="noopener noreferrer">공식 발표 <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a></p></li>`;
      if (x.kind === "reflect") return `<li class="hi hi--reflect hi--${x.h.stage_after}">${t}<p class="hi__t">${R.STAGES[x.h.stage_after].label} 반영</p><p class="hi__s">${esc(x.h.reason)} · ${s.SHORT[x.h.stage_before]}에서 이동</p></li>`;
      const e = x.e;
      if (x.kind === "pending") return `<li class="hi hi--pending">${t}<p class="hi__t">${s.SHORT[e.claimed_stage]} 주장 접수 · 검토 중</p><p class="hi__s">${esc(e.source.publisher)} · ${esc(e.claim)}</p><p class="hi__note">검토가 끝나기 전까지 현재 위치는 바뀌지 않습니다.</p><p class="hi__l">${link(e)}</p></li>`;
      return `<li class="hi hi--${x.kind}${e.claimed_stage === "failed" ? " hi--fail" : ""}">${t}<p class="hi__t">${x.kind === "official" ? "구단 공식 발표" : x.kind === "repost" ? "재게시" : `${s.SHORT[e.claimed_stage]} 주장`}</p><p class="hi__s">${esc(e.source.publisher)} · ${R.KIND[e.source.kind]} · ${esc(e.claim)}</p><p class="hi__l">${R.conf(e.confidence)} ${link(e)}</p></li>`;
    };
    const out = []; let run = [];
    const flush = () => { if (run.length >= 3) out.push(`<li class="hist-run"><button type="button" class="hist-more" data-act="hist-more">재게시 ${run.length}건 펼치기 <span>독립 근거로 세지 않음</span></button><ol>${run.map(item).join("")}</ol></li>`); else run.forEach((r) => out.push(item(r))); run = []; };
    ev.forEach((x) => { if (x.kind === "repost") run.push(x); else { flush(); out.push(item(x)); } });
    flush();
    return `<ol class="hist-track">${out.join("")}</ol>${window.RadarParts.identityNotes(c)}`;
  }
})();
