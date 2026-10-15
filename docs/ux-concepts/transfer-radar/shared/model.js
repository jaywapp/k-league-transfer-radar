/* Shared vocabulary, formatting and a fake read API for the three concepts.
   The fake API mirrors the public contract: windows, clubs, cases (cursor), case detail. */
(function () {
  const D = window.RadarData;
  const NOW = Date.parse(D.now);
  const qs = new URLSearchParams(location.search);
  const scenario = qs.get("state") || "normal";
  const dataset = qs.get("data") || "default";

  // ---------- vocabulary ----------
  const STAGES = {
    unknown: { label: "단계 미확인", icon: "ph-question", hint: "어느 단계인지 주장에서 알 수 없습니다." },
    interest: { label: "관심설", icon: "ph-eye", hint: "구단이 관심을 보인다는 주장입니다." },
    contact: { label: "접촉설", icon: "ph-chats-circle", hint: "구단과 선수 측이 연락했다는 주장입니다." },
    negotiation: { label: "협상설", icon: "ph-arrows-left-right", hint: "조건을 협상 중이라는 주장입니다." },
    near_agreement: { label: "합의 임박설", icon: "ph-hourglass-medium", hint: "합의가 가깝다는 주장입니다. 확정이 아닙니다." },
    confirmed: { label: "공식 확정", icon: "ph-seal-check", hint: "구단 또는 리그의 공식 발표를 확인했습니다." },
    failed: { label: "결렬설", icon: "ph-x-circle", hint: "이적이 무산됐다는 주장입니다." },
  };
  const STAGE_ORDER = ["unknown", "interest", "contact", "negotiation", "near_agreement", "confirmed", "failed"];
  const CONFIDENCE = {
    low: { label: "낮음", n: 1 },
    medium: { label: "보통", n: 2 },
    high: { label: "높음", n: 3 },
  };
  const REVIEW = {
    unverified: { label: "미검증", icon: "ph-circle-dashed", hint: "아직 사람이 확인하지 않았습니다." },
    pending: { label: "검토 대기", icon: "ph-clock-countdown", hint: "모호하거나 상충하는 주장이 있어 확인을 기다립니다. 확인 전까지 기존 단계를 유지합니다." },
    reviewed: { label: "검토 완료", icon: "ph-check", hint: "운영자가 근거를 확인했습니다. 공식 확정을 뜻하지 않습니다." },
    refuted: { label: "반박됨", icon: "ph-prohibit", hint: "근거가 사실이 아닌 것으로 확인됐습니다." },
  };
  const KIND = { community: "커뮤니티", news: "언론", official: "공식", submission: "제보" };
  const RELATION = { original: "원문", repost: "재게시", unknown: "관계 미확정" };
  const POS = { GK: "골키퍼", DF: "수비수", MF: "미드필더", FW: "공격수" };

  // ---------- formatting ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmtParts = (iso) => {
    const p = {};
    new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso)).forEach((x) => (p[x.type] = x.value));
    return p;
  };
  const NOW_YEAR = fmtParts(D.now).year;
  function absTime(iso, opts = {}) {
    const p = fmtParts(iso);
    const date = `${p.year !== NOW_YEAR || opts.year ? p.year + "년 " : ""}${p.month}월 ${p.day}일`;
    return opts.dateOnly ? date : `${date} ${p.hour}:${p.minute}`;
  }
  function relTime(iso) {
    const m = Math.round((NOW - Date.parse(iso)) / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    if (d <= 6) return `${d}일 전`;
    return null;
  }
  function time(iso, opts = {}) {
    if (!iso) return '<span class="muted">시각 없음</span>';
    const rel = opts.archived ? null : relTime(iso);
    return `<time datetime="${esc(iso)}">${absTime(iso, opts)}</time>${rel && !opts.noRel ? ` <span class="rel">${rel}</span>` : ""}`;
  }
  function dayKey(iso) {
    const p = fmtParts(iso);
    return `${p.year}-${p.month.padStart(2, "0")}-${p.day.padStart(2, "0")}`;
  }
  function dayLabel(iso) {
    const today = dayKey(D.now);
    const k = dayKey(iso);
    const y = dayKey(new Date(NOW - 86400000).toISOString());
    const date = absTime(iso, { dateOnly: true });
    if (k === today) return `오늘 · ${date}`;
    if (k === y) return `어제 · ${date}`;
    return date;
  }

  // ---------- badge renderers (HTML strings) ----------
  function stage(s, o = {}) {
    const v = STAGES[s] || STAGES.unknown;
    const kind = s === "confirmed" ? "official" : "claim";
    return `<span class="stage stage--${s}${o.lg ? " stage--lg" : ""}" data-kind="${kind}" title="${esc(v.hint)}"><i class="ph ${v.icon}" aria-hidden="true"></i><span>${v.label}</span></span>`;
  }
  function conf(c, o = {}) {
    const v = CONFIDENCE[c];
    return `<span class="conf conf--${c}" title="근거 신뢰도: 출처의 독립성과 명확성 기준입니다. 이적이 성사될 확률이 아닙니다."><span class="conf__bars" aria-hidden="true"><i></i><i></i><i></i></span>${o.short ? "" : "신뢰도 "}${v.label}</span>`;
  }
  function review(r) {
    const v = REVIEW[r];
    return `<span class="review review--${r}" title="${esc(v.hint)}"><i class="ph ${v.icon}" aria-hidden="true"></i>${v.label}</span>`;
  }
  function sources(c) {
    const repost = c.source_count - c.independent_source_count;
    return `<span class="srcs" title="전체 출처 ${c.source_count}건 중 서로 다른 정보 계통 ${c.independent_source_count}개. 같은 내용을 다시 올린 글은 독립 근거로 세지 않습니다."><i class="ph ph-files" aria-hidden="true"></i>출처 ${c.source_count}${repost > 0 ? ` <span class="muted">(독립 ${c.independent_source_count})</span>` : ""}</span>`;
  }
  function playerName(c) {
    const unresolved = !c.player.id;
    return `${esc(c.player.name)}${unresolved ? ' <span class="flag">선수 미확정</span>' : ""}`;
  }
  function clubName(ref, missing) {
    return ref ? esc(ref.name) : `<span class="flag">${missing}</span>`;
  }
  function route(c) {
    return `<span class="route">${clubName(c.from_club, "출발 구단 미확인")}<i class="ph ph-arrow-right" aria-label="에서"></i>${clubName(c.to_club, "도착 구단 미확인")}</span>`;
  }
  function direction(c, clubId) {
    if (c.to_club && c.to_club.id === clubId) return "incoming";
    if (c.from_club && c.from_club.id === clubId) return "outgoing";
    return null;
  }
  function counterpart(c, clubId) {
    return direction(c, clubId) === "incoming" ? c.from_club : c.to_club;
  }
  // Pending claims that disagree with the reflected stage. Detail-only (needs evidence).
  function pendingClaims(c) {
    return (c.evidence || []).filter((e) => e.review_status === "pending" && e.claimed_stage !== c.stage);
  }
  function pendingSentence(c) {
    const p = pendingClaims(c);
    if (!p.length) return "";
    const names = [...new Set(p.map((e) => STAGES[e.claimed_stage].label.replace(/설$/, "")))].join(", ");
    const keep = c.stage === "confirmed" ? "공식 확정은 그대로 유지합니다" : `확인 전까지 ${STAGES[c.stage].label}을 유지합니다`;
    return `${names}됐다는 새 주장을 검토 중입니다. ${keep}.`;
  }

  function freshness(meta, win) {
    if (win && win.archived_at) return { tone: "archive", icon: "ph-archive", text: `${absTime(win.archived_at, { dateOnly: true, year: true })} 보관된 기록`, detail: "지난 시장은 읽기 전용입니다. 이후 새 소식은 반영하지 않습니다." };
    if (!meta) return { tone: "unknown", icon: "ph-question", text: "갱신 상태 확인 전", detail: "" };
    const at = meta.last_successful_sync_at;
    const when = at ? `${absTime(at)}${relTime(at) ? ` (${relTime(at)})` : ""}` : "기록 없음";
    switch (meta.pipeline_status) {
      case "ready": return { tone: "ok", icon: "ph-arrows-clockwise", text: `${when} 갱신`, detail: "서버가 수집·분석을 마지막으로 정상 완료한 시각입니다." };
      case "delayed": return { tone: "warn", icon: "ph-warning", text: `갱신 지연 · 마지막 정상 갱신 ${when}`, detail: "새 루머가 반영되지 않았을 수 있습니다." };
      case "unavailable": return { tone: "bad", icon: "ph-plugs", text: `수집 중단 · 마지막 정상 갱신 ${when}`, detail: "서버의 수집·분석이 멈췄습니다. 보이는 정보는 마지막 정상 갱신 기준입니다." };
      default: return { tone: "unknown", icon: "ph-question", text: "갱신 상태를 확인할 수 없음", detail: `마지막 정상 갱신 ${when}` };
    }
  }

  const ERRORS = {
    503: { title: "이적 정보를 불러오지 못했습니다", body: "서버 점검 또는 장애일 수 있습니다. 잠시 뒤 다시 시도해 주세요.", icon: "ph-cloud-x" },
    429: { title: "조회 요청이 많아 잠시 제한됐습니다", body: "30초 뒤 다시 시도할 수 있습니다.", icon: "ph-hand-palm" },
    timeout: { title: "응답이 늦어 조회를 멈췄습니다", body: "연결 상태를 확인하고 다시 시도해 주세요.", icon: "ph-timer" },
    network: { title: "네트워크에 연결할 수 없습니다", body: "인터넷 연결을 확인한 뒤 다시 시도해 주세요.", icon: "ph-wifi-slash" },
    404: { title: "이적 건을 찾을 수 없습니다", body: "주소가 잘못됐거나 공개 목록에서 내려간 건입니다.", icon: "ph-magnifying-glass" },
  };
  const errorOf = (e) => ERRORS[e && e.code] || ERRORS[503];

  // ---------- fake API ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const metaFor = () => {
    const m = { dataset_kind: "synthetic", generated_at: D.now, data_updated_at: "2026-10-15T06:30:00Z", last_successful_sync_at: "2026-10-15T07:50:00Z", pipeline_status: "ready" };
    if (scenario === "delayed") { m.pipeline_status = "delayed"; m.last_successful_sync_at = "2026-10-14T23:10:00Z"; }
    if (scenario === "unavailable") { m.pipeline_status = "unavailable"; m.last_successful_sync_at = "2026-10-13T21:00:00Z"; }
    if (scenario === "unknown") { m.pipeline_status = "unknown"; }
    return m;
  };
  function pool(windowId) {
    if (dataset === "none") return [];
    let list = D.cases.filter((c) => c.window_id === windowId);
    if (dataset === "single") list = list.filter((c) => c.id === "case-moon" || c.id === "arc-nam");
    if (dataset === "stress" && windowId === "2027-winter") list = list.concat(D.stress);
    return list;
  }
  function matches(c, p) {
    if (p.club_id) {
      const d = direction(c, p.club_id);
      if (!d) return false;
      if (p.direction && d !== p.direction) return false;
    }
    if (p.stage && c.stage !== p.stage) return false;
    if (p.confidence && c.confidence !== p.confidence) return false;
    if (p.review_status && c.review_status !== p.review_status) return false;
    if (p.q) {
      const q = p.q.toLowerCase();
      const hay = [c.player.name, c.from_club && c.from_club.name, c.to_club && c.to_club.name].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }
  const sortCases = (a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : a.id < b.id ? -1 : 1);
  const summary = (c) => { const { evidence, history, ...rest } = c; return rest; };
  let calls = 0;
  let firstListDone = false;

  async function fail(code) {
    await wait(code === "timeout" ? 1400 : 380);
    const e = new Error(String(code));
    e.code = code;
    if (code === 429) e.retryAfter = 30;
    throw e;
  }
  const api = {
    async windows() {
      await wait(120);
      return { data: scenario === "no-window" ? [] : D.windows, meta: metaFor() };
    },
    async clubs(windowId) {
      await wait(120);
      const w = D.windows.find((x) => x.id === windowId);
      return { data: w ? D.clubs[w.season] : [], meta: metaFor() };
    },
    async cases(p) {
      calls += 1;
      const n = calls;
      if (scenario === "loading") return new Promise(() => {});
      if (scenario === "error") return fail(503);
      if (scenario === "ratelimit") return fail(429);
      if (scenario === "timeout") return fail("timeout");
      if (scenario === "network") return fail("network");
      if (scenario === "stale" && firstListDone) return fail(503);
      if (scenario === "page-fail" && p.cursor) return fail("network");
      await wait(scenario === "race" && n % 2 === 1 && n > 1 ? 1800 : 320);
      const all = pool(p.window_id).filter((c) => matches(c, p)).sort(sortCases);
      const limit = p.limit || 30;
      const offset = p.cursor ? Number(p.cursor.split(":")[1]) : 0;
      const page = all.slice(offset, offset + limit);
      firstListDone = true;
      return { data: page.map(summary), next_cursor: offset + limit < all.length ? `c:${offset + limit}` : null, meta: metaFor() };
    },
    async detail(id) {
      await wait(scenario === "loading-detail" ? 60000 : 220);
      if (scenario === "detail-error") return fail(503);
      const c = D.cases.concat(D.stress).find((x) => x.id === id);
      if (!c) return fail(404);
      return { data: c, meta: metaFor() };
    },
    // Additional requirement: per-direction / per-club counts are not in contract 1.0.
    counts(windowId, clubId) {
      const list = pool(windowId);
      const by = (d) => list.filter((c) => direction(c, clubId) === d).length;
      return { incoming: by("incoming"), outgoing: by("outgoing") };
    },
    clubTotals(windowId) {
      const list = pool(windowId);
      const t = {};
      list.forEach((c) => [c.from_club, c.to_club].forEach((r) => { if (r && r.id) t[r.id] = (t[r.id] || 0) + 1; }));
      return t;
    },
    // Additional requirement: a club change feed is not in contract 1.0 (concept 02 needs it).
    feed(windowId, clubId) {
      const out = [];
      pool(windowId).filter((c) => direction(c, clubId)).forEach((c) => {
        (c.history || []).forEach((h) => out.push({ type: "stage", at: h.changed_at, c, h }));
        const pend = (c.evidence || []).filter((e) => e.review_status === "pending" && e.claimed_stage !== c.stage);
        pend.forEach((e) => out.push({ type: "pending", at: e.analyzed_at, c, e }));
        if (!(c.history || []).length && !pend.length) out.push({ type: "new", at: c.updated_at, c });
      });
      return out.sort((a, b) => (a.at < b.at ? 1 : -1));
    },
  };

  // ---------- list store: selection, cursor, stale-response guard, URL sync ----------
  function createStore(opts = {}) {
    const url = new URLSearchParams(location.search);
    const st = {
      windows: [], windowId: url.get("w") || null, clubs: [], clubId: url.get("club") || "ulsan",
      dir: url.get("dir") || "incoming", stage: url.get("stage") || "", confidence: url.get("conf") || "", review: url.get("rev") || "",
      q: url.get("q") || (scenario === "filter-empty" ? "없는선수" : ""),
      items: [], cursor: null, status: "idle", error: null, page: "idle", pageError: null, meta: null,
      last: null, discarded: 0, booted: false,
    };
    const subs = new Set();
    const emit = () => subs.forEach((f) => f(st));
    let seq = 0;
    const key = () => [st.windowId, st.clubId, st.dir, st.stage, st.confidence, st.review, st.q].join("|");

    function syncUrl() {
      const u = new URL(location.href);
      const set = (k, v, def) => (v && v !== def ? u.searchParams.set(k, v) : u.searchParams.delete(k));
      set("w", st.windowId, null); set("club", st.clubId, null); set("dir", st.dir, "incoming");
      set("stage", st.stage); set("conf", st.confidence); set("rev", st.review); set("q", st.q);
      history.replaceState(history.state, "", u);
    }
    async function load(more) {
      const my = ++seq;
      const k = key();
      if (more) { st.page = "loading"; st.pageError = null; }
      else { st.status = st.items.length && st.lastKey === k ? "refreshing" : "loading"; st.error = null; st.cursor = null; if (st.lastKey !== k) st.items = []; }
      emit();
      const p = { window_id: st.windowId, club_id: opts.allClubs ? undefined : st.clubId, direction: opts.allClubs || st.dir === "all" ? undefined : st.dir, stage: st.stage || undefined, confidence: st.confidence || undefined, review_status: st.review || undefined, q: st.q || undefined, cursor: more ? st.cursor : undefined, limit: opts.pageSize || 30 };
      try {
        const r = await api.cases(p);
        if (my !== seq) { st.discarded += 1; window.dispatchEvent(new CustomEvent("radar:discarded", { detail: st.discarded })); return; } // a newer selection owns the screen
        st.items = more ? st.items.concat(r.data) : r.data;
        st.cursor = r.next_cursor; st.meta = r.meta; st.status = "ready"; st.page = "idle"; st.lastKey = k;
        st.last = { at: D.now, key: k, count: st.items.length };
      } catch (e) {
        if (my !== seq) { st.discarded += 1; window.dispatchEvent(new CustomEvent("radar:discarded", { detail: st.discarded })); return; }
        if (more) { st.page = "error"; st.pageError = e; }
        else { st.status = "error"; st.error = e; if (st.last && st.last.key !== k) st.items = []; }
      }
      emit();
    }
    const reselect = (patch) => { Object.assign(st, patch); syncUrl(); load(false); };
    const store = {
      state: st,
      subscribe(f) { subs.add(f); return () => subs.delete(f); },
      get window() { return st.windows.find((w) => w.id === st.windowId) || null; },
      get club() { return st.clubs.find((c) => c.id === st.clubId) || null; },
      get archived() { const w = this.window; return !!(w && w.archived_at); },
      get hasFilters() { return !!(st.stage || st.confidence || st.review || st.q); },
      get counts() { return st.windowId ? api.counts(st.windowId, st.clubId) : { incoming: 0, outgoing: 0 }; },
      get clubTotals() { return st.windowId ? api.clubTotals(st.windowId) : {}; },
      async init() {
        st.status = "loading"; emit();
        const w = await api.windows();
        st.windows = w.data; st.meta = w.meta;
        if (!st.windows.length) { st.status = "no-window"; st.booted = true; emit(); return; }
        if (!st.windows.find((x) => x.id === st.windowId)) st.windowId = (st.windows.find((x) => !x.archived_at) || st.windows[0]).id;
        await this.loadClubs();
        st.booted = true;
        syncUrl();
        await load(false);
        if (scenario === "stale") setTimeout(() => load(false), 900);
      },
      async loadClubs() {
        const c = await api.clubs(st.windowId);
        st.clubs = c.data;
        if (!st.clubs.find((x) => x.id === st.clubId)) st.clubId = st.clubs[0] && st.clubs[0].id;
      },
      async setWindow(id) { st.windowId = id; await this.loadClubs(); st.stage = st.confidence = st.review = ""; reselect({}); },
      setClub(id) { reselect({ clubId: id }); },
      setDir(d) { reselect({ dir: d }); },
      setFilter(kind, v) { reselect({ [kind]: st[kind] === v ? "" : v }); },
      setQuery(q) { reselect({ q: q.trim() }); },
      clearFilters() { reselect({ stage: "", confidence: "", review: "", q: "" }); },
      more() { if (st.cursor && st.page !== "loading") load(true); },
      retry() { load(false); },
      detail: (id) => api.detail(id),
      feed() { return api.feed(st.windowId, st.clubId).filter((x) => { const c = x.c; const d = direction(c, st.clubId); return (st.dir === "all" || d === st.dir) && matches(c, { stage: st.stage, confidence: st.confidence, review_status: st.review, q: st.q }); }); },
    };
    return store;
  }

  // ---------- detail URL helper shared by concepts ----------
  function caseParam() { return new URLSearchParams(location.search).get("case"); }
  function openCaseUrl(id) {
    const u = new URL(location.href);
    if (id) u.searchParams.set("case", id); else u.searchParams.delete("case");
    return u;
  }

  window.Radar = {
    STAGES, STAGE_ORDER, CONFIDENCE, REVIEW, KIND, RELATION, POS,
    esc, absTime, relTime, time, dayKey, dayLabel,
    stage, conf, review, sources, playerName, clubName, route, direction, counterpart, pendingClaims, pendingSentence, freshness,
    errorOf, createStore, caseParam, openCaseUrl, scenario, dataset, now: D.now,
  };
})();
