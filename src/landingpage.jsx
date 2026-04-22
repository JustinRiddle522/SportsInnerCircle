import React, { useEffect, useRef, useState } from "react";

import justinImg from "./assets/images/Justin.jpg";
import nickImg from "./assets/images/Nick.jpg";
import logoImg from "./assets/images/logo-bright.png";

/* ─── Count-up hook ─── */
function useCountUp(target, duration = 2000, format = (v) => v, startDelay = 0) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          setTimeout(() => {
            const start = performance.now();
            const tick = (now) => {
              const p = Math.min((now - start) / duration, 1);
              const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
              setVal(Math.round(eased * target));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }, startDelay);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, startDelay]);

  return [ref, format(val)];
}

/* ─── Live graph from Google Sheets ─── */
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1R3_kgvSqkJiiA6AwTD9TPZebbQCbPiXPBRlDGtc3USs/export?format=csv&gid=1927067838";

function parseCSVForCumulative(csv) {
  const rows = csv.split("\n").map((r) => r.split(",").map((c) => c.replace(/^"|"$/g, "").trim()));
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] && rows[i][1].trim() === "1") { dataStart = i; break; }
  }
  if (dataStart < 0) return [];
  const cum = [];
  let running = 0;
  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    if (!row[1] || !/^\d+$/.test(row[1].trim())) continue;
    const wl = (row[8] || "").trim().toLowerCase();
    if (wl !== "win" && wl !== "loss") continue;
    const ret = parseFloat(row[9]);
    if (isNaN(ret)) continue;
    running += ret;
    cum.push({ x: parseInt(row[1].trim()), y: Math.round(running * 100) / 100 });
  }
  return cum;
}

function LiveGraph() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const tooltipRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [pts, setPts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const csv = await res.text();
        const data = parseCSVForCumulative(csv);
        if (!cancelled && data.length > 0) {
          setPts(data);
          setStatus("ok");
        } else if (!cancelled) setStatus("error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== "ok" || pts.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId = null;

    const init = () => {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (canvas._cleanup) { canvas._cleanup(); canvas._cleanup = null; }

      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      if (!parent) return;
      const W = parent.offsetWidth || 300;
      const H = parent.offsetHeight || 160;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.scale(dpr, dpr);

      const isMobile = W < 500;
      const PAD = { top: isMobile ? 18 : 28, right: isMobile ? 8 : 20, bottom: isMobile ? 24 : 34, left: isMobile ? 34 : 50 };
      const minY = Math.min(0, ...pts.map((p) => p.y)) - 5;
      const maxY = Math.max(...pts.map((p) => p.y)) + 8;
      const maxX = pts[pts.length - 1].x;

      const toX = (x) => PAD.left + ((x - 1) / (maxX - 1)) * (W - PAD.left - PAD.right);
      const toY = (y) => PAD.top + (1 - (y - minY) / (maxY - minY)) * (H - PAD.top - PAD.bottom);

      let progress = 0;
      let animStart = null;
      const DURATION = 2600;
      let hoverIdx = -1;

      const draw = (prog) => {
        ctx.clearRect(0, 0, W, H);
        const visCount = Math.max(1, Math.floor(prog * (pts.length - 1)));

        const yRange = maxY - minY;
        const step = yRange > 80 ? 20 : yRange > 40 ? 10 : 5;
        const firstTick = Math.ceil(minY / step) * step;
        ctx.strokeStyle = "rgba(212,175,55,0.09)";
        ctx.lineWidth = 0.8;
        for (let t = firstTick; t <= maxY; t += step) {
          const y = toY(t);
          if (y < PAD.top - 2 || y > H - PAD.bottom + 2) continue;
          ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
          ctx.fillStyle = "rgba(212,175,55,0.42)";
          ctx.font = "10px 'Courier New',monospace";
          ctx.textAlign = "right";
          ctx.fillText(t + "u", PAD.left - 5, y + 3.5);
        }

        ctx.fillStyle = "rgba(212,175,55,0.3)";
        ctx.font = "10px 'Courier New',monospace";
        ctx.textAlign = "center";
        [1, Math.round(maxX * 0.33), Math.round(maxX * 0.66), maxX].forEach((n) => {
          ctx.fillText(n, toX(n), H - PAD.bottom + 14);
        });

        if (minY < 0) {
          ctx.strokeStyle = "rgba(212,175,55,0.2)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 5]);
          ctx.beginPath(); ctx.moveTo(PAD.left, toY(0)); ctx.lineTo(W - PAD.right, toY(0)); ctx.stroke();
          ctx.setLineDash([]);
        }

        const grad = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom);
        grad.addColorStop(0, "rgba(16,185,129,0.30)");
        grad.addColorStop(0.55, "rgba(16,185,129,0.10)");
        grad.addColorStop(1, "rgba(16,185,129,0.00)");
        ctx.beginPath();
        ctx.moveTo(toX(pts[0].x), toY(pts[0].y));
        for (let i = 1; i <= visCount; i++) ctx.lineTo(toX(pts[i].x), toY(pts[i].y));
        ctx.lineTo(toX(pts[visCount].x), toY(Math.max(0, minY)));
        ctx.lineTo(toX(pts[0].x), toY(Math.max(0, minY)));
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        const lineGrad = ctx.createLinearGradient(toX(pts[0].x), 0, toX(pts[visCount].x), 0);
        lineGrad.addColorStop(0, "rgba(16,185,129,0.45)");
        lineGrad.addColorStop(1, "rgba(16,185,129,1)");
        ctx.beginPath();
        ctx.moveTo(toX(pts[0].x), toY(pts[0].y));
        for (let i = 1; i <= visCount; i++) ctx.lineTo(toX(pts[i].x), toY(pts[i].y));
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = "round";
        ctx.stroke();

        const tx = toX(pts[visCount].x), ty = toY(pts[visCount].y);
        ctx.beginPath(); ctx.arc(tx, ty, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(16,185,129,0.18)"; ctx.fill();
        ctx.beginPath(); ctx.arc(tx, ty, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981"; ctx.fill();

        if (hoverIdx >= 0 && hoverIdx < pts.length) {
          const hp = pts[hoverIdx];
          const hx = toX(hp.x), hy = toY(hp.y);
          ctx.strokeStyle = "rgba(16,185,129,0.3)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(hx, PAD.top); ctx.lineTo(hx, H - PAD.bottom); ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2);
          ctx.fillStyle = "#10b981"; ctx.fill();
          ctx.beginPath(); ctx.arc(hx, hy, 10, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(16,185,129,0.2)"; ctx.fill();
        }
      };

      const animate = (ts) => {
        if (!animStart) animStart = ts;
        const p = Math.min((ts - animStart) / DURATION, 1);
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        progress = eased;
        draw(progress);
        if (p < 1) { rafId = requestAnimationFrame(animate); }
        else { rafId = null; draw(1); }
      };
      rafId = requestAnimationFrame(animate);

      chartRef.current = { redraw: () => draw(1) };

      const onMove = (e) => {
        const rect2 = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect2.left);
        const visX = mx - PAD.left;
        const ratio = Math.max(0, Math.min(1, visX / (W - PAD.left - PAD.right)));
        const idx = Math.round(ratio * (pts.length - 1));
        hoverIdx = idx;
        draw(1);

        if (tooltipRef.current && idx >= 0 && idx < pts.length) {
          const p = pts[idx];
          tooltipRef.current.style.display = "block";
          const hx = toX(p.x);
          const hy = toY(p.y);
          const ttW = 110;
          let left = hx + 12;
          if (left + ttW > W) left = hx - ttW - 12;
          tooltipRef.current.style.left = left + "px";
          tooltipRef.current.style.top = Math.max(0, hy - 16) + "px";
          tooltipRef.current.innerHTML = `<div style="font-size:10px;color:rgba(212,175,55,0.7);margin-bottom:3px;">Pick #${p.x}</div><div style="font-size:14px;font-weight:800;color:#10b981;">${p.y >= 0 ? "+" : ""}${p.y.toFixed(2)}u</div>`;
        }
      };
      const onLeave = () => {
        hoverIdx = -1;
        draw(1);
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      };
      canvas.addEventListener("mousemove", onMove);
      canvas.addEventListener("mouseleave", onLeave);
      canvas._cleanup = () => {
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mouseleave", onLeave);
      };
    };

    const t = setTimeout(init, 80);

    let ro = null;
    if (canvas.parentElement) {
      ro = new ResizeObserver(() => {
        clearTimeout(canvas._roTimer);
        canvas._roTimer = setTimeout(init, 60);
      });
      ro.observe(canvas.parentElement);
    }

    return () => {
      clearTimeout(t);
      if (canvas._roTimer) clearTimeout(canvas._roTimer);
      if (rafId) cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      if (canvas._cleanup) { canvas._cleanup(); canvas._cleanup = null; }
    };
  }, [status, pts]);

  if (status === "loading") {
    return (
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:12, color:"rgba(212,175,55,0.45)", letterSpacing:".12em", textTransform:"uppercase" }}>
          Loading live data...
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:12, color:"rgba(255,100,100,0.6)" }}>Could not load live data</div>
      </div>
    );
  }
  return (
    <div style={{ position:"absolute", inset:0 }}>
      <canvas ref={canvasRef} style={{ display:"block", cursor:"crosshair", position:"absolute", inset:0 }} />
      <div ref={tooltipRef} style={{
        display:"none", position:"absolute", pointerEvents:"none",
        background:"rgba(8,10,14,0.97)", border:"1px solid rgba(16,185,129,0.3)",
        borderRadius:10, padding:"8px 12px", minWidth:100,
        boxShadow:"0 4px 20px rgba(0,0,0,0.5)", zIndex:10
      }} />
    </div>
  );
}

