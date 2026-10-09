"use client";

import { useEffect, useState } from "react";
import type { RiskReport } from "@/lib/report";
import { AGENT_LABEL } from "@/lib/report";
import { MARKETS, BRANDS } from "@/lib/mock";

type Phase = "idle" | "loading" | "done" | "error";

const HEADLINE: Record<string, { text: string; neg: boolean }> = {
  LOVE: { text: "Cleared for launch.", neg: false },
  RISKY: { text: "Proceed with caution.", neg: false },
  CANCEL: { text: "Do not launch.", neg: true },
};

export default function Home() {
  const [brand, setBrand] = useState("");
  const [homeMarket, setHomeMarket] = useState("new-york");
  const [targetMarket, setTargetMarket] = useState("riyadh");
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState("");
  const [brandLive, setBrandLive] = useState(false);
  const [marketLive, setMarketLive] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        setBrandLive(!!d.brandLive);
        setMarketLive(!!d.marketLive);
      })
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

  const headline = report ? HEADLINE[report.verdict] : null;
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();
  const provenance =
    brandLive && marketLive
      ? "live Qloo signals"
      : brandLive || marketLive
        ? "mixed: live + curated"
        : "mock cultural data";

  return (
    <div className="wrap">
      <header className="masthead">
        <div className="dateline">
          <span>Cultural-fit intelligence</span>
          <span>{today}</span>
        </div>
        <h1>
          fauxpas<span className="period">.</span>
        </h1>
        <p className="sub">
          Will a new market <strong>love your brand — or cancel it</strong>? We scan the
          cultural fit against the taste graph and file the full risk dossier,{" "}
          <em>before</em> you launch and embarrass yourself.
        </p>
      </header>

      <form className="new-assessment" onSubmit={runScan}>
        <h2>Open a new dossier</h2>
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
          {phase === "loading" ? "Compiling dossier…" : "File the dossier"}
        </button>
        <p className="form-note">
          Takes about two seconds. No signup, no mercy. Data: {provenance}.
        </p>
      </form>

      {phase === "idle" && (
        <div className="empty">
          No dossier on file yet.
          <br />
          Try <strong>Heineken → Riyadh</strong> if you want to watch something burn.
        </div>
      )}

      {phase === "loading" && (
        <div className="skeleton">
          <div className="sk" style={{ height: 60 }} />
          <div className="sk" style={{ height: 24, width: "55%" }} />
          <div className="sk" style={{ height: 110 }} />
          <div className="sk" style={{ height: 24, width: "75%" }} />
        </div>
      )}

      {phase === "error" && <div className="error-box">{error}</div>}

      {phase === "done" && report && headline && (
        <article className="dossier">
          <div className="kicker">
            <span>
              Risk assessment · {report.brandName} → {report.targetMarket}
            </span>
            <span className="file-no">Nº {report.score.toString().padStart(3, "0")}</span>
          </div>

          <h2 className="verdict">
            {headline.neg ? (
              <span className="neg">{headline.text}</span>
            ) : (
              headline.text
            )}
          </h2>

          <div className="score-line">
            <span className="num">
              {report.score}
              <small>/100</small>
            </span>
            <span className="cap">Fit score · {report.verdict}</span>
          </div>

          <p className="standfirst">{report.narrative}</p>

          <dl className="facts">
            <div className="fact">
              <dt>Subject</dt>
              <dd>
                <strong>{report.brandName}</strong> · {report.brandCategory} — {report.brandBlurb}
              </dd>
            </div>
            <div className="fact">
              <dt>Target</dt>
              <dd>
                <strong>{report.targetMarket}</strong> — {report.targetBlurb}
              </dd>
            </div>
            <div className="fact">
              <dt>Signal</dt>
              <dd>
                Brand profile:{" "}
                <strong>{report.brandLive ? "live Qloo taste graph" : "curated profile"}</strong>
                {" · "}Market vector:{" "}
                <strong>{report.marketLive ? "live Qloo venue signal" : "curated priors"}</strong>
              </dd>
            </div>
          </dl>

          {report.tabooHits.length > 0 && (
            <div className="section">
              <h3>
                <span className="sec-no">01</span>Third rails
              </h3>
              {report.tabooHits.map((t) => (
                <div className="rail" key={t.tabooId}>
                  <div className="rail-label">
                    {t.label}
                    <span className="sens">sensitivity {t.sensitivity}/100</span>
                  </div>
                  <div className="rail-detail">{t.detail}</div>
                </div>
              ))}
            </div>
          )}

          <div className="section">
            <h3>
              <span className="sec-no">{report.tabooHits.length > 0 ? "02" : "01"}</span>
              Fault lines — brand vs market
            </h3>
            {report.gaps.slice(0, 4).map((g) => (
              <div className="fault" key={g.domain}>
                <div className="fault-head">
                  <span className="domain">{g.label}</span>
                  <span className="nums">
                    {g.brand} / {g.market}
                  </span>
                </div>
                <div className="bars">
                  <div className="bar-row">
                    <span className="who">Brand</span>
                    <div className="track">
                      <div className="fill brand" style={{ width: `${g.brand}%` }} />
                    </div>
                  </div>
                  <div className="bar-row">
                    <span className="who">Market</span>
                    <div className="track">
                      <div className="fill market" style={{ width: `${g.market}%` }} />
                    </div>
                  </div>
                </div>
                {Math.abs(g.gap) >= 22 && (
                  <div className={`note${g.direction === "clash" ? " clash" : ""}`}>
                    {g.direction === "clash"
                      ? `The brand pushes ${Math.abs(g.gap)} points harder than the market wants.`
                      : `The market wants ${Math.abs(g.gap)} points more than the brand delivers.`}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="section">
            <h3>
              <span className="sec-no">{report.tabooHits.length > 0 ? "03" : "02"}</span>
              Recommended moves
            </h3>
            {report.moves.map((m, i) => (
              <div className="move" key={i}>
                <span className="n">{i + 1}.</span>
                <p>{m}</p>
              </div>
            ))}
          </div>

          {report.objections.length > 0 && (
            <div className="section dissent">
              <h3>
                <span className="sec-no">✕</span>
                The dissent — filed by the Red Team
              </h3>
              <p className="dissent-lede">
                Three agents built the case for this launch. The fourth tried to kill it.
              </p>
              {report.objections.map((o, i) => (
                <div className="objection" key={i}>
                  <span className="n">{i + 1}.</span>
                  <p>{o}</p>
                </div>
              ))}
            </div>
          )}

          {report.trace.length > 0 && (
            <div className="section ledger">
              <h3>
                <span className="sec-no">§</span>
                Compilation ledger
              </h3>
              {report.trace.map((s, i) => (
                <div className="ledger-row" key={i}>
                  <span className="ledger-agent">{AGENT_LABEL[s.agent]}</span>
                  <span className="ledger-detail">{s.detail}</span>
                  <span className="ledger-ms">{s.ms}ms</span>
                </div>
              ))}
            </div>
          )}

          <div className="colophon">
            Dossier compiled {today.toLowerCase()} · {report.brandName} × {report.targetMarket} ·
            verdicts are guidance, not gospel.
          </div>
        </article>
      )}

      <footer>
        fauxpas — built for the Qloo Agentic Hackathon. Cultural fit, quantified.
        <br />
        {brandLive && marketLive
          ? "Both sides of this dossier run on live Qloo signals."
          : "Taste affinities are illustrative mock data where the live graph is unavailable."}
      </footer>
    </div>
  );
}
