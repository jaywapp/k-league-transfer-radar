/* 02 리그 네트워크: every club of the season sits on one ring (K리그1 left arc, K리그2 right arc).
   Each transfer case is a chord bent toward the center. The selected club's chords stay lit and carry player names;
   the rest of the league stays visible as a quiet web. */
MapShell({
  allClubs: true,
  draw(ctx) {
    const { M, R, cases, w, h, st } = ctx;
    const clubs = st.clubs;
    const C = { x: w / 2, y: h / 2 + 6 };
    const Rr = Math.min(w, h) * (w < 600 ? 0.36 : 0.37);
    const k1 = clubs.filter((c) => c.league === "K1"), k2 = clubs.filter((c) => c.league === "K2");
    const pos = {};
    const place = (list, from, to) => list.forEach((c, i) => {
      const a = ((from + ((to - from) * (i + 0.5)) / list.length) * Math.PI) / 180;
      pos[c.id] = { x: C.x + Math.cos(a) * Rr, y: C.y + Math.sin(a) * Rr, a };
    });
    place(k1, 100, 260);
    place(k2, -80, 80);
    // arc labels
    [["K리그1", 262, "end"], ["K리그2", 278, "start"]].forEach(([l, deg, anchor]) => {
      const a = (deg * Math.PI) / 180;
      const t = M.el("text", { class: "arc-word", x: C.x + Math.cos(a) * (Rr + 8), y: C.y + Math.sin(a) * (Rr + 8), "text-anchor": anchor, "dominant-baseline": "central" }, ctx.nodes);
      t.textContent = l;
    });
    const seen = {};
    const sel = st.clubId;
    const satellite = (id, c) => { const p = pos[id]; const k = 1.2; return { x: C.x + (p.x - C.x) * k, y: C.y + (p.y - C.y) * k }; };
    const back = M.el("g", { class: "web" }, ctx.cx), front = M.el("g", {}, ctx.cx);
    // draw background edges first, selected club's edges last
    const ordered = [...cases].sort((a, b) => (involves(a) ? 1 : 0) - (involves(b) ? 1 : 0));
    function involves(c) { return (c.from_club && c.from_club.id === sel) || (c.to_club && c.to_club.id === sel); }
    ordered.forEach((c) => {
      const a = c.from_club && pos[c.from_club.id] ? pos[c.from_club.id] : satellite(c.to_club.id);
      const b = c.to_club && pos[c.to_club.id] ? pos[c.to_club.id] : satellite(c.from_club.id);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      // parallel cases between the same two clubs fan out instead of overlapping
      const key = [c.from_club && c.from_club.id, c.to_club && c.to_club.id].sort().join("|");
      const n = (seen[key] = (seen[key] || 0) + 1) - 1;
      const pull = [0.22, 0.04, 0.4, 0.55, 0.12][n % 5];
      const m = { x: mid.x + (C.x - mid.x) * pull, y: mid.y + (C.y - mid.y) * pull };
      const on = involves(c);
      const g = M.connection(ctx.svg, ctx.defs, c, [a, m, b], { layer: on ? front : back, tension: 0.6 });
      if (!on) g.classList.add("cx--quiet");
      if (!c.from_club || !c.to_club) { const s = !c.from_club ? a : b; M.clubNode(ctx.nodes, null, s, { r: 9, unknown: true }); }
      if (on) {
        // sit the player on the chord, closer to the counterpart club so names spread out along the fan
        const d = g.querySelector(".cx__line").getAttribute("d");
        const p = M.midpointOf(d, c.to_club && c.to_club.id === sel ? 0.42 : 0.58);
        const right = p.x >= C.x;
        M.playerNode(ctx.nodes, c, p, { dx: right ? 10 : -10, anchor: right ? "start" : "end", max: 8 });
      }
    });
    clubs.forEach((c) => {
      const p = pos[c.id];
      const n = M.clubNode(ctx.nodes, c, p, { r: c.id === sel ? 26 : 19, focusable: true, selected: c.id === sel });
      // label outside the ring
      const lab = n.querySelector("text");
      if (c.id !== sel) { lab.textContent = c.short_name; }
    });
  },
  onClub(id, store) { store.setClub(id); },
  allowEmpty: true,
});
