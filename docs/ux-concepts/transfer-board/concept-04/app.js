/* 04 계기판형: a dashboard of small dials. The needle points at the claimed stage on a half-circle scale;
   only an official confirmation lands in the green end zone. Failed needles drop below the scale. Needle width = confidence. */
MapShell({
  dom: true, allowEmpty: true, legendLabel: "읽는 법", legendIcon: "gauge",
  legend: () => `<p class="lg__h">바늘 = 주장된 단계</p><p class="lg__note">눈금은 왼쪽부터 관심·접촉·협상·임박, 오른쪽 끝 초록 구간이 공식 확정입니다. 바늘이 초록 구간에 닿는 것은 공식 발표를 확인한 경우뿐입니다. 결렬설은 바늘이 아래로 떨어지고, 바늘 굵기는 근거 신뢰도, 주황 점은 검토 대기입니다.</p>`,
  draw(ctx) {
    const { R, st, cases, club, board, portrait } = ctx;
    const S = RadarSteps, esc = R.esc;
    const dial = (c) => {
      const W = 120, H = 74, cx = 60, cy = 64, r = 48;
      const pos = { unknown: 0.04, interest: 0.12, contact: 0.32, negotiation: 0.52, near_agreement: 0.72, confirmed: 0.93 }[c.stage];
      const ang = c.stage === "failed" ? 200 : 180 + pos * 180; // degrees, 180 = left, 360 = right
      const a = (ang * Math.PI) / 180;
      const tip = { x: cx + Math.cos(a) * (r - 6), y: cy + Math.sin(a) * (r - 6) };
      const arc = (f0, f1) => { const p0 = (180 + f0 * 180) * Math.PI / 180, p1 = (180 + f1 * 180) * Math.PI / 180; return `M${cx + Math.cos(p0) * r},${cy + Math.sin(p0) * r} A${r},${r} 0 0 1 ${cx + Math.cos(p1) * r},${cy + Math.sin(p1) * r}`; };
      const bands = [["interest", 0, .22], ["contact", .22, .42], ["negotiation", .42, .62], ["near_agreement", .62, .84], ["confirmed", .86, 1]];
      const w = { low: 2, medium: 3.4, high: 5 }[c.confidence];
      return `<svg class="dial dial--${c.stage}" viewBox="0 0 ${W} ${H + 12}" width="${portrait ? 132 : 150}" aria-hidden="true">
        ${bands.map(([s, f0, f1]) => `<path d="${arc(f0, f1)}" class="dial__band dial__band--${s}${c.stage === s ? " on" : ""}"/>`).join("")}
        ${[0, .22, .42, .62, .84].map((f) => { const p = (180 + f * 180) * Math.PI / 180; return `<line x1="${cx + Math.cos(p) * (r - 9)}" y1="${cy + Math.sin(p) * (r - 9)}" x2="${cx + Math.cos(p) * (r - 4)}" y2="${cy + Math.sin(p) * (r - 4)}" class="dial__tick"/>`; }).join("")}
        <line x1="${cx}" y1="${cy}" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}" class="dial__needle" stroke-width="${w}"/>
        <circle cx="${cx}" cy="${cy}" r="5" class="dial__hub${c.review_status === "pending" ? " dial__hub--pending" : ""}"/>
        ${c.stage === "failed" ? `<text x="${tip.x - 4}" y="${tip.y + 14}" class="dial__x">×</text>` : ""}
      </svg>`;
    };
    const tile = (c) => {
      const w = S.who(c, st, club.id);
      return `<button type="button" class="gauge${c.review_status === "refuted" ? " gauge--refuted" : ""}" data-case="${c.id}" aria-label="${esc(RadarMap.describe(c))}">
        ${dial(c)}<span class="gauge__nm">${esc(RadarMap.shortName(c.player.name, 8))}${!c.player.id ? " ?" : ""}</span>
        <span class="gauge__meta"><i class="ph ${w.arrow}" aria-hidden="true"></i>${esc(w.club)}</span></button>`;
    };
    const sec = (dir) => {
      const list = cases.filter((c) => R.direction(c, club.id) === dir);
      return `<section class="gg-sec"><h2 class="sec-h">${dir === "incoming" ? "영입" : "방출"} <span class="n">${list.length}</span></h2><div class="gg-grid">${list.map(tile).join("") || '<p class="none">소식 없음</p>'}</div></section>`;
    };
    board.innerHTML = `<div class="board-wrap"><p class="board-title">${esc(club.name)}<span>${esc(ctx.store.window.label)} 이적시장</span></p>${sec("incoming")}${sec("outgoing")}</div>`;
  },
});
