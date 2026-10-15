/* Shared content parts. Concepts place and style them differently; wording and meaning stay identical. */
(function () {
  const R = window.Radar;
  const esc = R.esc;

  function evidence(e, c, o = {}) {
    const differs = e.claimed_stage !== c.stage;
    const gone = e.source.availability !== "available";
    const link = gone
      ? `<span class="ev__gone"><i class="ph ph-link-break" aria-hidden="true"></i>${e.source.availability === "unavailable" ? "원문 삭제 또는 접근 불가" : "원문 상태 확인 불가"}</span>`
      : `<a class="ev__link" href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">원문 열기<span class="sr-only"> (${esc(e.source.publisher)}, 새 창)</span><i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>`;
    return `
      <article class="ev${e.review_status === "pending" ? " ev--pending" : ""}${e.source_relation === "repost" ? " ev--repost" : ""}${e.source.kind === "official" ? " ev--official" : ""}" ${o.id ? `id="${esc(o.id)}"` : ""}>
        <header class="ev__head">
          <span class="ev__pub">${e.source.kind === "official" ? '<i class="ph ph-seal-check" aria-hidden="true"></i>' : ""}${esc(e.source.publisher)}</span>
          <span class="ev__meta">${R.KIND[e.source.kind]} · ${R.RELATION[e.source_relation]}</span>
          <span class="ev__time">게시 ${R.time(e.source.posted_at, { archived: o.archived })}</span>
        </header>
        <p class="ev__claim">${esc(e.claim)}</p>
        <div class="ev__tags">
          <span class="ev__claimed">주장한 단계 ${R.stage(e.claimed_stage)}</span>
          ${differs ? `<span class="ev__differs">현재 반영 단계와 다름</span>` : ""}
          ${R.conf(e.confidence)} ${R.review(e.review_status)}
        </div>
        <footer class="ev__foot">${link}<span class="ev__title">${esc(e.source.title)}</span></footer>
      </article>`;
  }

  function official(c) {
    if (!c.official_confirmation) return "";
    const o = c.official_confirmation;
    return `
      <section class="official" aria-label="공식 확인">
        <i class="ph ph-seal-check" aria-hidden="true"></i>
        <div>
          <p class="official__title">공식 발표 확인</p>
          <p class="official__body">서버가 ${R.time(o.verified_at, { noRel: true })}에 구단 공식 발표를 확인했습니다.</p>
          <a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">공식 발표 보기<span class="sr-only"> (새 창)</span> <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>
        </div>
      </section>`;
  }

  function pending(c) {
    const s = R.pendingSentence(c);
    if (!s) return "";
    return `<p class="notice notice--pending" role="note"><i class="ph ph-clock-countdown" aria-hidden="true"></i><span>${s}</span></p>`;
  }

  function identityNotes(c) {
    const notes = [];
    if (!c.player.id) notes.push("선수를 특정하지 못했습니다. 원문에 나온 이름을 그대로 표시합니다.");
    if (!c.from_club) notes.push("출발 구단을 확인하지 못했습니다.");
    if (!c.to_club) notes.push("도착 구단을 확인하지 못했습니다.");
    if (c.player.id === "p-ferreira") notes.push("이 선수는 다른 구단과도 연결돼 있습니다. 구단 조합이 다르면 별도 이적 건입니다.");
    if (c.player.name === "이도윤") notes.push("같은 이름의 다른 선수가 있습니다. 포지션과 소속 구단을 함께 확인하세요.");
    return notes.length ? `<ul class="notice notice--id">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : "";
  }

  function historyList(c, o = {}) {
    if (!c.history.length) return `<p class="muted">반영된 단계 변경이 없습니다. 첫 주장 그대로입니다.</p>`;
    return `<ol class="hist">${[...c.history].reverse().map((h) => `
      <li class="hist__item">
        <span class="hist__time">${R.time(h.changed_at, { archived: o.archived })}</span>
        <span class="hist__change">${R.stage(h.stage_before)}<i class="ph ph-arrow-right" aria-label="에서"></i>${R.stage(h.stage_after)}</span>
        <span class="hist__reason">${esc(h.reason)}</span>
      </li>`).join("")}</ol>`;
  }

  function stateView(kind, o = {}) {
    const map = {
      "no-window": { icon: "ph-calendar-x", title: "추적 중인 이적시장이 없습니다", body: "시장 추적이 시작되면 이곳에 구단별 소식이 쌓입니다." },
      empty: { icon: "ph-tray", title: o.archived ? "이 시장에 남은 기록이 없습니다" : "이 시장에 연결된 이적 소식이 아직 없습니다", body: o.archived ? "보관 당시 이 구단과 연결된 이적 건이 없었습니다." : "새 루머가 분석되면 최근 갱신순으로 나타납니다. 다른 구단이나 방향을 확인해 보세요." },
      "filter-empty": { icon: "ph-funnel-x", title: "조건에 맞는 이적 건이 없습니다", body: "검색어나 필터를 줄이면 더 많은 건을 볼 수 있습니다.", action: `<button type="button" class="btn" data-act="clear">조건 모두 지우기</button>` },
    };
    if (kind === "error") {
      const e = R.errorOf(o.error);
      return `<div class="state state--error" role="alert"><i class="ph ${e.icon}" aria-hidden="true"></i><p class="state__title">${e.title}</p><p class="state__body">${e.body}</p><button type="button" class="btn" data-act="retry">다시 시도</button></div>`;
    }
    const v = map[kind];
    return `<div class="state state--${kind}" role="status"><i class="ph ${v.icon}" aria-hidden="true"></i><p class="state__title">${v.title}</p><p class="state__body">${v.body}</p>${v.action || ""}</div>`;
  }

  function staleBanner(st) {
    const e = R.errorOf(st.error);
    return `<div class="notice notice--stale" role="alert"><i class="ph ph-warning" aria-hidden="true"></i><span>${e.title}. ${R.absTime(st.last.at)}에 불러온 목록을 그대로 보여 줍니다.</span><button type="button" class="btn btn--sm" data-act="retry">다시 시도</button></div>`;
  }

  function pageFooter(st) {
    if (st.page === "loading") return `<div class="more" role="status"><span class="skel" style="height:14px;width:160px"></span><span class="sr-only">다음 목록을 불러오는 중</span></div>`;
    if (st.page === "error") return `<div class="more more--error" role="alert"><span>다음 목록을 불러오지 못했습니다. 위의 ${st.items.length}건은 그대로입니다.</span><button type="button" class="btn btn--sm" data-act="more">다시 시도</button></div>`;
    if (st.cursor) return `<div class="more"><button type="button" class="btn" data-act="more">30건 더 보기</button><span class="muted">지금 ${st.items.length}건 표시</span></div>`;
    if (st.items.length > 5) return `<p class="more muted">목록 끝 · ${st.items.length}건</p>`;
    return "";
  }

  const guide = `
    <h2 class="guide__h">이적 레이더 읽는 법</h2>
    <p>이 서비스는 커뮤니티와 언론의 이적 <strong>주장</strong>을 모아 정리합니다. 구단이나 리그의 공식 서비스가 아닙니다.</p>
    <dl class="guide__dl">
      <dt>단계</dt><dd>${R.stage("interest")} ${R.stage("contact")} ${R.stage("negotiation")} ${R.stage("near_agreement")} ${R.stage("failed")} ${R.stage("unknown")}<br>점선 표시는 모두 출처가 주장한 단계입니다. 사실로 확인된 협상이 아닙니다.</dd>
      <dt>공식 확정</dt><dd>${R.stage("confirmed")} 구단·리그의 공식 발표를 서버가 확인한 건에만 씁니다. 초록색은 이 경우에만 나옵니다.</dd>
      <dt>근거 신뢰도</dt><dd>${R.conf("low")} ${R.conf("medium")} ${R.conf("high")}<br>출처가 서로 독립적인지, 주장이 구체적인지를 봅니다. 이적이 성사될 확률이 아닙니다.</dd>
      <dt>검토 상태</dt><dd>${R.review("unverified")} ${R.review("pending")} ${R.review("reviewed")} ${R.review("refuted")}<br>상충하는 새 주장이 오면 검토가 끝날 때까지 기존 단계를 유지합니다. 검토 완료는 공식 확정이 아닙니다.</dd>
      <dt>출처 수</dt><dd>${R.sources({ source_count: 5, independent_source_count: 2 })} 같은 글을 다시 올리거나 인용한 것은 독립 근거로 세지 않습니다.</dd>
      <dt>시각</dt><dd>‘갱신’은 이적 건이 마지막으로 바뀐 시각이고, ‘게시’는 원문이 올라온 시각입니다. 모두 한국 시간입니다.</dd>
    </dl>`;

  window.RadarParts = { evidence, official, pending, identityNotes, historyList, stateView, staleBanner, pageFooter, guide };
})();
