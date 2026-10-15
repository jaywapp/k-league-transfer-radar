/* 01 출발·도착 전광판: the club as an airport. Incoming rumors are arrivals, outgoing ones departures.
   The status flap carries the claimed stage (always worded as a claim until official), lamps carry confidence and review. */
(function () {
  const WORD = { unknown: "미확인", interest: "관심설", contact: "접촉설", negotiation: "협상설", near_agreement: "임박설", confirmed: "확정", failed: "결렬설" };
  const shell = MapShell({
    dom: true,
    legendLabel: "전광판 읽는 법", legendIcon: "airplane-landing",
    legend: () => legend(),
    allowEmpty: true,
    draw(ctx) {
      const { R, st, cases, club, board, portrait } = ctx;
      const B = RadarBoard, esc = R.esc;
      let n = 0;
      const flaps = (text, cls = "") => [...text].map((ch) => `<span class="fl${cls}" style="--i:${n++ % 40}">${ch === " " ? "&nbsp;" : esc(ch)}</span>`).join("");
      const lamps = (c) => {
        const k = { low: 1, medium: 2, high: 3 }[c.confidence];
        return `<span class="lamps" title="근거 신뢰도 ${R.CONFIDENCE[c.confidence].label}">${[1, 2, 3].map((i) => `<i class="${i <= k ? "on" : ""}"></i>`).join("")}</span>`;
      };
      const review = (c) => `<span class="rv rv--${c.review_status}" title="${R.REVIEW[c.review_status].label}"><i></i><b>${{ unverified: "", pending: "검토", reviewed: "", refuted: "반박" }[c.review_status]}</b></span>`;
      const row = (c, dir) => {
        const other = dir === "incoming" ? c.from_club : c.to_club;
        const hhmm = R.absTime(c.updated_at).split(" ").pop();
        return `
          <button type="button" class="fr-row st--${c.stage}${c.review_status === "refuted" ? " is-refuted" : ""}" data-case="${c.id}" aria-label="${esc(RadarMap.describe(c))}">
            <span class="c-time">${flaps(hhmm, " fl--num")}</span>
            <span class="c-name">${flaps(RadarMap.shortName(c.player.name, portrait ? 6 : 9))}${!c.player.id ? '<em class="tag">미확정</em>' : ""}</span>
            <span class="c-club">${flaps(other ? B.shortClub(st, other) : "미상")}</span>
            <span class="c-stage">${flaps(WORD[c.stage], " fl--stage")}${c.stage === "confirmed" ? '<i class="ph ph-seal-check seal" aria-hidden="true"></i>' : ""}</span>
            <span class="c-lamps">${lamps(c)}${review(c)}</span>
          </button>`;
      };
      const panel = (dir) => {
        const list = cases.filter((c) => R.direction(c, club.id) === dir);
        return `
          <section class="fids__panel" aria-label="${dir === "incoming" ? "도착 (영입)" : "출발 (방출)"}">
            <header class="fids__head"><i class="ph ph-airplane-${dir === "incoming" ? "landing" : "takeoff"}" aria-hidden="true"></i><span class="fids__title">${dir === "incoming" ? "도착" : "출발"}</span><span class="fids__en">${dir === "incoming" ? "ARRIVALS · 영입" : "DEPARTURES · 방출"}</span></header>
            <div class="fr-cols" aria-hidden="true"><span class="c-time">갱신</span><span class="c-name">선수</span><span class="c-club">${dir === "incoming" ? "출발지" : "목적지"}</span><span class="c-stage">상태</span><span class="c-lamps">신뢰 · 검토</span></div>
            <div class="fr-list">${list.length ? list.map((c) => row(c, dir)).join("") : `<p class="fr-empty">${flaps("예정 없음")}</p>`}</div>
          </section>`;
      };
      board.innerHTML = `
        <div class="fids${portrait ? " fids--narrow" : ""}">
          <p class="fids__club">${esc(club.name)}<span>${esc(ctx.store.window.label)} 이적시장</span></p>
          <div class="fids__grid">${panel("incoming")}${panel("outgoing")}</div>
        </div>`;
    },
  });
  function legend() {
    const st = (s) => `<span class="lg-flap st--${s}">${[...WORD[s]].map((ch) => `<span class="fl fl--stage">${ch}</span>`).join("")}</span>`;
    return `<p class="lg__h">상태 칸은 단계, 램프는 신뢰도와 검토</p>
      <ul class="lg__flaps">${["interest", "contact", "negotiation", "near_agreement", "confirmed", "failed", "unknown"].map((s) => `<li>${st(s)}<span>${R_label(s)}</span></li>`).join("")}</ul>
      <ul class="lg__flaps">
        <li><span class="lamps"><i class="on"></i><i></i><i></i></span><span>신뢰도 낮음</span></li>
        <li><span class="lamps"><i class="on"></i><i class="on"></i><i class="on"></i></span><span>신뢰도 높음</span></li>
        <li><span class="rv rv--pending"><i></i><b>검토</b></span><span>검토 대기 (깜빡임)</span></li>
        <li><span class="rv rv--refuted"><i></i><b>반박</b></span><span>반박됨</span></li>
      </ul>
      <p class="lg__note">"~설"은 모두 출처의 주장입니다. 초록 "확정"은 공식 발표를 확인한 경우에만 뜹니다. 신뢰도는 이적 확률이 아닙니다.</p>`;
  }
  function R_label(s) { return window.Radar.STAGES[s].label; }
})();
