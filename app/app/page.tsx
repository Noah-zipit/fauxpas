"use client";

import { useEffect, useState } from "react";
import type { RiskReport } from "@/lib/report";
import { MARKETS, BRANDS } from "@/lib/mock";

type Phase = "idle" | "loading" | "done" | "error";

const VERDICT_COPY: Record<string, string> = {
  LOVE: "Cleared for launch",
  RISKY: "Proceed with caution",
  CANCEL: "Do not launch as-is",
};

export default function Home() {
  const [brand, setBrand] = useState("");
  const [homeMarket, setHomeMarket] = useState("new-york");
  const [targetMarket, setTargetMarket] = useState("riyadh");
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState("");
  const [mockMode, setMockMode] = useState(true);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setMockMode(!!d.mock))
      .catch(() => {});
  }, []);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (!brand.trim()) return;
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, homeMarket, targetMarket }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setReport(data);
      setPhase("done");
    } catch (err: any) {
      setError(err.message || "The scan hit a snag. Try again.");
      setPhase("error");
    }
  }

  const verdictClass = report ? report.verdict.toLowerCase() : "";
  const verdictColor =
    report?.verdict === "LOVE" ? "var(--love)" : report?.verdict === "RISKY" ? "var(--risky)" : "var(--cancel)";

  return (
    <div className="wrap">
      <p className="eyebrow">Cultural-fit intelligence</p>
      <h1 className="wordmark">
        fauxpas<span className="dot">.</span>
      </h1>
      <p className="tagline">
        Find out if a new market will <strong>love your brand — or cancel it</strong> —{" "}
        <em>before</em> you launch and embarrass yourself. We scan the cultural fit against the
        taste graph and hand you the full risk report.
      </p>
      <span className={`mode-pill${mockMode ? "" : " live"}`}>
        {mockMode ? "● mock data mode" : "● live qloo taste graph"}
      </span>

      <form className="card" onSubmit={runScan}>
        <div className="field">
          <label htmlFor="brand">Brand</label>
          <input
            id="brand"
            list="brand-suggestions"
            placeholder="e.g. McDonald's, Nike, Heineken…"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            autoComplete="off"
          />
          <datalist id="brand-suggestions">
            {BRANDS.map((b) => (
              <option key={b.id} value={b.name} />
            ))}
          </datalist>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="home">Home market</label>
            <select id="home" value={homeMarket} onChange={(e) => setHomeMarket(e.target.value)}>
              {MARKETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}, {m.country}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="target">Target market</label>
            <select id="target" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)}>
              {MARKETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}, {m.country}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="scan" type="submit" disabled={phase === "loading" || !brand.trim()}>
          {phase === "loading" ? "Scanning the culture…" : "Run the scan"}
        </button>
        <p className="hint">Takes about two seconds. No signup, no mercy.</p>
      </form>

      {phase === "idle" && (
        <div className="empty">
          Your risk report lands here.
          <br />
          Try <strong>Heineken → Riyadh</strong> if you want to watch something burn.
        </div>
      )}

      {phase === "loading" && (
        <div className="skeleton">
          <div className="sk" style={{ height: 72 }} />
          <div className="sk" style={{ height: 28, width: "60%" }} />
          <div className="sk" style={{ height: 90 }} />
          <div className="sk" style={{ height: 28, width: "80%" }} />
          <div className="sk" style={{ height: 120 }} />
        </div>
      )}

      {phase === "error" && <div className="error-box">{error}</div>}

      {phase === "done" && report && (
        <div className="report">
          <div className="stamp-row">
            <div className={`stamp ${verdictClass}`}>{report.verdict}</div>
            <div className="score-block">
              <div className="score-num">
                {report.score}
                <small>/100</small>
              </div>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${report.score}%`, background: verdictColor }}
                />
              </div>
              <div className="score-label">
                {VERDICT_COPY[report.verdict]} · {report.brandName} → {report.targetMarket}
              </div>
            </div>
          </div>

          <p className="narrative">{report.narrative}</p>

          {report.tabooHits.length > 0 && (
            <div className="section">
              <h2>Third rails</h2>
              {report.tabooHits.map((t) => (
                <div className="taboo" key={t.tabooId}>
                  <div className="t-label">
                    {t.label} — sensitivity {t.sensitivity}/100
                  </div>
                  <div className="t-detail">{t.detail}</div>
                </div>
              ))}
            </div>
          )}

          <div className="section">
            <h2>Fault lines — brand vs market</h2>
            <div className="legend">
              <span>
                <i className="b" /> brand
              </span>
              <span>
                <i className="m" /> market
              </span>
            </div>
            {report.gaps.slice(0, 4).map((g) => (
              <div className="gap" key={g.domain}>
                <div className="gap-top">
                  <span>{g.label}</span>
                  <span className="nums">
                    {g.brand} vs {g.market}
                  </span>
                </div>
                <div className="gap-bars">
                  <div className="gap-bar market" style={{ width: `${g.market}%` }} />
                  <div className="gap-bar brand" style={{ width: `${g.brand}%` }} />
                </div>
                {Math.abs(g.gap) >= 22 && (
                  <div className={`gap-note ${g.direction}`}>
                    {g.direction === "clash"
                      ? `The brand pushes ${Math.abs(g.gap)} points harder than the market wants.`
                      : `The market wants ${Math.abs(g.gap)} points more than the brand delivers.`}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="section">
            <h2>De-risking moves</h2>
            {report.moves.map((m, i) => (
              <div className="move" key={i}>
                <span className="n">{i + 1}</span>
                <span>{m}</span>
              </div>
            ))}
          </div>

          <div className="meta">
            <strong>{report.brandName}</strong> · {report.brandCategory} — {report.brandBlurb}
            <br />
            <strong>{report.targetMarket}</strong> — {report.targetBlurb}
            <br />
            {report.mock
              ? "Report generated from built-in mock cultural data. Set QLOO_API_KEY to query the live taste graph."
              : "Report generated from the live Qloo taste graph."}
          </div>
        </div>
      )}

      <footer>
        fauxpas — built for the Qloo Agentic Hackathon. Cultural fit, quantified.
        <br />
        Taste affinities {mockMode ? "are illustrative mock data" : "come from the Qloo taste graph"}; verdicts are guidance, not gospel.
      </footer>
    </div>
  );
}
