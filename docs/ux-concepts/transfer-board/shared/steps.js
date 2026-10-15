/* Helpers shared by the step-based concepts (tracking, kanban, gauge, deck). */
(function () {
  const R = window.Radar, esc = R.esc;
  const STEPS = ["interest", "contact", "negotiation", "near_agreement", "confirmed"];
  const SHORT = { unknown: "미확인", interest: "관심", contact: "접촉", negotiation: "협상", near_agreement: "임박", confirmed: "확정", failed: "결렬" };
  const idx = (s) => STEPS.indexOf(s); // -1 for unknown / failed
  const dirOf = (c, clubId) => R.direction(c, clubId);
  function who(c, st, clubId) {
    const d = dirOf(c, clubId), other = d === "incoming" ? c.from_club : c.to_club;
    const club = other ? RadarBoard.shortClub(st, other) : d === "incoming" ? "출발 미상" : "행선지 미상";
    return { dir: d, club, arrow: d === "incoming" ? "ph-arrow-down-left" : "ph-arrow-up-right" };
  }
  function avatar(c, size = 34) {
    const ch = c.player.id ? esc(c.player.name.replace(/\s+/g, "").slice(0, 1)) : "?";
    return `<span class="av av--${c.stage}${!c.player.id ? " av--unknown" : ""}" style="--s:${size}px" aria-hidden="true">${c.stage === "confirmed" ? '<i class="ph ph-check"></i>' : ch}${c.review_status === "pending" ? '<b class="av__pending"></b>' : ""}</span>`;
  }
  const confDots = (c) => `<span class="cdots" title="근거 신뢰도 ${R.CONFIDENCE[c.confidence].label}">${[1, 2, 3].map((i) => `<i class="${i <= { low: 1, medium: 2, high: 3 }[c.confidence] ? "on" : ""}"></i>`).join("")}</span>`;
  window.RadarSteps = { STEPS, SHORT, idx, who, avatar, confDots };
})();
