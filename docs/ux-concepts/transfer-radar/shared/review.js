/* Review toolbar for design review. Not part of the product. Hidden with ?embed=1.
   Every switch is a URL parameter so a state can be shared as a link. */
(function () {
  const u = new URL(location.href);
  const p = u.searchParams;
  const root = document.documentElement;
  const theme = p.get("theme");
  const sys = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => root.setAttribute("data-theme", theme || (sys.matches ? "dark" : "light"));
  apply();
  if (!theme) sys.addEventListener("change", apply);
  if (p.get("still") === "1") root.setAttribute("data-still", "");
  const embed = p.get("embed") === "1";
  const vw = p.get("vw");
  window.RT_FRAMED = !embed && !!vw;

  const here = location.pathname.match(/\/(concept-0\d|admin)\//);
  const current = here ? here[1] : "";

  function link(key, value, label) {
    const n = new URL(location.href);
    if (value === null) n.searchParams.delete(key); else n.searchParams.set(key, value);
    if (key !== "vw") n.searchParams.delete("embed");
    const on = (p.get(key) || null) === value;
    return `<a href="${n.pathname + n.search}" aria-current="${on}">${label}</a>`;
  }
  function conceptLink(id, label) {
    const n = new URL(location.href);
    if (id.includes("/")) {
      // a relative page path: keeps review switches, drops the selected case
      const t = new URL(id, location.href);
      n.searchParams.delete("case");
      const on = t.pathname === location.pathname;
      return `<a href="${t.pathname + n.search}" aria-current="${on}">${label}</a>`;
    }
    n.pathname = n.pathname.replace(/\/(concept-0\d|admin)\//, `/${id}/`);
    if (id === "admin") ["case", "w", "club", "dir", "stage", "conf", "rev", "q"].forEach((k) => n.searchParams.delete(k));
    return `<a href="${n.pathname + n.search}" aria-current="${id === current}">${label}</a>`;
  }

  const STATES = [
    [null, "정상"], ["loading", "첫 로딩"], ["filter-empty", "필터 결과 없음"], ["no-window", "시장 없음"],
    ["error", "서버 오류"], ["timeout", "타임아웃"], ["network", "통신 실패"], ["ratelimit", "요청 제한"],
    ["stale", "재조회 실패(이전 결과 보존)"], ["page-fail", "다음 페이지 실패"], ["race", "늦게 도착한 응답"],
    ["delayed", "갱신 지연"], ["unavailable", "수집 중단"], ["unknown", "갱신 상태 불명"], ["detail-error", "상세 조회 실패"],
  ];

  function toolbar() {
    const el = document.createElement("details");
    el.className = "rt";
    el.open = p.get("rt") !== "0";
    el.innerHTML = `
      <summary>검토 도구 <span class="rt__log" id="rt-log"></span></summary>
      <div class="rt__body">
        <div class="rt__row"><b>시안</b>${Object.entries(window.RT_LABELS || { "concept-01": "01 구단 장부", "concept-02": "02 변화 기록", "concept-03": "03 근거 비교표", admin: "관리자 공통안" }).map(([id, l]) => conceptLink(id, l)).join("")}</div>
        <div class="rt__row"><b>폭</b>${link("vw", null, "창 크기")}${link("vw", "1440", "1440")}${link("vw", "768", "768")}${link("vw", "390", "390")}${link("vw", "320", "320")}</div>
        <div class="rt__row"><b>테마</b>${link("theme", null, "시스템")}${link("theme", "light", "라이트")}${link("theme", "dark", "다크")} ${link("still", null, "모션 기본")}${link("still", "1", "정지 화면")}</div>
        <div class="rt__row"><b>데이터</b>${link("data", null, "기본 14건")}${link("data", "stress", "대량 134건")}${link("data", "single", "1건")}${link("data", "none", "0건")}</div>
        <div class="rt__row"><b>상태</b>${STATES.map(([v, l]) => link("state", v, l)).join("")}</div>
        <div class="rt__row"><b>캡처</b>${link("embed", "1", "도구 숨기기 (?embed=1)")}</div>
      </div>`;
    document.body.appendChild(el);
    let n = 0;
    window.addEventListener("radar:discarded", (e) => { n = e.detail; document.getElementById("rt-log").textContent = n ? `늦게 도착해 버린 응답 ${n}건` : ""; });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (embed) return;
    if (window.RT_FRAMED) {
      const inner = new URL(location.href);
      inner.searchParams.delete("vw");
      inner.searchParams.set("embed", "1");
      document.body.className = "rt-framed";
      document.body.innerHTML = `<iframe class="rt-frame" title="${vw}px 미리보기" style="width:${Number(vw)}px" src="${inner.pathname + inner.search}"></iframe>`;
    }
    toolbar();
  });
})();
