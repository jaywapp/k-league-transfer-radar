/* 03 레이더 궤도형: a radar scope around the club. Each ring is a claimed stage; the closer a player sits,
   the further the claim has gone. Only an officially confirmed case touches the club. Failed claims drift outside.
   Incoming on the left half, outgoing on the right (top / bottom on portrait). Counterpart clubs sit on the rim. */
MapShell({
  draw(ctx) {
    const { M, R, cases, club, w, h, portrait, st } = ctx;
    const C = { x: w / 2, y: h / 2 + 4 };
    const S = Math.min(w, h);
    const RING = ["confirmed", "near_agreement", "negotiation", "contact", "interest", "unknown", "failed"];
    const rIn = S * 0.085, rOut = S * (w < 360 ? 0.38 : 0.44);
    const step = (rOut * 0.86 - rIn) / (RING.length - 1);
    const radius = (s) => rIn + RING.indexOf(s) * step;
    // portrait: stretch the scope vertically so both halves get room
    const ky = portrait ? Math.min(1.9, (h / 2 - 56) / rOut) : 1;
    const pt = (a, r) => ({ x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r * ky });

    // scope: rings with tiny stage words on the vertical axis
    const scope = M.el("g", { class: "scope" }, ctx.cx);
    RING.forEach((s, i) => {
      M.el("ellipse", { class: `ring ring--${s}`, cx: C.x, cy: C.y, rx: radius(s), ry: radius(s) * ky }, scope);
      const t = M.el("text", { class: "ring-word", x: portrait ? C.x + radius(s) : C.x, y: portrait ? C.y : C.y - radius(s), "text-anchor": "middle", "dominant-baseline": "central" }, scope);
      t.textContent = R.STAGES[s].label;
      if (portrait) t.remove(); // too tight on narrow screens; the legend carries the ring meaning
    });
    M.el("ellipse", { class: "rim", cx: C.x, cy: C.y, rx: rOut, ry: rOut * ky }, scope);
    // sweep: shows live tracking; it stops when the pipeline is not healthy
    if (st.meta && st.meta.pipeline_status === "ready" && !ctx.store.archived) {
      const sw = M.el("g", { class: "sweep", style: `transform-origin:${C.x}px ${C.y}px` }, scope);
      if (portrait) sw.setAttribute("hidden", "");
      const id = "sweepgrad";
      const lg = M.el("linearGradient", { id, x1: "0", y1: "0", x2: "1", y2: "0" }, ctx.defs);
      M.el("stop", { offset: "0", "stop-color": "var(--ink)", "stop-opacity": "0" }, lg);
      M.el("stop", { offset: "1", "stop-color": "var(--ink)", "stop-opacity": ".045" }, lg);
      const a = (-16 * Math.PI) / 180;
      M.el("path", { d: `M${C.x},${C.y} L${C.x + rOut},${C.y} A${rOut},${rOut} 0 0,0 ${C.x + Math.cos(a) * rOut},${C.y + Math.sin(a) * rOut} Z`, fill: `url(#${id})` }, sw);
    }

    [["incoming", portrait ? -90 : 180], ["outgoing", portrait ? 90 : 0]].forEach(([dir, mid]) => {
      const list = cases.filter((c) => R.direction(c, club.id) === dir).slice(0, portrait ? 10 : 16);
      const spread = Math.min(150, 20 * Math.max(list.length - 1, 1));
      // interleave stages so neighbours rarely share a ring
      const order = [...list].sort((a, b) => RING.indexOf(a.stage) - RING.indexOf(b.stage));
      const lanes = [];
      order.forEach((c, i) => (i % 2 ? lanes.push(c) : lanes.unshift(c)));
      lanes.forEach((c, i) => {
        const deg = lanes.length === 1 ? mid : mid - spread / 2 + (spread * i) / (lanes.length - 1);
        const a = (deg * Math.PI) / 180;
        const r = radius(c.stage);
        const p = pt(a, r);
        const rim = pt(a, rOut);
        const o = R.counterpart(c, club.id);
        const pts = dir === "incoming" ? [rim, p] : [p, rim];
        // a tail toward the club only for confirmed: it is the one claim that "arrived"
        const full = c.stage === "confirmed" ? (dir === "incoming" ? [rim, p, C] : [C, p, rim]) : pts;
        M.connection(ctx.svg, ctx.defs, c, full, { layer: ctx.cx, tension: 0 });
        // keep labels on screen: near an edge, put the name on the inner side
        const right = Math.cos(a) >= 0 ? p.x < w - 70 : p.x < 70;
        M.playerNode(ctx.nodes, c, p, Math.abs(Math.cos(a)) < 0.3 ? { dy: Math.sin(a) < 0 ? -16 : 18, max: 7 } : { dx: right ? 11 : -11, anchor: right ? "start" : "end", max: 7 });
        const label = M.el("text", { class: "rim-word", x: pt(a, rOut + 12).x, y: pt(a, rOut + 12 / ky).y, "text-anchor": Math.abs(Math.cos(a)) < 0.3 ? "middle" : right ? "start" : "end", "dominant-baseline": "central" }, ctx.nodes);
        label.textContent = o ? (st.clubs.find((x) => x.id === o.id) || { short_name: o.name }).short_name : "?";
      });
      if (list.length) {
        const a = (mid * Math.PI) / 180;
        const t = M.el("text", { class: "side-word", x: portrait ? C.x - rOut + 14 : C.x + Math.cos(a) * (rOut + 54), y: portrait ? C.y + Math.sin(a) * rOut * ky * 0.55 : C.y, "text-anchor": "middle", "dominant-baseline": "central" }, ctx.nodes);
        t.textContent = dir === "incoming" ? "영입" : "방출";
      }
    });
    M.clubNode(ctx.nodes, club, C, { r: rIn * 0.62, center: true });
  },
  allowEmpty: true,
});
