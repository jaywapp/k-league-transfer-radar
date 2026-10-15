/* Synthetic design-review data. Players, claims, sources and dates are fictional; club names are real K League clubs used as examples.
   Shape follows packages/radar-client/src/contracts.ts (schema 1.0). */
(function () {
  const NOW = "2026-10-15T08:00:00Z";

  // Real K League clubs as examples. League placement is illustrative and not tied to an actual season's promotion/relegation.
  const CLUBS = [
    ["ulsan", "울산 HD FC", "울산", "K1", "K1"],
    ["fc-seoul", "FC서울", "서울", "K1", "K1"],
    ["pohang", "포항 스틸러스", "포항", "K1", "K1"],
    ["jeonbuk", "전북 현대 모터스", "전북", "K1", "K1"],
    ["daejeon", "대전하나시티즌", "대전", "K1", "K1"],
    ["gangwon", "강원FC", "강원", "K1", "K1"],
    ["busan", "부산 아이파크", "부산", "K2", "K2"],
    ["jeonnam", "전남 드래곤즈", "전남", "K2", "K2"],
    ["seoul-eland", "서울 이랜드 FC", "이랜드", "K2", "K2"],
    ["gimpo", "김포FC", "김포", "K2", "K2"],
    ["seongnam", "성남FC", "성남", "K2", "K2"],
    ["gyeongnam", "경남FC", "경남", "K2", "K2"],
  ];
  const clubsFor = (season) =>
    CLUBS.map(([id, name, short, l27, l26]) => ({ id, name, short_name: short, season, league: season === 2027 ? l27 : l26 }));
  const clubRef = (id) => {
    if (!id) return null;
    const c = CLUBS.find((x) => x[0] === id);
    return { id, name: c ? c[1] : id };
  };

  const PUBLISHERS = {
    community: "커뮤니티 게시판 (합성)",
    news: "스포츠 매체 (합성)",
    official: "구단 공식 발표 (합성)",
  };
  let srcSeq = 0;
  function ev(o) {
    srcSeq += 1;
    const kind = o.kind || "community";
    const sid = o.sourceId || `src-${srcSeq}`;
    return {
      id: `ev-${srcSeq}`,
      source: {
        id: sid,
        url: kind === "official" ? `https://official.example.invalid/notice/${srcSeq}` : `https://example.invalid/post/${srcSeq}`,
        title: o.title || (kind === "official" ? "구단 공식 발표 (합성)" : "이적 관련 게시글 (합성)"),
        publisher: o.publisher || PUBLISHERS[kind],
        kind,
        posted_at: o.at,
        availability: o.availability || "available",
      },
      claim: o.claim,
      claimed_stage: o.stage,
      confidence: o.confidence || "low",
      review_status: o.review || "unverified",
      source_relation: o.relation || "original",
      independence_group_id: o.group || `grp-${srcSeq}`,
      excerpt: null,
      analyzed_at: o.at,
    };
  }
  function hist(before, after, reason, evidence, at) {
    return { id: `h-${evidence.id}-${after}`, stage_before: before, stage_after: after, reason, evidence_id: evidence.id, changed_at: at };
  }
  function mk(o) {
    const sources = new Set(o.evidence.map((e) => e.source.id));
    const groups = new Set(o.evidence.map((e) => e.independence_group_id));
    const official = o.evidence.find((e) => e.source.kind === "official");
    return {
      id: o.id,
      window_id: o.window || "2027-winter",
      player: { id: o.playerId === undefined ? `p-${o.id}` : o.playerId, name: o.name, position: o.pos === undefined ? "MF" : o.pos },
      from_club: clubRef(o.from),
      to_club: clubRef(o.to),
      stage: o.stage,
      confidence: o.confidence,
      review_status: o.review,
      summary: o.summary,
      source_count: sources.size,
      independent_source_count: groups.size,
      official_confirmation:
        o.stage === "confirmed" && official
          ? { source_id: official.source.id, url: official.source.url, verified_at: o.verifiedAt || official.source.posted_at }
          : null,
      updated_at: o.updated,
      evidence: o.evidence,
      history: o.history || [],
    };
  }

  // ---------- 2027 winter (current) ----------
  const cases = [];

  {
    const a = ev({ at: "2026-10-11T03:10:00Z", stage: "contact", claim: "울산 HD FC가 문태오 측과 처음 연락했다는 주장.", group: "g-moon-a" });
    const b = ev({ at: "2026-10-13T11:40:00Z", stage: "negotiation", kind: "news", confidence: "medium", claim: "조건을 두고 협상 중이라는 매체 보도.", group: "g-moon-b" });
    const r = ev({ at: "2026-10-13T12:05:00Z", stage: "negotiation", relation: "repost", claim: "위 매체 보도를 옮긴 게시글.", group: "g-moon-b" });
    const c = ev({ at: "2026-10-15T06:30:00Z", stage: "failed", review: "pending", claim: "협상이 결렬됐다는 새 주장. 근거 링크 없음.", group: "g-moon-c" });
    cases.push(mk({
      id: "case-moon", name: "문태오", pos: "MF", from: "busan", to: "ulsan",
      stage: "negotiation", confidence: "low", review: "pending",
      summary: "협상설을 유지하고 있습니다. 결렬됐다는 새 주장이 들어와 검토 중입니다.",
      updated: "2026-10-15T06:30:00Z", evidence: [a, b, r, c],
      history: [hist("unknown", "contact", "첫 접촉 주장 반영", a, "2026-10-11T03:20:00Z"), hist("contact", "negotiation", "매체 보도로 협상설 반영", b, "2026-10-13T11:50:00Z")],
    }));
  }
  {
    const a = ev({ at: "2026-10-09T02:00:00Z", stage: "negotiation", kind: "news", confidence: "medium", claim: "서지안 영입 협상이 막바지라는 보도." });
    const o = ev({ at: "2026-10-14T01:00:00Z", stage: "confirmed", kind: "official", confidence: "high", review: "reviewed", claim: "구단이 서지안 영입을 발표.", sourceId: "src-official-seo" });
    cases.push(mk({
      id: "case-seo", name: "서지안", pos: "DF", from: "busan", to: "ulsan",
      stage: "confirmed", confidence: "high", review: "reviewed", verifiedAt: "2026-10-14T01:30:00Z",
      summary: "구단 공식 발표를 확인했습니다.", updated: "2026-10-14T01:30:00Z", evidence: [a, o],
      history: [hist("unknown", "negotiation", "협상설 반영", a, "2026-10-09T02:10:00Z"), hist("negotiation", "confirmed", "공식 발표 확인", o, "2026-10-14T01:30:00Z")],
    }));
  }
  {
    const a = ev({ at: "2026-10-14T09:00:00Z", stage: "near_agreement", confidence: "low", claim: "백도현이 부산 아이파크와 합의 직전이라는 주장." });
    cases.push(mk({
      id: "case-baek", name: "백도현", pos: "FW", from: "ulsan", to: "busan",
      stage: "near_agreement", confidence: "medium", review: "unverified",
      summary: "합의 임박설 한 건. 아직 검토하지 않았습니다.", updated: "2026-10-14T09:10:00Z", evidence: [a],
      history: [hist("unknown", "near_agreement", "합의 임박 주장 반영", a, "2026-10-14T09:10:00Z")],
    }));
  }
  {
    const a = ev({ at: "2026-10-15T04:20:00Z", stage: "interest", review: "pending", claim: "'김OO 선수'를 울산 HD FC가 지켜본다는 주장. 선수와 소속 구단을 특정할 수 없음." });
    cases.push(mk({
      id: "case-kim-unknown", name: "김OO", playerId: null, pos: null, from: null, to: "ulsan",
      stage: "unknown", confidence: "low", review: "pending",
      summary: "선수와 출발 구단을 확인하지 못해 검토 중입니다.", updated: "2026-10-15T04:20:00Z", evidence: [a],
    }));
  }
  {
    const a = ev({ at: "2026-10-12T05:00:00Z", stage: "interest", claim: "포항 스틸러스 골키퍼 이도윤에게 관심이 있다는 주장." });
    cases.push(mk({ id: "case-lee-gk", name: "이도윤", pos: "GK", from: "pohang", to: "ulsan", stage: "interest", confidence: "low", review: "unverified", summary: "관심설 한 건.", updated: "2026-10-12T05:00:00Z", evidence: [a], history: [hist("unknown", "interest", "관심설 반영", a, "2026-10-12T05:00:00Z")] }));
    const b = ev({ at: "2026-10-13T07:30:00Z", stage: "contact", kind: "news", confidence: "medium", claim: "울산 HD FC 미드필더 이도윤에게 FC서울이 연락했다는 보도." });
    cases.push(mk({ id: "case-lee-mf", name: "이도윤", pos: "MF", from: "ulsan", to: "fc-seoul", stage: "contact", confidence: "medium", review: "unverified", summary: "같은 이름의 다른 선수입니다. 포지션과 소속으로 구분합니다.", updated: "2026-10-13T07:30:00Z", evidence: [b], history: [hist("unknown", "contact", "접촉설 반영", b, "2026-10-13T07:30:00Z")] }));
  }
  {
    const long = "마르셀로 이시도로 산투스 페헤이라";
    const a = ev({ at: "2026-10-10T10:00:00Z", stage: "contact", claim: "전북 현대 모터스가 페헤이라와 접촉했다는 주장." });
    const b = ev({ at: "2026-10-12T10:00:00Z", stage: "interest", claim: "김포FC도 관심을 보인다는 주장." });
    cases.push(mk({ id: "case-ferreira-lh", name: long, pos: "FW", from: "ulsan", to: "jeonbuk", playerId: "p-ferreira", stage: "contact", confidence: "low", review: "unverified", summary: "같은 선수의 다른 구단 연결은 별도 이적 건입니다.", updated: "2026-10-10T10:00:00Z", evidence: [a], history: [hist("unknown", "contact", "접촉설 반영", a, "2026-10-10T10:00:00Z")] }));
    cases.push(mk({ id: "case-ferreira-sl", name: long, pos: "FW", from: "ulsan", to: "gimpo", playerId: "p-ferreira", stage: "interest", confidence: "low", review: "unverified", summary: "같은 선수의 다른 구단 연결은 별도 이적 건입니다.", updated: "2026-10-12T10:00:00Z", evidence: [b], history: [hist("unknown", "interest", "관심설 반영", b, "2026-10-12T10:00:00Z")] }));
  }
  {
    const evs = [];
    const first = ev({ at: "2026-10-06T02:00:00Z", stage: "contact", kind: "news", confidence: "medium", claim: "장하람 측과 접촉했다는 첫 보도.", group: "g-jang-1" });
    evs.push(first);
    const groups = ["g-jang-1", "g-jang-2", "g-jang-3", "g-jang-4", "g-jang-5", "g-jang-6"];
    for (let i = 0; i < 21; i++) {
      const g = groups[i % 6];
      const original = i < 5;
      const day = 6 + Math.floor(i / 3);
      evs.push(ev({
        at: `2026-10-${String(day).padStart(2, "0")}T${String(3 + (i % 9)).padStart(2, "0")}:15:00Z`,
        stage: i > 10 ? "negotiation" : "contact",
        kind: i % 4 === 0 ? "news" : "community",
        confidence: i % 4 === 0 ? "medium" : "low",
        relation: original ? "original" : i % 5 === 0 ? "unknown" : "repost",
        group: original ? groups[i + 1] : g,
        claim: original ? "다른 경로에서 나온 협상 관련 주장." : "앞선 주장을 인용하거나 다시 올린 글.",
        availability: i === 7 ? "unavailable" : "available",
      }));
    }
    cases.push(mk({
      id: "case-jang", name: "장하람", pos: "MF", from: "fc-seoul", to: "ulsan",
      stage: "negotiation", confidence: "medium", review: "reviewed",
      summary: "출처는 22건이지만 독립된 정보 계통은 6개입니다. 대부분 같은 보도의 재게시입니다.",
      updated: "2026-10-13T10:15:00Z", evidence: evs,
      history: [hist("unknown", "contact", "첫 보도 반영", first, "2026-10-06T02:10:00Z"), hist("contact", "negotiation", "독립 계통 3곳의 협상 주장 검토 후 반영", evs[12], "2026-10-10T08:00:00Z")],
    }));
  }
  {
    const a = ev({ at: "2026-10-05T03:00:00Z", stage: "negotiation", claim: "윤서우 협상 주장.", availability: "unavailable" });
    const b = ev({ at: "2026-10-08T03:00:00Z", stage: "failed", kind: "news", confidence: "medium", review: "reviewed", claim: "협상이 끝났다는 보도." });
    cases.push(mk({ id: "case-yoon", name: "윤서우", pos: "DF", from: "gangwon", to: "ulsan", stage: "failed", confidence: "medium", review: "reviewed", summary: "결렬설을 반영했습니다. 첫 원문은 삭제되어 열 수 없습니다.", updated: "2026-10-08T03:20:00Z", evidence: [a, b], history: [hist("unknown", "negotiation", "협상설 반영", a, "2026-10-05T03:10:00Z"), hist("negotiation", "failed", "결렬 보도 검토 후 반영", b, "2026-10-08T03:20:00Z")] }));
  }
  {
    const o = ev({ at: "2026-10-07T01:00:00Z", stage: "confirmed", kind: "official", confidence: "high", review: "reviewed", claim: "구단이 고은찬 영입을 발표.", sourceId: "src-official-go" });
    const n = ev({ at: "2026-10-15T02:40:00Z", stage: "failed", review: "pending", claim: "메디컬에서 문제가 생겨 이적이 무산됐다는 새 주장." });
    cases.push(mk({ id: "case-go", name: "고은찬", pos: "FW", from: "daejeon", to: "ulsan", stage: "confirmed", confidence: "high", review: "pending", verifiedAt: "2026-10-07T01:20:00Z", summary: "공식 발표 뒤 무산됐다는 새 주장이 들어와 검토 중입니다. 공식 확정은 유지합니다.", updated: "2026-10-15T02:40:00Z", evidence: [o, n], history: [hist("unknown", "confirmed", "공식 발표 확인", o, "2026-10-07T01:20:00Z")] }));
  }
  {
    const a = ev({ at: "2026-10-09T06:00:00Z", stage: "contact", claim: "표준우가 서울 이랜드 FC와 접촉했다는 주장." });
    cases.push(mk({ id: "case-pyo", name: "표준우", pos: "MF", from: "ulsan", to: "seoul-eland", stage: "contact", confidence: "low", review: "refuted", summary: "구단이 사실이 아니라고 밝혀 반박됨으로 표시합니다.", updated: "2026-10-11T00:00:00Z", evidence: [a], history: [hist("unknown", "contact", "접촉설 반영", a, "2026-10-09T06:10:00Z")] }));
  }
  {
    const a = ev({ at: "2026-10-14T13:00:00Z", stage: "interest", claim: "정마루가 이적을 원한다는 주장. 행선지 언급 없음." });
    cases.push(mk({ id: "case-jung", name: "정마루", pos: "DF", from: "ulsan", to: null, stage: "interest", confidence: "low", review: "unverified", summary: "도착 구단이 확인되지 않았습니다.", updated: "2026-10-14T13:00:00Z", evidence: [a] }));
  }
  {
    const a = ev({ at: "2026-10-03T08:00:00Z", stage: "interest", kind: "news", confidence: "low", claim: "해외 매체가 언급한 영입 후보." });
    cases.push(mk({ id: "case-wellington", name: "Alexander Christopher Wellington-Barnes", pos: "FW", from: "seongnam", to: "ulsan", stage: "interest", confidence: "low", review: "unverified", summary: "관심설 한 건.", updated: "2026-10-03T08:00:00Z", evidence: [a] }));
  }
  {
    const a = ev({ at: "2026-10-12T02:00:00Z", stage: "contact", claim: "FC서울과 포항 스틸러스 사이 이적설." });
    cases.push(mk({ id: "case-other", name: "류하진", pos: "DF", from: "fc-seoul", to: "pohang", stage: "contact", confidence: "low", review: "unverified", summary: "다른 구단 사이의 이적 건.", updated: "2026-10-12T02:00:00Z", evidence: [a] }));
  }

  // ---------- 2026 summer (archived) ----------
  {
    const a = ev({ at: "2026-08-20T00:00:00Z", stage: "failed", claim: "협상이 결렬됐다는 주장.", availability: "unavailable" });
    cases.push(mk({ id: "arc-nam", window: "2026-summer", name: "남기온", pos: "MF", from: "busan", to: "ulsan", stage: "failed", confidence: "low", review: "unverified", summary: "시장 종료 시점의 상태입니다.", updated: "2026-08-20T00:00:00Z", evidence: [a] }));
    const o = ev({ at: "2026-07-02T01:00:00Z", stage: "confirmed", kind: "official", confidence: "high", review: "reviewed", claim: "구단이 영입을 발표." });
    cases.push(mk({ id: "arc-han", window: "2026-summer", name: "한결", pos: "FW", from: "seoul-eland", to: "ulsan", stage: "confirmed", confidence: "high", review: "reviewed", summary: "공식 발표로 확정된 기록입니다.", updated: "2026-07-02T01:30:00Z", evidence: [o], history: [hist("unknown", "confirmed", "공식 발표 확인", o, "2026-07-02T01:30:00Z")] }));
    const n = ev({ at: "2026-08-28T05:00:00Z", stage: "near_agreement", claim: "합의가 가까웠다는 주장." });
    cases.push(mk({ id: "arc-oh", window: "2026-summer", name: "오다온", pos: "DF", from: "ulsan", to: "gyeongnam", stage: "near_agreement", confidence: "low", review: "unverified", summary: "시장이 끝날 때까지 공식 발표가 없었습니다.", updated: "2026-08-28T05:00:00Z", evidence: [n] }));
  }

  // ---------- stress set: 120 incoming cases for 울산 HD FC ----------
  const FAM = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송"];
  const GIV = ["도윤", "하준", "서진", "지호", "예준", "시우", "건우", "우진", "민재", "현우", "태윤", "주원", "은호", "선우", "로운"];
  const FOREIGN = ["Kristoffer Haaland-Johansen", "Rodrigo dos Santos Almeida", "Takumi Nishimura", "Bogdan Petrović"];
  const STG = ["interest", "contact", "negotiation", "near_agreement", "unknown", "failed", "contact", "interest"];
  const CONF = ["low", "low", "medium", "high", "low", "medium"];
  const REV = ["unverified", "pending", "reviewed", "unverified", "refuted", "unverified"];
  const others = CLUBS.map((c) => c[0]).filter((id) => id !== "ulsan");
  const stress = [];
  for (let i = 0; i < 120; i++) {
    const name = i % 17 === 5 ? FOREIGN[i % 4] : FAM[(i * 7) % FAM.length] + GIV[(i * 5) % GIV.length];
    const stage = i % 23 === 0 ? "confirmed" : STG[i % STG.length];
    const at = new Date(Date.parse(NOW) - (i * 160 + 25) * 60000).toISOString().replace(".000Z", "Z");
    const e = ev({ at, stage, kind: stage === "confirmed" ? "official" : "community", confidence: CONF[i % 6], review: stage === "confirmed" ? "reviewed" : REV[i % 6], claim: "대량 표시 검증용 합성 주장." });
    stress.push(mk({ id: `stress-${i + 1}`, name, pos: ["GK", "DF", "MF", "FW"][i % 4], from: others[i % others.length], to: "ulsan", stage, confidence: stage === "confirmed" ? "high" : CONF[i % 6], review: stage === "confirmed" ? "reviewed" : REV[i % 6], summary: "대량 표시 검증용 합성 이적 건입니다.", updated: at, evidence: [e] }));
  }

  window.RadarData = {
    synthetic: true,
    now: NOW,
    windows: [
      { id: "2027-winter", season: 2027, type: "winter", label: "2027 겨울", tracking_starts_at: "2026-10-01T00:00:00Z", tracking_ends_at: "2027-03-01T00:00:00Z", archived_at: null },
      { id: "2026-summer", season: 2026, type: "summer", label: "2026 여름", tracking_starts_at: "2026-05-01T00:00:00Z", tracking_ends_at: "2026-09-01T00:00:00Z", archived_at: "2026-09-02T00:00:00Z" },
    ],
    clubs: { 2027: clubsFor(2027), 2026: clubsFor(2026) },
    cases,
    stress,
  };
})();
