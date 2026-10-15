/* 06 모자이크형: the club's window as one mosaic. Incoming and outgoing halves are split into tiles,
   one per case; tile area grows with independent source lines, tint deepens as the claim advances,
   and only an official confirmation is solid green. */
MapShell({
  dom: true, allowEmpty: true, legendLabel: "읽는 법", legendIcon: "squares-four",
  legend: () => `<p class="lg__h">진할수록 진전된 주장</p><p class="lg__note">타일 색이 진할수록 출처들이 더 진전된 단계를 주장한 것입니다. 꽉 찬 초록 타일은 공식 발표를 확인한 경우뿐입니다. 타일 크기는 독립 출처 수, 빗금은 결렬설, 주황 모서리는 검토 대기입니다.</p>`,
  draw(ctx) {
    const { R, st, cases, club, board, w, h, portrait } = ctx;
    const S = RadarSteps, esc = R.esc;
    const ORDER = ["confirmed", "near_agreement", "negotiation", "contact", "interest", "unknown", "failed"];
    const weight = (c) => 1 + c.independent_source_count;
    // binary split treemap: splits the list where weights balance, alternating along the longer side
    function split(list, x, y, W, H, out) {
      if (!list.length) return;
      if (list.length === 1) { out.push({ c: list[0], x, y, W, H }); return; }
      const total = list.reduce((s, c) => s + weight(c), 0);
      let acc = 0, k = 0;
      while (k < list.length - 1 && acc + weight(list[k]) <= total / 2) acc += weight(list[k++]);
      if (k === 0) { acc = weight(list[0]); k = 1; }
      const f = acc / total;
      if (W >= H) { split(list.slice(0, k), x, y, W * f, H, out); split(list.slice(k), x + W * f, y, W * (1 - f), H, out); }
      else { split(list.slice(0, k), x, y, W, H * f, out); split(list.slice(k), x, y + H * f, W, H * (1 - f), out); }
    }
    const pad = 16, top = 46, bottom = 46;
    const AW = Math.min(w - pad * 2, 1180), AH = h - top - bottom, AX = (w - AW) / 2;
    const inc = cases.filter((c) => R.direction(c, club.id) === "incoming").sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage)).slice(0, 40);
    const out = cases.filter((c) => R.direction(c, club.id) === "outgoing").sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage)).slice(0, 40);
    const fi = Math.min(0.7, Math.max(0.3, inc.length / Math.max(inc.length + out.length, 1)));
    const halves = portrait
      ? [["incoming", inc, AX, top, AW, AH * fi - 18], ["outgoing", out, AX, top + AH * fi + 18, AW, AH * (1 - fi) - 18]]
      : [["incoming", inc, AX, top, AW * fi - 6, AH], ["outgoing", out, AX + AW * fi + 6, top, AW * (1 - fi) - 6, AH]];
    const html = [];
    halves.forEach(([dir, list, x, y, W, H]) => {
      html.push(`<span class="mz-word" style="left:${x}px;top:${y - 26}px">${dir === "incoming" ? "영입" : "방출"} ${list.length}</span>`);
      if (!list.length) { html.push(`<span class="mz-empty" style="left:${x}px;top:${y}px;width:${W}px;height:${H}px">소식 없음</span>`); return; }
      const tiles = []; split(list, x, y, W, H, tiles);
      tiles.forEach(({ c, x, y, W, H }) => {
        const roomy = W > 86 && H > 54;
        html.push(`<button type="button" class="mz mz--${c.stage}${c.review_status === "refuted" ? " mz--refuted" : ""}" data-case="${c.id}" aria-label="${esc(RadarMap.describe(c))}" style="left:${(x + 2).toFixed(1)}px;top:${(y + 2).toFixed(1)}px;width:${Math.max(W - 4, 4).toFixed(1)}px;height:${Math.max(H - 4, 4).toFixed(1)}px">
          ${W > 40 && H > 28 ? `<span class="mz__nm">${esc(roomy ? RadarMap.shortName(c.player.name, 8) : c.player.name.slice(0, 1))}${c.stage === "confirmed" ? ' <i class="ph ph-seal-check" aria-hidden="true"></i>' : ""}</span>` : ""}
          ${roomy ? `<span class="mz__cl"><i class="ph ${S.who(c, st, club.id).arrow}" aria-hidden="true"></i>${esc(S.who(c, st, club.id).club)}</span>` : ""}
          ${c.review_status === "pending" ? '<b class="mz__pending" aria-hidden="true"></b>' : ""}
        </button>`);
      });
    });
    board.innerHTML = `<div class="mz-stage"><p class="mz-title">${esc(club.name)}</p>${html.join("")}</div>`;
  },
});
