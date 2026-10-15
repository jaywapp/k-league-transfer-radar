/* 03 단계 칸반: columns are claimed stages; cards sit in the column their case has reached.
   Failed claims drop into a separate tray at the end. Card edge: dashed = claim, solid green = official. */
MapShell({
  dom: true, allowEmpty: true, legendLabel: "읽는 법", legendIcon: "kanban",
  legend: () => `<p class="lg__h">기둥 = 단계</p><p class="lg__note">카드는 출처들이 주장한 단계의 기둥에 있습니다. 점선 테두리는 주장, 초록 실선은 공식 발표를 확인한 경우입니다. ↙는 영입, ↗는 방출입니다. 점 세 개는 근거 신뢰도, 주황 점은 검토 대기입니다.</p>`,
  draw(ctx) {
    const { R, st, cases, club, board, portrait } = ctx;
    const S = RadarSteps, esc = R.esc;
    const COLS = ["unknown", ...S.STEPS, "failed"];
    const card = (c) => {
      const w = S.who(c, st, club.id);
      return `<button type="button" class="kc kc--${c.stage}${c.review_status === "refuted" ? " kc--refuted" : ""}" data-case="${c.id}" aria-label="${esc(RadarMap.describe(c))}">
        ${S.avatar(c, 28)}<span class="kc__nm">${esc(RadarMap.shortName(c.player.name, 8))}</span>
        <span class="kc__meta"><i class="ph ${w.arrow}" aria-hidden="true"></i>${esc(w.club)} ${S.confDots(c)}</span>
      </button>`;
    };
    board.innerHTML = `<div class="board-wrap kb-wrap"><p class="board-title">${esc(club.name)}<span>${esc(ctx.store.window.label)} 이적시장 · ↙ 영입 ↗ 방출</span></p>
      <div class="kb" role="list">${COLS.map((s) => {
        const list = cases.filter((c) => c.stage === s);
        return `<section class="kcol kcol--${s}" role="listitem" aria-label="${R.STAGES[s].label} ${list.length}건"><h2 class="kcol__h"><span class="kcol__dot"></span>${S.SHORT[s]}<span class="n">${list.length}</span></h2><div class="kcol__cards">${list.map(card).join("")}</div></section>`;
      }).join("")}</div></div>`;
  },
});
