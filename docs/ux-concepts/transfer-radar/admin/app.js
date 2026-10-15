(function () {
  if (window.RT_FRAMED) return;
  const R = window.Radar, esc = R.esc, D = window.RadarData;
  const $ = (id) => document.getElementById(id);

  // Review tasks derived from synthetic cases. Real tasks come from the server's review queue (not in the public contract).
  const REASONS = { conflict: "상충 주장", identity: "선수·구단 식별", "post-official": "공식 발표 뒤 상충" };
  const tasks = [];
  D.cases.forEach((c) => {
    c.evidence.filter((e) => e.review_status === "pending").forEach((e) => {
      const reason = !c.player.id ? "identity" : c.stage === "confirmed" ? "post-official" : "conflict";
      tasks.push({ id: `task-${e.id}`, c, e, reason, status: "open", created: e.analyzed_at });
    });
  });
  tasks.sort((a, b) => (a.created < b.created ? 1 : -1));
  const log = [
    { at: "2026-10-14T01:30:00Z", who: "운영자 A", action: "승인", task: "서지안 · 공식 발표 확인", detail: "협상설 → 공식 확정", reason: "구단 공식 발표 URL과 게시 시각 확인" },
    { at: "2026-10-11T00:00:00Z", who: "운영자 B", action: "반려", task: "표준우 · 접촉설", detail: "검토 상태를 반박됨으로", reason: "구단이 사실이 아니라고 공지" },
  ];
  let current = tasks[0] && tasks[0].id;
  let view = location.hash === "#log" ? "log" : "queue";
  let decision = null; // approve | edit | reject
  let flash = "";

  function queue() {
    const open = tasks.filter((t) => t.status === "open");
    const groups = Object.keys(REASONS).map((r) => [r, open.filter((t) => t.reason === r)]).filter(([, l]) => l.length);
    $("queue").innerHTML = `<h2 class="q__h">검토 대기 <span class="n">${open.length}</span></h2>
      ${open.length ? groups.map(([r, l]) => `<section><h3 class="q__g">${REASONS[r]} <span class="n">${l.length}</span></h3><ul>${l.map((t) => `
        <li><button type="button" class="q__item" data-task="${t.id}" aria-current="${t.id === current}">
          <span class="q__name">${esc(t.c.player.name)}</span>
          <span class="q__line">${R.stage(t.c.stage)}<i class="ph ph-arrow-right" aria-label="에 대한 새 주장"></i>${R.stage(t.e.claimed_stage)}</span>
          <span class="q__t">${R.time(t.created)}</span>
        </button></li>`).join("")}</ul></section>`).join("") : `<p class="muted">대기 중인 건이 없습니다.</p>`}`;
  }
  function col(title, stage, conf, rev, body) {
    return `<section class="col"><h3 class="col__h">${title}</h3><div class="col__badges">${stage}${conf}${rev}</div>${body}</section>`;
  }
  function stageOptions(sel) { return R.STAGE_ORDER.map((s) => `<option value="${s}"${s === sel ? " selected" : ""}>${R.STAGES[s].label}</option>`).join(""); }
  function preview(t) {
    const c = t.c, e = t.e;
    if (decision === "approve") {
      if (c.stage === "confirmed") return `<p class="guard" role="alert"><i class="ph ph-shield-warning" aria-hidden="true"></i>공식 확정 건은 새 공식 출처 없이 단계를 바꿀 수 없습니다. 새 주장은 근거로만 남기거나 반려하세요.</p>`;
      if (e.claimed_stage === "confirmed") return `<p class="guard" role="alert">공식 확정은 공식 출처와 확인 시각이 있어야 합니다.</p>`;
      return `<p class="pv">공개 화면: ${R.stage(c.stage)}<i class="ph ph-arrow-right" aria-label="에서"></i>${R.stage(e.claimed_stage)} · 이력에 "${esc(REASONS[t.reason])} 검토 후 반영"이 남습니다.</p>`;
    }
    if (decision === "edit") return `<p class="pv">공개 화면은 아래에서 고른 값으로 바뀌고, 수정 사유가 이력에 남습니다.</p>`;
    if (decision === "reject") return `<p class="pv">공개 화면의 단계는 ${R.stage(c.stage)} 그대로입니다. 새 주장은 근거 목록에 <strong>반박됨</strong>으로 남습니다.</p>`;
    return "";
  }
  function main() {
    if (view === "log") {
      $("main").innerHTML = `<h1 class="h1">처리 이력</h1><table class="log"><caption class="sr-only">최근 처리 이력</caption><thead><tr><th scope="col">시각</th><th scope="col">처리자</th><th scope="col">결정</th><th scope="col">대상</th><th scope="col">변경</th><th scope="col">사유</th></tr></thead><tbody>${log.map((l) => `<tr><td>${R.time(l.at)}</td><td>${esc(l.who)}</td><td><strong>${l.action}</strong></td><td>${esc(l.task)}</td><td>${esc(l.detail)}</td><td>${esc(l.reason)}</td></tr>`).join("")}</tbody></table><p class="muted">처리자 이름은 내부 기록입니다. 공개 API와 공개 화면에는 나오지 않습니다.</p>`;
      return;
    }
    const t = tasks.find((x) => x.id === current && x.status === "open");
    if (!t) { $("main").innerHTML = `${flash ? `<p class="flash" role="status">${flash}</p>` : ""}<div class="empty"><i class="ph ph-check-circle" aria-hidden="true"></i><p>왼쪽에서 검토할 건을 고르세요.</p></div>`; return; }
    const c = t.c, e = t.e;
    const others = c.evidence.filter((x) => x !== e);
    $("main").innerHTML = `
      ${flash ? `<p class="flash" role="status">${flash}</p>` : ""}
      <header class="case"><p class="case__reason">${REASONS[t.reason]}</p><h1 class="h1" id="case-title" tabindex="-1">${R.playerName(c)}</h1><p class="case__route">${R.route(c)} · ${esc((D.windows.find((w) => w.id === c.window_id) || {}).label || c.window_id)} 이적시장</p></header>
      <div class="cols">
        ${col("지금 공개된 상태", R.stage(c.stage, { lg: true }), R.conf(c.confidence), R.review(c.review_status), `<p>${esc(c.summary)}</p>${c.official_confirmation ? `<p class="ok"><i class="ph ph-seal-check" aria-hidden="true"></i>공식 확인 ${R.absTime(c.official_confirmation.verified_at)}</p>` : ""}<p class="muted">근거 ${others.length}건 · 독립 ${c.independent_source_count}</p><ul class="mini">${others.map((x) => `<li>${R.stage(x.claimed_stage)} ${esc(x.source.publisher)} · ${R.absTime(x.source.posted_at)}</li>`).join("")}</ul>`)}
        ${col("새 주장", R.stage(e.claimed_stage, { lg: true }), R.conf(e.confidence), R.review(e.review_status), `<p>${esc(e.claim)}</p><p class="muted">${esc(e.source.publisher)} · ${R.KIND[e.source.kind]} · ${R.RELATION[e.source_relation]} · 게시 ${R.absTime(e.source.posted_at)}</p><a href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">원문 열기 <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>`)}
      </div>
      <form class="decide" id="decide">
        <fieldset><legend>결정</legend>
          <label class="opt"><input type="radio" name="d" value="approve"${decision === "approve" ? " checked" : ""}><span><strong>승인</strong> 새 주장을 반영합니다</span></label>
          <label class="opt"><input type="radio" name="d" value="edit"${decision === "edit" ? " checked" : ""}><span><strong>수정</strong> 단계·신뢰도를 직접 정합니다</span></label>
          <label class="opt"><input type="radio" name="d" value="reject"${decision === "reject" ? " checked" : ""}><span><strong>반려</strong> 기존 단계를 유지하고 새 주장을 반박됨으로 남깁니다</span></label>
        </fieldset>
        ${decision === "edit" ? `<div class="row"><label>반영 단계<select name="stage">${stageOptions(c.stage)}</select></label><label>근거 신뢰도<select name="conf">${Object.entries(R.CONFIDENCE).map(([k, v]) => `<option value="${k}"${k === c.confidence ? " selected" : ""}>${v.label}</option>`).join("")}</select></label></div>` : ""}
        ${identityFix(t)}
        <label class="reason">사유 <span class="muted">(필수, 이력에 남습니다)</span><textarea name="reason" rows="2" required></textarea></label>
        ${preview(t)}
        <div class="actions"><button type="submit" class="btn"${!decision || (decision === "approve" && (c.stage === "confirmed" || e.claimed_stage === "confirmed")) ? " disabled" : ""}>결정 저장</button><button type="button" class="btn btn--ghost" data-act="skip">나중에 보기</button></div>
      </form>`;
  }
  function identityFix(t) {
    if (t.reason !== "identity") return "";
    return `<div class="row"><label>선수 연결<select name="player"><option value="">아직 특정하지 않음</option><option>김도윤 (포항 스틸러스, MF) (합성)</option><option>김서진 (전남 드래곤즈, DF) (합성)</option></select></label><label>출발 구단<select name="from"><option value="">미확인 유지</option>${D.clubs[2027].map((c) => `<option>${esc(c.name)}</option>`).join("")}</select></label></div><p class="muted">선수를 특정하지 못하면 임의로 연결하지 않고 대기열에 남깁니다.</p>`;
  }
  function render() {
    $("tab-queue").setAttribute("aria-current", view === "queue" ? "page" : "false");
    $("tab-log").setAttribute("aria-current", view === "log" ? "page" : "false");
    queue(); main();
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-task],[data-act]");
    if (!b) return;
    if (b.dataset.task) { current = b.dataset.task; decision = null; flash = ""; view = "queue"; history.replaceState(null, "", "#queue"); render(); $("case-title") && $("case-title").focus(); }
    if (b.dataset.act === "skip") { const open = tasks.filter((t) => t.status === "open"); const i = open.findIndex((t) => t.id === current); current = open[(i + 1) % open.length].id; decision = null; render(); }
  });
  document.addEventListener("change", (ev) => { if (ev.target.name === "d") { const r = $("decide").reason.value; decision = ev.target.value; main(); $("decide").reason.value = r; } });
  document.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = ev.target, t = tasks.find((x) => x.id === current);
    if (!f.reason.value.trim()) { f.reason.focus(); return; }
    t.status = "done";
    const words = { approve: "승인", edit: "수정", reject: "반려" };
    log.unshift({ at: R.now, who: "나 (시안)", action: words[decision], task: `${t.c.player.name} · ${REASONS[t.reason]}`, detail: decision === "reject" ? `${R.STAGES[t.c.stage].label} 유지` : decision === "edit" ? `${R.STAGES[t.c.stage].label} → ${R.STAGES[f.stage.value].label}` : `${R.STAGES[t.c.stage].label} → ${R.STAGES[t.e.claimed_stage].label}`, reason: f.reason.value.trim() });
    flash = `${t.c.player.name} 건을 ${words[decision]}했습니다. 처리 이력에 남았습니다. (시안이라 실제로 저장되지 않습니다)`;
    const next = tasks.find((x) => x.status === "open");
    current = next && next.id; decision = null; render();
  });
  addEventListener("hashchange", () => { view = location.hash === "#log" ? "log" : "queue"; render(); });
  render();
})();
