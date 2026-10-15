/* Shared vocabulary for the non-graph concepts (tactics board, sticker album, departures board).
   A claim "fills up" as it advances: interest is a sliver, near agreement is almost whole,
   only an officially confirmed case is complete (and green). Failed breaks. Width = evidence confidence. */
(function () {
  const R = window.Radar, esc = R.esc;
  const FILL = { unknown: 0.08, interest: 0.25, contact: 0.45, negotiation: 0.65, near_agreement: 0.85, confirmed: 1, failed: 0.65 };
  const COLOR = {
    unknown: "var(--st-unknown)", interest: "var(--st-interest)", contact: "var(--st-contact)", negotiation: "var(--st-negotiation)",
    near_agreement: "var(--st-near)", confirmed: "var(--st-confirmed-bg)", failed: "var(--st-failed)",
  };
  const RING_W = { low: 2.5, medium: 4, high: 5.5 };
  const POS_ORDER = ["FW", "MF", "DF", "GK", null];
  const POS_SHORT = { GK: "GK", DF: "DF", MF: "MF", FW: "FW" };

  // Progress ring token as inline SVG. size in px.
  function ring(c, size = 52, opt = {}) {
    const r = size / 2 - 4, C = 2 * Math.PI * r, f = FILL[c.stage] || 0.08, w = RING_W[c.confidence];
    const mid = size / 2;
    const initial = esc(opt.glyph != null ? opt.glyph : (c.player.id ? c.player.name.replace(/\s+/g, "").slice(0, 1) : "?"));
    const failed = c.stage === "failed", done = c.stage === "confirmed";
    return `<svg class="ring ring--${c.stage}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${mid}" cy="${mid}" r="${r}" class="ring__track" stroke-width="${w}"/>
      <circle cx="${mid}" cy="${mid}" r="${r}" class="ring__arc" stroke="${COLOR[c.stage]}" stroke-width="${w}"
        stroke-dasharray="${failed ? `${(C * f) / 7} ${(C * f) / 14}` : `${C * f} ${C}`}" transform="rotate(-90 ${mid} ${mid})"/>
      <circle cx="${mid}" cy="${mid}" r="${r - w / 2 - 3}" class="ring__face${done ? " ring__face--done" : ""}${failed ? " ring__face--failed" : ""}${!c.player.id ? " ring__face--unknown" : ""}"/>
      <text x="${mid}" y="${mid}" class="ring__glyph" text-anchor="middle" dominant-baseline="central">${done || failed ? "" : initial}</text>
      ${done ? `<path class="ring__check" d="M${mid - 6},${mid} l4.5,4.5 l8,-9"/>` : ""}
      ${failed ? `<path class="ring__x" d="M${mid - 5},${mid - 5} l10,10 M${mid + 5},${mid - 5} l-10,10"/>` : ""}
      ${c.review_status === "pending" ? `<circle class="ring__pending" cx="${mid + r * 0.72}" cy="${mid - r * 0.72}" r="4.5"/>` : ""}
      ${c.review_status === "refuted" ? `<path class="ring__refuted" d="M${mid - r},${mid + r} L${mid + r},${mid - r}"/>` : ""}
    </svg>`;
  }
  function shortClub(st, ref) {
    if (!ref) return "?";
    const c = st.clubs.find((x) => x.id === ref.id);
    return c ? c.short_name : ref.name;
  }
  function byPosition(list) {
    const m = new Map(POS_ORDER.map((p) => [p, []]));
    list.forEach((c) => { const p = POS_ORDER.includes(c.player.position) ? c.player.position : null; m.get(p).push(c); });
    return m;
  }
  function tokenLegend(title) {
    const s = (stage, conf = "medium", extra = {}) => ring(Object.assign({ stage, confidence: conf, review_status: "unverified", player: { id: "x", name: "가" } }, extra), 40);
    const row = (svg, label) => `<li>${svg}<span>${label}</span></li>`;
    return `
      <p class="lg__h">${title}</p>
      <ul class="lg__tokens">
        ${row(s("interest"), "관심설")}${row(s("contact"), "접촉설")}${row(s("negotiation"), "협상설")}
        ${row(s("near_agreement"), "합의 임박설")}${row(s("confirmed"), "공식 확정")}${row(s("failed"), "결렬설")}
      </ul>
      <ul class="lg__tokens">
        ${row(s("negotiation", "low"), "신뢰도 낮음")}${row(s("negotiation", "high"), "신뢰도 높음")}
        ${row(s("negotiation", "medium", { review_status: "pending" }), "검토 대기")}${row(s("negotiation", "medium", { player: { id: null, name: "?" } }), "선수 미확정")}
      </ul>
      <p class="lg__note">고리가 덜 찬 것은 모두 출처의 주장입니다. 꽉 찬 초록 고리는 공식 발표를 확인한 경우에만 씁니다. 고리 굵기는 근거 신뢰도이며 이적 확률이 아닙니다.</p>`;
  }
  window.RadarBoard = { FILL, COLOR, RING_W, POS_ORDER, POS_SHORT, ring, shortClub, byPosition, tokenLegend };
})();
