// The agent pipeline — four agents compile every dossier.
//
//   SCOUT    hits the Qloo taste graph: resolves the brand entity and pulls
//            its taste affinities, then scans real venues in the target city
//            to build the market's taste vector.
//   ANALYST  scores the brand-vs-market fault lines, flags third rails and
//            issues the verdict.
//   RED TEAM argues against the launch from the analyst's own data.
//   EDITOR   writes the dossier narrative.
//
// Every step is timed and recorded; the trace ships with the report so the
// dossier shows its work.

import { resolveBrand, resolveMarket } from "./qloo";
import { buildReport, RiskReport, AgentStep, AgentId } from "./report";
import { buildObjections } from "./redteam";
import { maybeEnhanceNarrative } from "./narrative";

async function timed<T>(
  trace: AgentStep[],
  agent: AgentId,
  action: string,
  fn: () => Promise<T>,
  detail: (out: T) => string
): Promise<T> {
  const t0 = Date.now();
  const out = await fn();
  trace.push({ agent, action, detail: detail(out), ms: Date.now() - t0 });
  return out;
}

export async function runPipeline(
  brand: string,
  homeMarket: string,
  targetMarket: string
): Promise<RiskReport> {
  const trace: AgentStep[] = [];

  // ---- SCOUT: parallel Qloo calls ----
  const [brandRes, marketRes] = await timed(
    trace,
    "scout",
    "Gather taste signal",
    () => Promise.all([resolveBrand(brand), resolveMarket(targetMarket)]),
    ([b, m]) =>
      `Resolved "${b.profile.name}" → ${b.signals} graph tags ` +
      `(${b.live ? "live graph" : "curated profile"}); scanned ${m.placesScanned} venues in ${m.market.name} ` +
      `(${m.live ? "live signal" : "curated priors"})`
  );

  let homeName = "—";
  if (homeMarket && typeof homeMarket === "string" && homeMarket !== targetMarket) {
    try {
      homeName = (await resolveMarket(homeMarket)).market.name;
    } catch {
      homeName = "—";
    }
  }

  // ---- ANALYST: score the fault lines ----
  const report = await timed(
    trace,
    "analyst",
    "Score fault lines",
    async () =>
      buildReport(brandRes.profile, homeName, marketRes.market, {
        brandLive: brandRes.live,
        marketLive: marketRes.live,
      }),
    (r) =>
      `${r.gaps.length} domains scored · ${r.tabooHits.length} third rails flagged · verdict ${r.verdict} ${r.score}/100`
  );

  // ---- RED TEAM: argue against the launch ----
  const { objections, sharpened } = await timed(
    trace,
    "redteam",
    "Argue against the launch",
    () => buildObjections(report),
    (o) => `${o.objections.length} objections filed${o.sharpened ? " · sharpened with Groq" : ""}`
  );
  report.objections = objections;

  // ---- EDITOR: write the dossier ----
  report.narrative = await timed(
    trace,
    "editor",
    "Write the dossier",
    () => maybeEnhanceNarrative(report),
    () => (process.env.GROQ_API_KEY ? "Narrative polished with Groq" : "Narrative from the engine brief")
  );

  report.trace = trace;
  return report;
}
