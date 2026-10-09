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

interface ExamTurn {
  q: string;
  a: string;
  tools: number;
}

interface VersusResult {
  a: RiskReport;
  b: RiskReport;
  winner: string | null;
  judgeNote: string;
}

export default function Home() {
  const [mode, setMode] = useState<"single" | "versus">("single");

  // single dossier
  const [brand, setBrand] = useState("");
  const [homeMarket, setHomeMarket] = useState("new-york");
  const [targetMarket, setTargetMarket] = useState("riyadh");
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState("");
  const [brandLive, setBrandLive] = useState(false);
  const [marketLive, setMarketLive] = useState(false);

  // versus
  const [brandA, setBrandA] = useState("");
  const [brandB, setBrandB] = useState("");
  const [vPhase, setVPhase] = useState<Phase>("idle");
  const [versus, setVersus] = useState<VersusResult | null>(null);
  const [vError, setVError] = useState("");

  // cross-examination
  const [examQ, setExamQ] = useState("");
  const [examLog, setExamLog] = useState<ExamTurn[]>([]);
  const [examBusy, setExamBusy] = useState(false);

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
    setExamLog([]);
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

  async function runVersus(e: React.FormEvent) {
    e.preventDefault();
    if (!brandA.trim() || !brandB.trim()) return;
    setVPhase("loading");
    setVError("");
    try {
      const res = await fetch("/api/versus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandA, brandB, targetMarket }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bout failed");
      setVersus(data);
      setVPhase("done");
    } catch (err: any) {
      setVError(err.message || "The bout fell apart. Try again.");
      setVPhase("error");
    }
  }

  async function askAnalyst(e: React.FormEvent) {
    e.preventDefault();
    if (!examQ.trim() || !report || examBusy) return;
    const q = examQ.trim();
    setExamQ("");
    setExamBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, report, history: examLog }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The analyst lost the thread.");
      setExamLog((log) => [...log, data]);
    } catch (err: any) {
      setExamLog((log) => [...log, { q, a: err.message || "The analyst lost the thread.", tools: 0 }]);
    } finally {
      setExamBusy(false);
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

  const marketOptions = (
    <>
      {MARKETS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}, {m.country}
        </option>
      ))}
    </>
  );

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
          Will a new market <strong>love your brand — or cancel it</strong>? Four agents scan
          the taste graph, argue about it, and file the full risk dossier,{" "}
          <em>before</em> you launch and embarrass yourself.
        </p>
      </header>

      <div className="mode-toggle" role="tablist" aria-label="Mode">
        <button
          role="tab"
          aria-selected={mode === "single"}
          className={mode === "single" ? "active" : ""}
          onClick={() => setMode("single")}
          type="button"
        >
          Single dossier
        </button>
        <button
          role="tab"
          aria-selected={mode === "versus"}
          className={mode === "versus" ? "active" : ""}
          onClick={() => setMode("versus")}
          type="button"
        >
          Versus
        </button>
      </div>

      {mode === "single" ? (
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
                {marketOptions}
              </select>
            </div>
            <div className="field">
              <label htmlFor="target">Target market</label>
              <select id="target" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)}>
                {marketOptions}
              </select>
            </div>
          </div>
          <button className="scan" type="submit" disabled={phase === "loading" || !brand.trim()}>
            {phase === "loading" ? "Agents at work…" : "File the dossier"}
          </button>
          <p className="form-note">
            Takes a few seconds. No signup, no mercy. Data: {provenance}.
          </p>
        </form>
      ) : (
        <form className="new-assessment" onSubmit={runVersus}>
          <h2>Stage a bout</h2>
          <div className="row2">
            <div className="field">
              <label htmlFor="brandA">Contender A</label>
              <input
                id="brandA"
                list="brand-suggestions"
                placeholder="e.g. Nike"
                value={brandA}
                onChange={(e) => setBrandA(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="brandB">Contender B</label>
              <input
                id="brandB"
                placeholder="e.g. Adidas"
                value={brandB}
                onChange={(e) => setBrandB(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <datalist id="brand-suggestions">
            {BRANDS.map((b) => (
              <option key={b.id} value={b.name} />
            ))}
          </datalist>
          <div className="field">
            <label htmlFor="vtarget">Arena (target market)</label>
            <select id="vtarget" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)}>
              {marketOptions}
            </select>
          </div>
          <button className="scan" type="submit" disabled={vPhase === "loading" || !brandA.trim() || !brandB.trim()}>
            {vPhase === "loading" ? "Bout in progress…" : "Start the bout"}
          </button>
          <p className="form-note">Both brands get the full four-agent treatment. The judge decides.</p>
        </form>
      )}

      {mode === "single" && phase === "idle" && (
        <div className="empty">
          No dossier on file yet.
          <br />
          Try <strong>Heineken → Riyadh</strong> if you want to watch something burn.
        </div>
      )}

      {mode === "single" && phase === "loading" && (
        <div className="skeleton">
          <div className="sk" style={{ height: 60 }} />
          <div className="sk" style={{ height: 24, width: "55%" }} />
          <div className="sk" style={{ height: 110 }} />
          <div className="sk" style={{ height: 24, width: "75%" }} />
        </div>
      )}

      {mode === "single" && phase === "error" && <div className="error-box">{error}</div>}

      {mode === "versus" && vPhase === "loading" && (
        <div className="skeleton">
          <div className="sk" style={{ height: 60 }} />
          <div className="sk" style={{ height: 90 }} />
          <div className="sk" style={{ height: 90 }} />
        </div>
      )}

      {mode === "versus" && vPhase === "error" && <div className="error-box">{vError}</div>}

      {mode === "versus" && vPhase === "done" && versus && (
        <article className="dossier">
          <div className="kicker">
            <span>
              Versus · {versus.a.targetMarket}
            </span>
            <span className="file-no">BOUT Nº {versus.a.score + versus.b.score}</span>
          </div>
          <h2 className="verdict">
            {versus.winner ? (
              <>
                {versus.winner} <span className="neg">takes {versus.a.targetMarket.split(",")[0]}.</span>
              </>
            ) : (
              "A draw."
            )}
          </h2>
          <p className="standfirst">{versus.judgeNote}</p>

          {[versus.a, versus.b].map((r) => (
            <div className="contender" key={r.brandName}>
              <div className="contender-head">
                <span className="contender-name">{r.brandName}</span>
                <span className="contender-score">
                  {r.score}
                  <small>/100</small> · {r.verdict}
                </span>
              </div>
              <div className="contender-gaps">
                {r.gaps.slice(0, 2).map((g) => (
                  <span key={g.domain}>
                    {g.label}: {g.brand}v{g.market}
                  </span>
                ))}
                {r.tabooHits.length > 0 && (
                  <span className="contender-taboo">
                    ⚠ {r.tabooHits.map((t) => t.label).join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}

          <div className="colophon">
            Both contenders received the full four-agent dossier treatment. Full reports available in single-dossier mode.
          </div>
        </article>
      )}

      {mode === "single" && phase === "done" && report && headline && (
        <article className="dossier">
          <div className="kicker">
            <span>
              Risk assessment · {report.brandName} → {report.targetMarket}
            </span>
            <span className="file-no">Nº {report.score.toString().padStart(3, "0")}</span>
          </div>

          <h2 className="verdict">
            {headline.neg ? <span className="neg">{headline.text}</span> : headline.text}
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

          <div className="section exam">
            <h3>
              <span className="sec-no">◈</span>
              Cross-examine the analyst
            </h3>
            <p className="dissent-lede">
              Question the dossier. The analyst answers from the file — and runs fresh live scans when your question needs new data.
            </p>
            {examLog.map((t, i) => (
              <div className="exam-turn" key={i}>
                <p className="exam-q">
                  <span className="n">Q.</span> {t.q}
                </p>
                <p className="exam-a">
                  <span className="n">A.</span> {t.a}
                  {t.tools > 0 && <span className="exam-tools"> · {t.tools} live scan{t.tools > 1 ? "s" : ""} run</span>}
                </p>
              </div>
            ))}
            <form className="exam-form" onSubmit={askAnalyst}>
              <input
                value={examQ}
                onChange={(e) => setExamQ(e.target.value)}
                placeholder="e.g. Who would win here, Nike or Adidas?"
                aria-label="Question for the analyst"
                maxLength={500}
              />
              <button type="submit" disabled={examBusy || !examQ.trim()}>
                {examBusy ? "Consulting…" : "Ask"}
              </button>
            </form>
          </div>

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
