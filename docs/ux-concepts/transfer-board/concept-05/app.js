/* 05 버블 군집형: two clusters of bubbles, incoming and outgoing. Bubble size = how many independent source lines exist;
   colour and edge = claimed stage (dashed = claim, solid green = official). No links between bubbles. */
MapShell({
  dom: true, allowEmpty: true, legendLabel: "읽는 법", legendIcon: "circles-three",
  legend: () => `<p class="lg__h">크기 = 독립 출처 수, 색 = 단계</p><p class="lg__note">점선 테두리 거품은 출처의 주장이고, 초록으로 꽉 찬 거품은 공식 발표를 확인한 경우뿐입니다. 크기는 서로 다른 정보 계통의 수라서 재게시가 많아도 커지지 않습니다. 이적 가능성과는 무관합니다. 주황 점은 검토 대기입니다.</p>`,
  draw(ctx) {
    const { R, st, cases, club, board, w, h, portrait } = ctx;
    const S = RadarSteps, esc = R.esc;
    const scale = Math.min(w, h) / (portrait ? 720 : 520);
    const rad = (c) => Math.max(22, (24 + 13 * Math.sqrt(c.independent_source_count)) * Math.min(Math.max(scale, w < 360 ? 0.6 : 0.7), 1.7));
    function pack(list, cx, cy) {
      const placed = [];
      [...list].sort((a, b) => rad(b) - rad(a)).forEach((c) => {
        const r = rad(c);
        for (let t = 0; t < 3000; t++) {
          const ang = t * 0.5, dist = t * 0.9;
          const x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist * (portrait ? 0.8 : 1);
          if (x - r < 4 || x + r > w - 4) continue;
          if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + 5)) { placed.push({ c, x, y, r }); break; }
        }
      });
      return placed;
    }
    const centers = portrait ? [[w / 2, h * 0.3], [w / 2, h * 0.74]] : [[w * 0.3, h / 2], [w * 0.7, h / 2]];
    const out = [];
    ["incoming", "outgoing"].forEach((dir, i) => {
      const list = cases.filter((c) => R.direction(c, club.id) === dir);
      const [cx, cy] = centers[i];
      out.push(`<span class="bb-word" style="left:${cx}px;top:${portrait ? cy - h * 0.2 : 28}px">${dir === "incoming" ? "영입" : "방출"} ${list.length}${list.length > (portrait ? 14 : 28) ? ` · 최근 ${portrait ? 14 : 28}건` : ""}</span>`);
      pack(list.slice(0, portrait ? 14 : 28), cx, cy).forEach(({ c, x, y, r }) => {
        const big = r > 34;
        out.push(`<button type="button" class="bb bb--${c.stage}${c.review_status === "refuted" ? " bb--refuted" : ""}${!c.player.id ? " bb--unknown" : ""}" data-case="${c.id}" aria-label="${esc(RadarMap.describe(c))}" style="left:${(x - r).toFixed(1)}px;top:${(y - r).toFixed(1)}px;width:${(2 * r).toFixed(1)}px">
          ${c.stage === "confirmed" ? '<i class="ph ph-seal-check bb__seal" aria-hidden="true"></i>' : ""}
          <span class="bb__nm">${esc(big ? RadarMap.shortName(c.player.name, 5) : c.player.id ? c.player.name.slice(0, 1) : "?")}</span>
          ${big ? `<span class="bb__cl">${esc(S.who(c, st, club.id).club)}</span>` : ""}
          ${c.review_status === "pending" ? '<b class="bb__pending" aria-hidden="true"></b>' : ""}
          ${c.stage === "failed" ? '<i class="ph ph-x bb__x" aria-hidden="true"></i>' : ""}
        </button>`);
      });
    });
    board.innerHTML = `<div class="bb-stage">${out.join("")}<p class="bb-club">${esc(club.short_name)}</p></div>`;
  },
});
