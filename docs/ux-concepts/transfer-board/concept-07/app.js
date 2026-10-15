/* 07 카드 덱형: one case at a time, as a large card on top of a deck. The ring fills as the claim advances;
   swipe, arrow keys or the buttons move through the deck (most recently updated first). */
(function () {
  let i = 0;
  const shell = MapShell({
    dom: true, allowEmpty: true, legendLabel: "읽는 법", legendIcon: "cards",
    legend: () => RadarBoard.tokenLegend("고리가 찰수록 진전된 주장"),
    draw(ctx) {
      const { R, st, cases, club, board, portrait } = ctx;
      const S = RadarSteps, B = RadarBoard, esc = R.esc;
      if (!cases.length) { board.innerHTML = `<div class="dk"><p class="dk-empty">이 시장에 연결된 이적 소식이 없습니다</p></div>`; return; }
      i = Math.min(i, cases.length - 1);
      const c = cases[i], w = S.who(c, st, club.id);
      const peek = (k) => cases[i + k] ? `<div class="dk-peek dk-peek--${k} dk-peek--${cases[i + k].stage}" aria-hidden="true"></div>` : "";
      board.innerHTML = `
        <div class="dk">
          <p class="dk-top"><span>${esc(club.name)}</span><span class="dk-count">${i + 1} / ${cases.length}</span></p>
          <div class="dk-stack">
            ${peek(2)}${peek(1)}
            <button type="button" class="dk-card dk-card--${c.stage}" data-case="${c.id}" aria-label="${esc(RadarMap.describe(c))}. 눌러서 근거 보기">
              <span class="dk-dir"><i class="ph ${w.arrow}" aria-hidden="true"></i>${w.dir === "incoming" ? "영입" : "방출"}</span>
              ${B.ring(c, portrait ? 150 : 180)}
              <span class="dk-name">${esc(c.player.name)}</span>
              <span class="dk-route">${c.from_club ? esc(B.shortClub(st, c.from_club)) : "?"} <i class="ph ph-arrow-right" aria-hidden="true"></i> ${c.to_club ? esc(B.shortClub(st, c.to_club)) : "?"}</span>
              <span class="dk-stage">${R.STAGES[c.stage].label}</span>
            </button>
          </div>
          <div class="dk-nav">
            <button type="button" class="dk-btn" data-act="prev" aria-label="이전 건"${i === 0 ? " disabled" : ""}><i class="ph ph-arrow-left" aria-hidden="true"></i></button>
            <div class="dk-dots" aria-hidden="true">${cases.slice(Math.max(0, i - 4), i + 5).map((x, k) => `<i class="${x === c ? "on" : ""} dk-dot--${x.stage}"></i>`).join("")}</div>
            <button type="button" class="dk-btn" data-act="next" aria-label="다음 건"${i === cases.length - 1 ? " disabled" : ""}><i class="ph ph-arrow-right" aria-hidden="true"></i></button>
          </div>
        </div>`;
      const card = board.querySelector(".dk-card");
      let sx = null;
      card.addEventListener("pointerdown", (e) => { sx = e.clientX; });
      card.addEventListener("pointerup", (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) { e.preventDefault(); e.stopPropagation(); move(dx < 0 ? 1 : -1); } }, true);
    },
    onAct(a) { if (a === "prev") move(-1); if (a === "next") move(1); },
  });
  function move(d) { i = Math.max(0, i + d); shell.redraw(); const b = document.querySelector(".dk-card"); b && b.focus(); }
  document.addEventListener("keydown", (e) => { if (document.querySelector("#pop:not([hidden])")) return; if (e.key === "ArrowRight") move(1); if (e.key === "ArrowLeft") move(-1); });
})();
