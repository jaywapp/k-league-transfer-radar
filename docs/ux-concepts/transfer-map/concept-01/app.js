/* 01 방사형 마인드맵: the club sits in the middle; limbs grow left (incoming) and right (outgoing).
   Each limb runs counterpart club -> player -> club. Players are grouped by counterpart so limbs never cross.
   Portrait screens grow limbs up (incoming) and down (outgoing). */
MapShell({
  draw(ctx) {
    const { M, R, cases, club, w, h, portrait } = ctx;
    const C = { x: w / 2, y: h / 2 };
    const axis = portrait ? "y" : "x";
    const MAX = portrait ? 6 : 9;
    // along = main axis distance from center, across = spread
    const half = portrait ? h / 2 - 34 : Math.min(w / 2 - 24, 540);
    const span = (portrait ? w : h) - 120;
    const pos = (sign, along, across) => (portrait ? { x: C.x + across, y: C.y + sign * along } : { x: C.x + sign * along, y: C.y + across });

    [["incoming", -1], ["outgoing", 1]].forEach(([dir, sign]) => {
      const list = cases.filter((c) => R.direction(c, club.id) === dir);
      const shown = list.slice(0, MAX), rest = list.length - shown.length;
      // group by counterpart club, keep groups in order of most recent update
      const groups = [];
      shown.forEach((c) => {
        const o = R.counterpart(c, club.id);
        const key = o ? o.id : `?${c.id}`;
        let g = groups.find((x) => x.key === key);
        if (!g) groups.push((g = { key, club: o, cases: [] }));
        g.cases.push(c);
      });
      const slots = shown.length + (rest > 0 ? 1 : 0);
      const step = Math.min(portrait ? 58 : 64, span / Math.max(slots, 1));
      const top = -((slots - 1) * step) / 2;
      let i = 0;
      const r1 = half * (portrait ? 0.5 : 0.42), r2 = half * 0.9;
      groups.forEach((g) => {
        const first = i;
        g.cases.forEach((c) => {
          const across = top + i * step;
          const pp = pos(sign, r1, across);
          g.cases.length && (c._p = pp);
          i++;
        });
        const mid = top + ((first + i - 1) / 2) * step;
        // counterpart sits further out, pulled toward the middle so the map stays compact
        const cp = pos(sign, r2, mid * 0.82);
        const full = g.club ? ctx.store.state.clubs.find((x) => x.id === g.club.id) || { id: g.club.id, name: g.club.name, short_name: g.club.name } : null;
        g.cases.forEach((c) => {
          const pts = dir === "incoming" ? [cp, c._p, C] : [C, c._p, cp];
          M.connection(ctx.svg, ctx.defs, c, pts, { layer: ctx.cx, axis });
          M.playerNode(ctx.nodes, c, c._p, portrait ? { dy: -15, max: 5 } : { dy: -14, max: 9 });
        });
        M.clubNode(ctx.nodes, full, cp, { r: portrait ? 17 : 21, unknown: !g.club });
      });
      if (rest > 0) {
        const p = pos(sign, r1, top + i * step);
        const g = M.el("g", { class: "more-node", transform: `translate(${p.x},${p.y})`, tabindex: 0, role: "button", "data-act": "open-list", "aria-label": `${dir === "incoming" ? "영입" : "방출"} ${rest}건 더 보기` }, ctx.nodes);
        M.el("circle", { r: 15 }, g);
        M.el("text", { "text-anchor": "middle", "dominant-baseline": "central" }, g).textContent = `+${rest}`;
      }
      if (list.length) {
        const lp = pos(sign, portrait ? 58 : 74, portrait ? 0 : 0);
        const t = M.el("text", { class: "side-word", x: lp.x + (portrait ? 34 : 0), y: lp.y + (portrait ? 0 : -50), "text-anchor": "middle", "dominant-baseline": "central" }, ctx.nodes);
        t.textContent = dir === "incoming" ? "영입" : "방출";
      }
    });
    M.clubNode(ctx.nodes, club, C, { r: Math.min(w, h) < 500 ? 32 : 42, center: true });
    if (!cases.length) { const t = M.el("text", { class: "side-word", x: C.x, y: C.y + 66, "text-anchor": "middle" }, ctx.nodes); t.textContent = "연결된 이적 소식 없음"; }
  },
  allowEmpty: true,
  onAct(a) { if (a === "open-list") document.getElementById("list-btn").click(); },
});