/* ─── Compound Growth Chart (Table) ─── */
function CompoundGrowthChart({ G, GL }) {
  // Hardcoded from live tracker — no network call, instant load on all devices
  const ROWS = [
    { yr:"2025", mon:"Jan",  pl: 19.13, beg: 10000.00,   unit: 500.00,   profit:  9565.00,  end:  19565.00, newYr:true,  final:false },
    { yr:"2025", mon:"Feb",  pl: 14.99, beg: 19565.00,   unit: 978.25,   profit: 14671.46,  end:  34236.46, newYr:false, final:false },
    { yr:"2025", mon:"Mar",  pl: 11.69, beg: 34236.46,   unit: 1711.82,  profit: 20001.18,  end:  54237.64, newYr:false, final:false },
    { yr:"2025", mon:"Apr",  pl:  4.24, beg: 54237.64,   unit: 2711.88,  profit: 11490.37,  end:  65728.01, newYr:false, final:false },
    { yr:"2025", mon:"May",  pl: -1.63, beg: 65728.01,   unit: 3286.40,  profit: -5356.83,  end:  60371.18, newYr:false, final:false },
    { yr:"2025", mon:"Jun",  pl:  6.27, beg: 60371.18,   unit: 3018.56,  profit: 18926.37,  end:  79297.55, newYr:false, final:false },
    { yr:"2025", mon:"Jul",  pl:  0.64, beg: 79297.55,   unit: 3964.88,  profit:  2537.52,  end:  81835.07, newYr:false, final:false },
    { yr:"2025", mon:"Aug",  pl:  3.44, beg: 81835.07,   unit: 4091.75,  profit: 14075.63,  end:  95910.70, newYr:false, final:false },
    { yr:"2025", mon:"Sep",  pl:  8.67, beg: 95910.70,   unit: 4795.54,  profit: 41577.52,  end: 137488.22, newYr:false, final:false },
    { yr:"2025", mon:"Oct",  pl: 14.17, beg:137488.22,   unit: 5000.00,  profit: 70850.00,  end: 208338.22, newYr:false, final:false },
    { yr:"2025", mon:"Nov",  pl:  1.92, beg:208338.22,   unit: 5000.00,  profit:  9600.00,  end: 217938.22, newYr:false, final:false },
    { yr:"2025", mon:"Dec",  pl: -0.83, beg:217938.22,   unit: 5000.00,  profit: -4150.00,  end: 213788.22, newYr:false, final:false },
    { yr:"2026", mon:"Jan",  pl: -4.63, beg:213788.22,   unit: 5000.00,  profit:-23150.00,  end: 190638.22, newYr:true,  final:false },
    { yr:"2026", mon:"Feb",  pl:  6.34, beg:190638.22,   unit: 5000.00,  profit: 31700.00,  end: 222338.22, newYr:false, final:false },
    { yr:"2026", mon:"Mar",  pl:  8.10, beg:222338.22,   unit: 5000.00,  profit: 40500.00,  end: 262838.22, newYr:false, final:false },
    { yr:"2026", mon:"Apr",  pl: -3.48, beg:262838.22,   unit: 5000.00,  profit:-17400.00,  end: 245438.22, newYr:false, final:true  },
  ];

  const finalBankroll = ROWS[ROWS.length - 1].end;
  const totalReturn = ((finalBankroll - 10000) / 10000 * 100).toFixed(2);

  const fmt = (n) => {
    const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 ? "-$" : "$") + abs;
  };

  return (
    <div style={{ width:"100%", borderRadius:16, overflow:"hidden", border:"1px solid #2a2d3a", background:"#1a1d27" }}>
      <div style={{ padding:"14px 20px 12px", borderBottom:"1px solid #2a2d3a", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9" }}>Compounding Tracker</div>
          <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>5% of bankroll per unit · $5,000 max unit size · compounds monthly</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
          <div style={{ fontSize:12, color:"#64748b" }}>Starting Bankroll <span style={{ fontWeight:700, color:"#e2e8f0", marginLeft:6 }}>$10,000</span></div>
          <div style={{ fontSize:12, color:"#64748b" }}>Final: <span style={{ fontWeight:800, color:"#10b981" }}>{fmt(finalBankroll)}</span></div>
          <div style={{ fontSize:12, color:"#64748b" }}>Return: <span style={{ fontWeight:800, color:"#10b981" }}>+{totalReturn}%</span></div>
        </div>
      </div>
      <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620 }}>
          <thead>
            <tr style={{ background:"#151821" }}>
              {[
                { h:"YEAR", a:"left" }, { h:"MONTH", a:"left" },
                { h:"BEGINNING BANKROLL", a:"right" }, { h:"UNIT %", a:"center" },
                { h:"UNIT $", a:"right" }, { h:"UNITS WON", a:"right" },
                { h:"PROFIT", a:"right" }, { h:"ENDING BANKROLL", a:"right" },
              ].map(col=>(
                <th key={col.h} style={{ padding:"9px 14px", fontSize:10, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em", textAlign:col.a, borderBottom:"1px solid #2a2d3a", whiteSpace:"nowrap" }}>{col.h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => {
              const pos = row.profit >= 0;
              const c = pos ? "#10b981" : "#f87171";
              return (
                <React.Fragment key={i}>
                  {row.newYr && i > 0 && (
                    <tr><td colSpan={8} style={{ padding:0, background:"#0a0d14", height:3, borderTop:"2px solid #2a2d3a", borderBottom:"2px solid #2a2d3a" }}/></tr>
                  )}
                  <tr style={{ borderBottom:"1px solid #1e2435", background: row.final ? "rgba(16,185,129,0.04)" : "transparent" }}
                    onMouseEnter={e=>e.currentTarget.style.background=row.final?"rgba(16,185,129,0.07)":"#1e2435"}
                    onMouseLeave={e=>e.currentTarget.style.background=row.final?"rgba(16,185,129,0.04)":"transparent"}>
                    <td style={{ padding:"9px 14px", fontSize:12, fontWeight:700, color:"#475569" }}>
                      {row.newYr ? <span style={{ background:"#1e293b", borderRadius:4, padding:"2px 8px", fontSize:11 }}>{row.yr}</span> : ""}
                    </td>
                    <td style={{ padding:"9px 14px", fontSize:13, fontWeight:600, color:"#e2e8f0" }}>
                      {row.mon}
                      {row.final ? <span style={{ display:"block", fontSize:10, background:"#422006", color:"#f59e0b", borderRadius:3, padding:"1px 5px", fontWeight:700, marginTop:3, width:"fit-content" }}>so far</span> : ""}
                    </td>
                    <td style={{ padding:"9px 14px", fontSize:12, color:c, textAlign:"right", fontWeight:600 }}>{fmt(row.beg)}</td>
                    <td style={{ padding:"9px 14px", fontSize:12, color:"#64748b", textAlign:"center" }}>5.00%</td>
                    <td style={{ padding:"9px 14px", fontSize:12, color:"#94a3b8", textAlign:"right" }}>{fmt(row.unit)}</td>
                    <td style={{ padding:"9px 14px", fontSize:12, fontWeight:600, color:c, textAlign:"right" }}>{pos?"+":""}{row.pl.toFixed(2)}</td>
                    <td style={{ padding:"9px 14px", fontSize:12, fontWeight:600, color:c, textAlign:"right" }}>{pos?"+":""}{fmt(row.profit)}</td>
                    <td style={{ padding:"9px 14px", fontSize:14, fontWeight:800, color:c, textAlign:"right" }}>{fmt(row.end)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}



/* ─── FAQ Section ─── */
function FAQSection({ G, GL }) {
  const [open, setOpen] = React.useState(null);
  const faqs = [
    {
      q: "How does this work?",
      a: "We use a structured, data-driven system to identify high-quality opportunities in the sports markets. You either follow the exact plays yourself, or we handle everything for you through our private capital option."
    },
    {
      q: "Who is this for?",
      a: "This is for individuals who want to diversify into alternative markets and are looking for a more structured, long-term approach. It works best for people with larger bankrolls who value consistency over quick wins."
    },
    {
      q: "Is it hands off?",
      a: "Yes, if you choose the Private Capital option. We handle the full execution for you. If you prefer more control, the Do It Yourself option lets you place the plays yourself."
    },
    {
      q: "What happens after I apply?",
      a: "We review your application to see if it's a good fit. If it is, we'll reach out, hop on a call, and walk you through everything and answer any questions before moving forward."
    },
    {
      q: "What kind of returns can I expect?",
      a: "Returns vary based on market conditions and execution, but all performance is fully tracked and transparent. We focus on long-term, consistent growth rather than short-term spikes."
    },
    {
      q: "Is there risk involved?",
      a: "Yes. Like any market, there is risk involved. Our system is built around managing that risk and maintaining consistency over time."
    },
    {
      q: "What's the minimum to get started?",
      a: "We work with a limited number of clients who meet our capital requirements. Apply to see if you qualify for access."
    },
  ];

  return (
    <section>
      <div className="cg" style={{ borderRadius:36, padding:"52px 24px 56px", position:"relative" }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 50% 40% at 50% 50%, rgba(212,175,55,.025) 0%, transparent 70%)" }}/>
        <div style={{ position:"relative", textAlign:"center", marginBottom:44 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, borderRadius:999,
            border:"1px solid rgba(212,175,55,.25)", background:"rgba(212,175,55,.07)",
            padding:"7px 18px", marginBottom:14,
            fontSize:11, fontWeight:700, letterSpacing:".22em", color:GL, textTransform:"uppercase" }}>
            Got Questions
          </div>
          <h2 style={{ fontSize:"clamp(28px,4.5vw,56px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-.03em", color:"#fff", margin:0 }}>
            Frequently Asked <span style={{ color:GL }}>Questions</span>
          </h2>
          <div style={{ width:72, height:2, borderRadius:99, background:`linear-gradient(90deg,transparent,${G},transparent)`, margin:"12px auto 0" }}/>
        </div>
        <div style={{ maxWidth:760, margin:"0 auto", display:"flex", flexDirection:"column", gap:12 }}>
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderRadius:18, border:`1px solid ${isOpen ? "rgba(212,175,55,.35)" : "rgba(212,175,55,.14)"}`,
                background: isOpen ? "rgba(212,175,55,.06)" : "rgba(212,175,55,.03)",
                overflow:"hidden", transition:"border-color .2s, background .2s" }}>
                <button onClick={() => setOpen(isOpen ? null : i)}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16,
                    padding:"20px 24px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                  <span style={{ fontSize:"clamp(14px,1.6vw,17px)", fontWeight:700, color:"#fff", lineHeight:1.4 }}>{faq.q}</span>
                  <div style={{ width:28, height:28, borderRadius:"50%",
                    background: isOpen ? "rgba(212,175,55,.2)" : "rgba(212,175,55,.08)",
                    border:`1px solid ${isOpen ? "rgba(212,175,55,.5)" : "rgba(212,175,55,.2)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                    transition:"all .2s", transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1V11M1 6H11" stroke={GL} strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                </button>
                {isOpen && (
                  <div style={{ padding:"0 24px 22px" }}>
                    <div style={{ height:1, background:"rgba(212,175,55,.12)", marginBottom:16 }}/>
                    <p style={{ fontSize:14, lineHeight:1.8, color:"rgba(255,255,255,.55)", margin:0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function SportsInnerCircleLandingPage() {
  const founderCards = [
    {
      name: "Justin Riddle", 
      role: "CEO",
      image: justinImg,
      phone: "248-500-8989",
    },
    {
      name: "Nick Kinek", 
      role: "Founder",
      image: nickImg,
      phone: "724-448-0889",
    },
  ];
  
  // Privacy Policy only (Refund Policy removed)
  const footerLinks = [
    { label: "Privacy Policy", href: "/privacyPolicy" },
  ];

  const G = "#D4AF37";
  const GL = "#F2D060";

  /* Count-up refs */
  const [heroStatRef1, heroStat1] = useCountUp(100, 1800, (v) => `${v}%`, 400);
  const [heroStatRef2, heroStat2] = useCountUp(48, 2200, (v) => `$${(v / 10).toFixed(1)}M+`, 200);
  const [bizProfitRef, bizProfitVal] = useCountUp(48, 2200, (v) => `$${(v / 10).toFixed(1)}M+`, 0);
  const [clientCountRef, clientCountVal] = useCountUp(50, 1800, (v) => `${v}+`, 0);

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "#07070A", color: "#fff", fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        a { text-decoration: none; }

        @keyframes rise0 { 0%{opacity:0;transform:translateY(30px);filter:blur(8px)} 100%{opacity:1;transform:none;filter:none} }
        @keyframes rise1 { 0%,18%{opacity:0;transform:translateY(24px);filter:blur(6px)} 100%{opacity:1;transform:none;filter:none} }
        @keyframes rise2 { 0%,34%{opacity:0;transform:translateY(18px);filter:blur(4px)} 100%{opacity:1;transform:none;filter:none} }
        @keyframes rise3 { 0%,50%{opacity:0;transform:translateY(12px);filter:blur(3px)} 100%{opacity:1;transform:none;filter:none} }
        @keyframes goldBtn { 0%,100%{box-shadow:0 6px 28px rgba(212,175,55,.32)} 50%{box-shadow:0 10px 48px rgba(212,175,55,.56),0 0 0 5px rgba(212,175,55,.07)} }
        @keyframes badgePop { 0%,100%{transform:translateY(0);box-shadow:0 0 14px rgba(212,175,55,.1)} 50%{transform:translateY(-2px);box-shadow:0 0 28px rgba(212,175,55,.24)} }
        @keyframes shimG { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes drift { 0%{transform:translateY(0) translateX(0);opacity:.4} 33%{transform:translateY(-16px) translateX(7px);opacity:.8} 66%{transform:translateY(-5px) translateX(-5px);opacity:.5} 100%{transform:translateY(0) translateX(0);opacity:.4} }
        @keyframes breathe { 0%,100%{border-color:rgba(212,175,55,.18)} 50%{border-color:rgba(212,175,55,.42)} }
        @keyframes greenGl { 0%,100%{box-shadow:0 0 18px rgba(16,185,129,.08)} 50%{box-shadow:0 0 34px rgba(16,185,129,.22)} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes pulseGreen { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)} 50%{box-shadow:0 0 0 6px rgba(16,185,129,0)} }
        
        /* FOMO animations - reduced flash frequency (5x slower) */
        @keyframes redFlash { 0%,100%{background:rgba(255,50,50,0)} 50%{background:rgba(255,50,50,0.08)} }
        @keyframes urgentPulse { 0%,100%{transform:scale(1);border-color:rgba(255,80,80,0.2)} 50%{transform:scale(1.01);border-color:rgba(255,80,80,0.4);box-shadow:0 0 12px rgba(255,50,50,0.15)} }
        @keyframes countdownGlow { 0%,100%{text-shadow:0 0 0px rgba(255,80,80,0)} 50%{text-shadow:0 0 4px rgba(255,80,80,0.3)} }
        
        .fomo-box { animation: redFlash 6s ease-in-out infinite, urgentPulse 7.5s ease-in-out infinite; }
        .fomo-text { animation: countdownGlow 4s ease-in-out infinite; }

        .r0{animation:rise0 1.1s cubic-bezier(.16,1,.3,1) both}
        .r1{animation:rise1 1.4s cubic-bezier(.16,1,.3,1) both}
        .r2{animation:rise2 1.6s cubic-bezier(.16,1,.3,1) both}
        .r3{animation:rise3 1.8s cubic-bezier(.16,1,.3,1) both}
        .gbtn{animation:goldBtn 2.8s ease-in-out infinite}
        .bdg{animation:badgePop 2.6s ease-in-out infinite}
        .brt{animation:breathe 3s ease-in-out infinite}
        .gg{animation:greenGl 3s ease-in-out infinite}

        .gsh{
          background:linear-gradient(90deg,#fff 0%,#F2D060 40%,#fff 60%,#F2D060 100%);
          background-size:200% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text;animation:shimG 4.5s linear infinite;
        }

        .grid-bg{
          background-image:linear-gradient(rgba(212,175,55,.045) 1px,transparent 1px),
            linear-gradient(90deg,rgba(212,175,55,.045) 1px,transparent 1px);
          background-size:64px 64px;
        }

        .pt{position:absolute;width:2px;height:2px;border-radius:50%;background:rgba(212,175,55,.55)}
        .pt1{top:12%;left:6%;animation:drift 7s ease-in-out infinite}
        .pt2{top:25%;left:88%;animation:drift 9s ease-in-out infinite 1.2s}
        .pt3{top:58%;left:10%;animation:drift 8s ease-in-out infinite 2.1s}
        .pt4{top:80%;left:78%;animation:drift 6s ease-in-out infinite .6s}
        .pt5{top:42%;left:96%;animation:drift 11s ease-in-out infinite 3s}
        .pt6{top:92%;left:52%;animation:drift 7s ease-in-out infinite 1.7s}

        .tkr{display:flex;white-space:nowrap;animation:ticker 30s linear infinite}

        .sdiv{height:1px;max-width:560px;margin:32px auto;background:linear-gradient(90deg,transparent,rgba(212,175,55,.28),transparent)}

        .cg{
          background:linear-gradient(135deg,rgba(14,12,8,.98),rgba(10,10,14,.98));
          border:1px solid rgba(212,175,55,.14);
          box-shadow:0 0 0 1px rgba(255,255,255,.015),0 28px 90px rgba(0,0,0,.65);
        }
        .tg{background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.28);color:#F2D060}
        .nc{background:linear-gradient(135deg,rgba(14,10,10,.97),rgba(12,8,10,.97));border:1px solid rgba(200,50,50,.18)}
        .yc{background:linear-gradient(135deg,rgba(10,14,12,.97),rgba(8,12,14,.97));border:1px solid rgba(16,185,129,.2)}
        .contact-btn{transition:all 0.2s ease;}

        .who-item { transition: none; }
        @media (max-width: 600px) {
          .hero-inner { padding-top: 36px !important; padding-bottom: 28px !important; }
        }
      `}</style>

      {/* Ambient */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
        <div className="grid-bg" style={{ position:"absolute", inset:0 }} />
        <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:900, height:550, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(212,175,55,.055) 0%,transparent 70%)" }} />
        <div className="pt pt1"/><div className="pt pt2"/><div className="pt pt3"/>
        <div className="pt pt4"/><div className="pt pt5"/><div className="pt pt6"/>
      </div>

      {/* Ticker */}
      <div style={{ position:"relative", zIndex:2, borderBottom:"1px solid rgba(212,175,55,.1)", background:"rgba(0,0,0,.88)", padding:"7px 0", overflow:"hidden" }}>
        <div className="tkr">
          {[0,1].map(k=>(
            <span key={k} style={{ fontFamily:"'Courier New',monospace", fontSize:11, color:"rgba(212,175,55,.5)", letterSpacing:".05em", paddingRight:40 }}>
              NCAAB: Clemson ML (-115) W | NBA: Hawks ML (-141) W | NBA: Hornets -4 (-135) W | NBA: Lakers +1.5 (-110) W | NCAAB: South Florida +6 (-110) W | NCAAB: Illinois -25.5 (-152) W | NHL: Senators ML (-125) W | NCAAB: Utah State ML (-110) W | NBA: Magic +4.5 (-130) W | NCAAB: Iowa +11 (-145) W | NBA: Suns +7 (-135) W | NBA: Pacers +9.5 (-130) W | MLB: Cubs F5 -0.5 (-145) W | MLB: Mets ML (-145) W | NBA: Blazers +6 (-145) W | MLB: Cubs vs Guardians U7.5 (-110) W | NBA: OKC -7 (-130) W | MLB: Royals ML (-172) W | NBA: Heat -8.5 (-133) W | MLB: Red Sox ML (-120) W | NBA: 76ers ML (-125) W | NBA: Kings ML (-167) W | NFL: Bengals ML (-135) W | NFL: CLE vs BAL O41.5 (-111) W | NBA: 76ers +7.5 (-115) W &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>

      <main style={{ position:"relative", zIndex:1, maxWidth:1600, margin:"0 auto", padding:"20px 16px 64px" }}>

        {/* HERO */}
        <section>
          <div className="cg" style={{ borderRadius:36, overflow:"hidden" }}>
            <div className="hero-inner" style={{ position:"relative", textAlign:"center", padding:"56px 24px 48px", maxWidth:860, margin:"0 auto" }}>

              <div className="r0" style={{ marginBottom:22, display:"flex", justifyContent:"center" }}>
                <div style={{
                  width:120, height:120, borderRadius:24,
                  background:"#000000",
                  border:"1px solid rgba(212,175,55,.25)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:"0 0 40px rgba(212,175,55,.2), 0 0 80px rgba(212,175,55,.08)"
                }}>
                  <img src={logoImg} alt="Sports Inner Circle"
                    style={{ height:80, width:80, objectFit:"contain", display:"block" }} />
                </div>
              </div>

              <div className="r1 bdg" style={{
                display:"inline-flex", alignItems:"center", gap:8, borderRadius:999,
                border:"1px solid rgba(212,175,55,.32)", background:"rgba(212,175,55,.08)",
                padding:"7px 20px", marginBottom:20,
                fontSize:11, fontWeight:800, letterSpacing:".22em", color:GL, textTransform:"uppercase"
              }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:GL, boxShadow:`0 0 8px ${G}` }}/>
                Exclusive Access Only
              </div>

              <h1 className="r1" style={{ fontSize:"clamp(38px,6.5vw,80px)", fontWeight:900, lineHeight:.92, textTransform:"uppercase", letterSpacing:"-.03em", color:"#fff", margin:"0 0 14px" }}>
                Welcome To The<br/><span className="gsh">Inner Circle</span>
              </h1>

              {/* Stat pills */}
              <div className="r2" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, maxWidth:620, margin:"0 auto 32px" }}>
                <div ref={heroStatRef1} style={{ borderRadius:16, border:"1px solid rgba(212,175,55,.2)", background:"rgba(212,175,55,.05)", padding:"14px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:"clamp(15px,2.2vw,24px)", fontWeight:900, color:GL, lineHeight:1 }}>{heroStat1}</div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"rgba(255,255,255,.32)", marginTop:5 }}>Transparent Data</div>
                </div>
                <div style={{ borderRadius:16, border:"1px solid rgba(212,175,55,.2)", background:"rgba(212,175,55,.05)", padding:"14px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:"clamp(15px,2.2vw,24px)", fontWeight:900, color:GL, lineHeight:1 }}>All Tracked</div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"rgba(255,255,255,.32)", marginTop:5 }}>Every Pick Logged</div>
                </div>
                <div ref={heroStatRef2} style={{ borderRadius:16, border:"1px solid rgba(212,175,55,.2)", background:"rgba(212,175,55,.05)", padding:"14px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:"clamp(15px,2.2vw,24px)", fontWeight:900, color:GL, lineHeight:1 }}>{heroStat2}</div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"rgba(255,255,255,.32)", marginTop:5 }}>Client Profit</div>
                </div>
              </div>

              {/* CTA - View Our Record button */}
              <div className="r3">
                <a href="https://www.sportscapitalmetrics.com/tracker.html" className="gbtn" target="_blank" rel="noopener noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:10, borderRadius:999,
                    background:`linear-gradient(135deg,${GL},${G})`,
                    padding:"0 44px", height:60, fontSize:14, fontWeight:900,
                    textTransform:"uppercase", letterSpacing:".1em", color:"#FFFFFF" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 13L6.5 8.5L10 12L16 5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  View Our Record
                </a>
                {/* UPDATED: Changed text to "Start profiting from sports betting" */}
                <p style={{ marginTop:10, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".15em", color:"rgba(212,175,55,.32)" }}>
                  Start profiting from sports betting
                </p>
              </div>
            </div>

            {/* Live Graph Panel */}
            <div style={{ padding:"0 16px 16px" }}>
              <div style={{ borderRadius:22, overflow:"hidden", background:"rgba(5,7,9,.96)", border:"1px solid rgba(16,185,129,.18)", boxShadow:"0 0 40px rgba(16,185,129,.06)", padding:"14px 6px 8px" }}>
                <div style={{ paddingLeft:14, marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.85)" }}>Profit Trajectory</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.32)", marginTop:2 }}>Cumulative unit growth</div>
                </div>
                <div style={{ position:"relative", width:"100%", aspectRatio:"3/1", minHeight:140, maxHeight:320 }}>
                  <LiveGraph />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="sdiv"/>

        {/* COMPOUND GROWTH — $10K → $250K+ */}
        <section>
          <div className="cg" style={{ borderRadius:36, overflow:"hidden", padding:"60px 24px 52px", position:"relative" }}>
            {/* Ambient glow */}
            <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 70% 60% at 50% 40%, rgba(16,185,129,.055) 0%, transparent 70%)" }}/>

            <div style={{ position:"relative", textAlign:"center", marginBottom:48 }}>
              <h2 style={{ fontSize:"clamp(30px,5.5vw,68px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-.03em", color:"#fff", margin:"0 0 10px", lineHeight:.95 }}>
                If You Invested <span style={{ color:GL }}>$10K</span><br/>With Our System
              </h2>
              <p style={{ fontSize:"clamp(15px,1.8vw,22px)", fontWeight:700, color:"rgba(255,255,255,.5)", margin:"12px 0 0" }}>
                In 16 months, that would have grown to <span style={{ color:"#10b981", fontWeight:900 }}>$250,000+</span>
              </p>
            </div>

            {/* Live compound table */}
            <CompoundGrowthChart G={G} GL={GL} />

            {/* Disclaimer */}
            <p style={{ textAlign:"center", fontSize:11, color:"rgba(255,255,255,.28)", marginTop:14, letterSpacing:".04em" }}>
              Past performance does not guarantee future results.
            </p>
          </div>
        </section>

        <div className="sdiv"/>

        {/* HOW TO WORK WITH US + APPLY */}
        <section id="apply">
          <div className="cg" style={{ borderRadius:36, overflow:"hidden", padding:"60px 24px 56px", position:"relative",
            boxShadow:"0 0 80px rgba(212,175,55,.04), 0 28px 90px rgba(0,0,0,.65)" }}>
            <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,175,55,.035) 0%, transparent 70%)" }}/>

            <div style={{ position:"relative", textAlign:"center", marginBottom:48 }}>
              <h2 style={{ fontSize:"clamp(30px,5.5vw,68px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-.03em", color:"#fff", margin:"0 0 12px", lineHeight:.95 }}>
                See If You Qualify<br/><span style={{ color:GL }}>To Work With Us</span>
              </h2>
              <p style={{ fontSize:"clamp(14px,1.6vw,18px)", fontWeight:700, color:"rgba(255,255,255,.5)", margin:0 }}>
                Not everyone gets in. Apply and find out.
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:22, maxWidth:900, margin:"0 auto" }}>
              {/* Option 1 */}
              <div className="yc" style={{ borderRadius:28, padding:"34px 28px", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, marginTop:0 }}>
                  <div style={{ width:46, height:46, borderRadius:14, background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.28)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3L19 7V11C19 15.4 15.5 19.4 11 20.5C6.5 19.4 3 15.4 3 11V7L11 3Z" stroke="#10b981" strokeWidth="1.6" fill="none" strokeLinejoin="round"/><path d="M8 11L10.5 13.5L14.5 8.5" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".14em", color:"#10b981", marginBottom:3 }}>Self-Run Access</div>
                    <h3 style={{ fontSize:"clamp(20px,2.4vw,26px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-.02em", color:"#fff", margin:0 }}>Do It Yourself</h3>
                  </div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"rgba(255,255,255,.4)", marginBottom:12 }}>This Is For You If...</div>
                {[
                  "You want to follow the same picks we use",
                  "You're okay placing bets yourself",
                  "You like having full control over everything",
                ].map((item,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:11, borderRadius:12, border:"1px solid rgba(16,185,129,.14)", background:"rgba(16,185,129,.04)", padding:"10px 13px", marginBottom:8 }}>
                    <div style={{ width:18, height:18, borderRadius:"50%", background:"rgba(16,185,129,.18)", border:"1px solid rgba(16,185,129,.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p style={{ fontSize:13, lineHeight:1.6, color:"rgba(255,255,255,.65)", margin:0 }}>{item}</p>
                  </div>
                ))}
                <div style={{ marginTop:"auto", paddingTop:20 }}>
                  <a href="/application" className="gbtn"
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, borderRadius:999,
                      background:`linear-gradient(135deg,${GL},${G},#b8860b)`,
                      height:52, fontSize:13, fontWeight:900,
                      textTransform:"uppercase", letterSpacing:".1em", color:"#fff",
                      boxShadow:`0 8px 32px rgba(212,175,55,.35)` }}>
                    See If You Qualify
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5H12.5M12.5 7.5L8.5 3.5M12.5 7.5L8.5 11.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                  <p style={{ marginTop:10, fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:".16em", color:"rgba(212,175,55,.4)", textAlign:"center", margin:"10px 0 0" }}>
                    Once It's Full, It's Full
                  </p>
                </div>
              </div>

              {/* Option 2 */}
              <div style={{ borderRadius:28, padding:"34px 28px", position:"relative", overflow:"hidden",
                background:"linear-gradient(135deg,rgba(20,14,4,.98),rgba(14,12,8,.98))",
                border:"2px solid rgba(212,175,55,.35)",
                boxShadow:"0 0 50px rgba(212,175,55,.08), 0 28px 80px rgba(0,0,0,.6)",
                display:"flex", flexDirection:"column" }}>
                <div style={{ position:"absolute", top:0, right:0, display:"inline-flex", alignItems:"center", gap:5, background:`linear-gradient(135deg,${GL},${G})`, color:"#fff", fontSize:9, fontWeight:900, textTransform:"uppercase", letterSpacing:".18em", padding:"6px 16px 6px 20px", borderBottomLeftRadius:16 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"rgba(0,0,0,.35)" }}/>
                  Invite Only
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, marginTop:0 }}>
                  <div style={{ width:46, height:46, borderRadius:14, background:"rgba(212,175,55,.1)", border:"1px solid rgba(212,175,55,.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2L13.5 8H20L14.8 11.9L17 18L11 14.3L5 18L7.2 11.9L2 8H8.5L11 2Z" fill={GL} opacity=".85"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".14em", color:GL, marginBottom:3 }}>Private Client</div>
                    <h3 style={{ fontSize:"clamp(20px,2.4vw,26px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-.02em", color:"#fff", margin:0 }}>Done For You</h3>
                  </div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"rgba(255,255,255,.4)", marginBottom:12 }}>This Is For You If...</div>
                {[
                  "You want everything handled for you",
                  "You don't have time to place bets",
                  "You want a simple, hands-off setup",
                ].map((item,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:11, borderRadius:12, border:"1px solid rgba(212,175,55,.15)", background:"rgba(212,175,55,.04)", padding:"10px 13px", marginBottom:8 }}>
                    <div style={{ width:18, height:18, borderRadius:"50%", background:"rgba(212,175,55,.14)", border:"1px solid rgba(212,175,55,.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke={GL} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p style={{ fontSize:13, lineHeight:1.6, color:"rgba(255,255,255,.65)", margin:0 }}>{item}</p>
                  </div>
                ))}
                <div style={{ marginTop:"auto", paddingTop:20 }}>
                  <a href="/application" className="gbtn"
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, borderRadius:999,
                      background:`linear-gradient(135deg,${GL},${G},#b8860b)`,
                      height:52, fontSize:13, fontWeight:900,
                      textTransform:"uppercase", letterSpacing:".1em", color:"#fff",
                      boxShadow:`0 8px 32px rgba(212,175,55,.4)` }}>
                    See If You Qualify
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5H12.5M12.5 7.5L8.5 3.5M12.5 7.5L8.5 11.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                  <p style={{ marginTop:10, fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:".16em", color:"rgba(212,175,55,.4)", textAlign:"center", margin:"10px 0 0" }}>
                    Once It's Full, It's Full
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className="sdiv"/>

        {/* WHO IS THIS FOR */}
        <section>
          <div className="cg" style={{ borderRadius:36, overflow:"hidden", padding:"52px 24px", position:"relative" }}>
            <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", opacity:.04 }}>
              {["+2.50","-1.00","+1.75","+3.00","-0.50","+4.25","+1.10"].map((v,i)=>(
                <div key={i} style={{ position:"absolute", top:`${(i*14+5)%90}%`, left:`${(i*19+4)%92}%`,
                  fontFamily:"'Courier New',monospace", fontSize:11, color:"rgba(212,175,55,1)",
                  animation:`drift ${6+i}s ease-in-out infinite ${i*.5}s` }}>{v}</div>
              ))}
            </div>
            <div style={{ position:"relative", textAlign:"center", marginBottom:44 }}>
              <div className="bdg" style={{ display:"inline-flex", alignItems:"center", gap:6, borderRadius:999,
                border:"1px solid rgba(212,175,55,.25)", background:"rgba(212,175,55,.07)",
                padding:"7px 18px", marginBottom:14,
                fontSize:11, fontWeight:700, letterSpacing:".22em", color:GL, textTransform:"uppercase" }}>
                Know Your Fit
              </div>
              <h2 style={{ fontSize:"clamp(30px,5vw,62px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-.03em", color:"#fff", margin:0 }}>
                <span style={{ color:GL }}>Who</span> Is This For
              </h2>
              <div style={{ width:72, height:2, borderRadius:99, background:`linear-gradient(90deg,transparent,${G},transparent)`, margin:"12px auto 0" }}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:18, maxWidth:940, margin:"0 auto" }}>
              <div className="nc" style={{ borderRadius:28, padding:"26px 22px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(200,50,50,.14)", border:"1px solid rgba(200,50,50,.28)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10.5 2.5L2.5 10.5M2.5 2.5L10.5 10.5" stroke="#f87171" strokeWidth="1.7" strokeLinecap="round"/></svg>
                  </div>
                  <h3 style={{ fontSize:12, fontWeight:800, textTransform:"uppercase", letterSpacing:".06em", color:"#fff", margin:0 }}>This Is Not For You If...</h3>
                </div>
                {[
                  "You're looking for guaranteed locks, magic picks, or overnight wins.",
                  "You chase parlays, bet emotionally, or can't stick to a plan.",
                  "You want shortcuts instead of discipline and structure.",
                  "You're not willing to manage risk, control your bankroll, or think long-term.",
                ].map((item,i)=>(
                  <div key={i} className="who-item" style={{ display:"flex", alignItems:"flex-start", gap:11, borderRadius:13, border:"1px solid rgba(200,50,50,.11)", background:"rgba(200,50,50,.04)", padding:"10px 13px", marginBottom:7 }}>
                    <div style={{ width:17, height:17, borderRadius:"50%", background:"rgba(200,50,50,.16)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M5.5 1.5L1.5 5.5M1.5 1.5L5.5 5.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    </div>
                    <p style={{ fontSize:13, lineHeight:1.65, color:"rgba(255,255,255,.6)", margin:0 }}>{item}</p>
                  </div>
                ))}
              </div>
              <div className="yc gg" style={{ borderRadius:28, padding:"26px 22px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.28)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5 9.5L11 4" stroke="#10b981" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <h3 style={{ fontSize:12, fontWeight:800, textTransform:"uppercase", letterSpacing:".06em", color:"#fff", margin:0 }}>This Is For...</h3>
                </div>
                <div style={{ width:52, height:2, borderRadius:99, background:"rgba(16,185,129,.45)", marginBottom:16 }}/>
                {[
                  { t: "Investors who are tired of guessing and want a ", b: "structured, repeatable system." },
                  { t: "Individuals looking to ", b: "diversify their portfolios,", a: " without relying solely on traditional markets." },
                  { t: "Serious capital allocators who value ", b: "risk management and long-term consistency." },
                  { t: "Those seeking to ", b: "outperform traditional assets", a: " like stocks, real estate, and crypto." },
                ].map((item,i)=>(
                  <div key={i} className="who-item" style={{ display:"flex", alignItems:"flex-start", gap:11, borderRadius:13, border:"1px solid rgba(16,185,129,.1)", background:"rgba(16,185,129,.04)", padding:"10px 13px", marginBottom:7 }}>
                    <div style={{ width:17, height:17, borderRadius:"50%", background:"rgba(16,185,129,.17)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1.5 3.5L3 5L5.5 2" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p style={{ fontSize:13, lineHeight:1.65, color:"rgba(255,255,255,.6)", margin:0 }}>
                      {item.t}<strong style={{ color:"#fff", fontWeight:700 }}>{item.b}</strong>{item.a||""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="sdiv"/>

        {/* TEAM */}
        <section>
          <div style={{ textAlign:"center", marginBottom:34 }}>
            <div style={{ display:"inline-flex", borderRadius:999, border:"1px solid rgba(212,175,55,.22)", background:"rgba(212,175,55,.07)", padding:"7px 18px", fontSize:11, fontWeight:700, letterSpacing:".22em", color:GL, textTransform:"uppercase", marginBottom:14 }}>Founders</div>
            <h3 style={{ fontSize:"clamp(26px,4vw,50px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-.03em", color:"#fff", margin:0 }}>Meet The Team</h3>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:24 }}>
            {founderCards.map(f=>(
              <div key={f.name} className="cg" style={{ borderRadius:30, overflow:"hidden", display:"flex", flexDirection:"column" }}>
                <div style={{ overflow:"hidden", background:"#0a0a0e" }}>
                  <img src={f.image} alt={f.name}
                    style={{ width:"100%", height:"auto", display:"block",
                      objectFit:"contain", transition:"transform .7s" }}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
                </div>
                <div style={{ padding:"26px 26px 30px", flex:1, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
                  <div className="tg" style={{ display:"inline-flex", borderRadius:999, padding:"4px 12px", fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".18em" }}>{f.role}</div>
                  <h4 style={{ fontSize:"clamp(19px,2.2vw,26px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-.02em", color:"#fff", margin:"12px 0 16px" }}>{f.name}</h4>
                  
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:20, fontWeight:700, color:"#ffffff", letterSpacing:".02em", fontFamily:"'Courier New',monospace" }}>
                      {f.phone}
                    </div>
                  </div>
                  
                  <a href={`tel:${f.phone}`}
                    className="contact-btn"
                    style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:10, borderRadius:999,
                      background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.35)",
                      padding:"12px 24px", fontSize:13, fontWeight:700,
                      textTransform:"uppercase", letterSpacing:".05em", color:"#10b981",
                      transition:"all 0.2s ease", cursor:"pointer", width:"auto" }}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(16,185,129,.22)"; e.currentTarget.style.borderColor="rgba(16,185,129,.6)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(16,185,129,.12)"; e.currentTarget.style.borderColor="rgba(16,185,129,.35)";}}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 1.5L4.5 1.5L5.5 4L4 5.5C4.5 7 6 8.5 7.5 9L9 7.5L11.5 8.5V10.5C11.5 11.5 10.5 12.5 9.5 12.5C6 12.5 2 9.5 2 5.5C2 4.5 2.5 1.5 2.5 1.5Z" stroke="#10b981" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                    </svg>
                    Text or Call {f.name.split(' ')[0]}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="sdiv"/>

        {/* BUSINESS HISTORY */}
        <section>
          <div className="cg" style={{ borderRadius:34, padding:"46px 24px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:36 }}>
              <div>
                <div style={{ display:"inline-flex", borderRadius:999, border:"1px solid rgba(212,175,55,.22)", background:"rgba(212,175,55,.07)", padding:"7px 18px", fontSize:11, fontWeight:700, letterSpacing:".22em", color:GL, textTransform:"uppercase", marginBottom:18 }}>Our History</div>
                <h3 style={{ fontSize:"clamp(22px,3vw,46px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-.03em", color:"#fff", margin:"0 0 14px" }}>
                  Built Around Performance And Selective Access
                </h3>
                <p style={{ fontSize:14, lineHeight:1.8, color:"rgba(255,255,255,.45)", whiteSpace:"pre-line" }}>
                  Like most people, we started with betting the usual way, following handicappers, chasing "picks of the day", and trusting systems that never held up long term. After years of inconsistency and losses, it became clear the problem wasn't effort, it was the lack of a real, structured edge.

                  That led to building our own system from the ground up. One focused entirely on data, discipline, and long-term viability. Since January 2025, that system has consistently performed at a high level, generating significant returns for us and our clients.

                  Today, Sports Inner Circle remains intentionally selective, to protect what actually matters, the ability for it to continue working years into the future.
                </p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div ref={bizProfitRef} style={{ borderRadius:22, border:"1px solid rgba(212,175,55,.22)", background:"rgba(212,175,55,.055)", padding:"22px" }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".16em", color:GL }}>Client Profit Generated</div>
                  <div style={{ fontSize:"clamp(38px,4.5vw,58px)", fontWeight:900, letterSpacing:"-.04em", color:"#fff", lineHeight:1.1, margin:"8px 0 6px" }}>
                    {bizProfitVal}
                  </div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.42)", lineHeight:1.65 }}>Generated across client relationships through disciplined execution and a premium, selective model.</div>
                </div>
                
                {/* FOMO Availability Section - REMOVED "URGENT — LIMITED AVAILABILITY" text line */}
                <div className="fomo-box" style={{ 
                  borderRadius:22, 
                  border:"2px solid rgba(255,80,80,0.4)", 
                  background:"linear-gradient(135deg, rgba(80,20,20,0.95), rgba(60,15,15,0.95))",
                  padding:"28px 22px",
                  position:"relative",
                  overflow:"hidden"
                }}>
                  <div style={{
                    position:"absolute",
                    top:0,
                    left:0,
                    right:0,
                    bottom:0,
                    background:"radial-gradient(circle, rgba(255,50,50,0.04) 0%, transparent 70%)",
                    pointerEvents:"none"
                  }} />
                  
                  {/* REMOVED: The "URGENT — LIMITED AVAILABILITY" text line */}
                  
                  <div className="fomo-text" style={{ fontSize:36, fontWeight:900, textTransform:"uppercase", letterSpacing:"-.02em", color:"#ff4444", margin:"0 0 12px 0", textAlign:"center" }}>
                    EXTREMELY LIMITED
                  </div>
                  
                  <div style={{ fontSize:14, color:"rgba(255,255,255,.6)", lineHeight:1.65, textAlign:"center" }}>
                    We are intentionally keeping slots tight, which means not everyone who applies will be accepted.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="sdiv"/>

        {/* FAQ */}
        <FAQSection G={G} GL={GL} />

        {/* FOOTER */}
        <footer style={{ paddingTop:28 }}>
          <div className="cg" style={{ borderRadius:34 }}>
            <div style={{ padding:"52px 24px", textAlign:"center" }}>

              <div style={{ maxWidth:680, margin:"0 auto", fontSize:12, lineHeight:1.8, color:"rgba(255,255,255,.32)", textAlign:"center" }}>
                <p><span style={{ fontWeight:800, textTransform:"uppercase", color:"rgba(255,255,255,.55)" }}>Income and Earnings Disclaimer:</span> Sports Private Capital does not guarantee any specific financial results. All betting involves risk and you may lose money. Past performance and results shown from the program owner or members are not indicative of future results. Your results will vary based on your bankroll, discipline, bet sizing, and market conditions. Sports betting should only be done with money you can afford to lose. This is not financial or investment advice. Please gamble responsibly.</p>
                
                <div style={{ marginTop:28, display:"flex", justifyContent:"center", alignItems:"center", gap:24, flexWrap:"wrap" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{
                      width:72, height:72, borderRadius:18,
                      background:"#000000",
                      border:"1px solid rgba(212,175,55,.2)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow:"0 0 24px rgba(212,175,55,.15)"
                    }}>
                      <img src={logoImg} alt="Sports Inner Circle"
                        style={{ height:48, width:48, objectFit:"contain", display:"block" }}/>
                    </div>
                    
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", boxShadow:"0 0 6px #10b981" }} />
                      <div ref={clientCountRef} style={{ fontSize:"clamp(20px,3vw,28px)", fontWeight:900, color:"#10b981", lineHeight:1 }}>
                        {clientCountVal}
                      </div>
                      <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.6)", textTransform:"uppercase", letterSpacing:".05em" }}>
                        Profitable Clients
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy Policy Link */}
                <div style={{ marginTop:28, display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap" }}>
                  {footerLinks.map(l=>(
                    <a key={l.label} href={l.href}
                      style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.45)", transition:"color .2s" }}
                      onMouseEnter={e=>e.currentTarget.style.color=GL}
                      onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.45)"}>
                      {l.label}
                    </a>
                  ))}
                </div>

                <div style={{ marginTop:28, paddingTop:20, borderTop:"1px solid rgba(212,175,55,.1)", fontSize:11, color:"rgba(255,255,255,.25)", letterSpacing:".05em" }}>
                  © Sports Private Capital 2022
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}