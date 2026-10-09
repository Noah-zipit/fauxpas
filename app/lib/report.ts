// Risk engine — turns a brand footprint + a market taste vector into a verdict.
// Score = cosine similarity of the two cultural vectors (0–100), minus taboo
// penalties. Flashpoints = the domains with the biggest brand-vs-market gaps.
// Moves = concrete de-risking actions derived from the actual clashes found.

import { BrandProfile, Market, TABOOS, TasteVector } from "./mock";

export type Verdict = "LOVE" | "RISKY" | "CANCEL";

export interface DomainGap {
  domain: keyof TasteVector;
  label: string;
  brand: number;
  market: number;
  gap: number; // brand - market
  direction: "clash" | "miss";
}

export interface TabooHit {
  tabooId: string;
  label: string;
  sensitivity: number;
  detail: string;
}

export interface RiskReport {
  brandName: string;
  brandCategory: string;
  brandBlurb: string;
  homeMarket: string;
  targetMarket: string;
  targetBlurb: string;
  score: number;
  verdict: Verdict;
  verdictLine: string;
  gaps: DomainGap[];
  tabooHits: TabooHit[];
  moves: string[];
  narrative: string;
  mock: boolean;
}

const DOMAINS: { key: keyof TasteVector; label: string }[] = [
  { key: "dining", label: "Dining" },
  { key: "music", label: "Music" },
  { key: "fashion", label: "Fashion" },
  { key: "media", label: "Media" },
  { key: "nightlife", label: "Nightlife" },
  { key: "tradition", label: "Tradition" },
];

function cosine(a: TasteVector, b: TasteVector): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (const d of DOMAINS) {
    dot += a[d.key] * b[d.key];
    na += a[d.key] * a[d.key];
    nb += b[d.key] * b[d.key];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

const TABOO_MOVES: Record<string, (m: string) => string> = {
  alcohol: (m) =>
    `Go zero-proof for ${m}: launch an alcohol-free hero line. The Gulf playbook works because the ritual stays and the alcohol goes.`,
  pork: (m) =>
    `Halal-certify the full menu and pull every pork SKU before launch day. In ${m} this isn't positioning — it's permission to operate.`,
  beef: (m) =>
    `Take beef off the board in ${m} and lead with chicken and veg heroes. One menu photo can end a launch.`,
  revealingFashion: (m) =>
    `Add a modest edit to the line and reshoot campaign imagery for ${m}. Same brand, local dress code.`,
  loudMarketing: (m) =>
    `Trade the megaphone for understatement in ${m}. Quiet confidence outsells loud creative there.`,
  nightlifeCentric: (m) =>
    `Reframe the story around ${m}'s real social rituals — family dining, cafés, daytime culture — not the after-party.`,
};

const CLASH_MOVES: Record<string, (m: string) => string> = {
  nightlife: (m) =>
    `Move event marketing off the late-night circuit in ${m} — daytime cultural moments carry the same energy without the backlash.`,
  tradition: (m) =>
    `Lead with heritage, craft and family in ${m} messaging. Irreverence reads as disrespect where tradition runs deep.`,
  dining: (m) =>
    `Localize the menu with at least three ${m} dishes. Food is identity there — an imported menu feels like a tourist, not a neighbor.`,
  fashion: (m) =>
    `Dial the fashion-forward creative down for ${m} and lead with product. The runway can wait for the second season.`,
  music: (m) =>
    `Swap the global playlist for ${m}'s local sound. Music is the fastest trust signal in a new market.`,
  media: (m) =>
    `Cast local faces and local stories in ${m} creative. Imported campaigns read as imported priorities.`,
};

const GENERIC_MOVES = (m: string) => [
  `Recruit five local micro-creators in ${m} for a pre-launch listening tour — they'll spot the third-rail issues no dashboard catches.`,
  `Soft-launch in one district of ${m} with a kill-switch on creative. Learn cheap before going national.`,
  `Publish your localization choices openly. ${m} audiences reward brands that show their homework.`,
];

export function buildReport(
  brand: BrandProfile,
  homeName: string,
  target: Market,
  mock: boolean
): RiskReport {
  const sim = cosine(brand.vector, target.taste);
  let score = Math.round(sim * 100);

  const tabooHits: TabooHit[] = brand.taboos
    .map((tid) => {
      const s = target.taboos.find((t) => t.tabooId === tid);
      if (!s) return null;
      const taboo = TABOOS[tid];
      return { tabooId: tid, label: taboo.label, sensitivity: s.sensitivity, detail: taboo.detail };
    })
    .filter((x): x is TabooHit => x !== null);

  for (const h of tabooHits) score -= Math.round(h.sensitivity * 0.22);
  score = Math.max(3, Math.min(97, score));

  const verdict: Verdict = score >= 68 ? "LOVE" : score >= 42 ? "RISKY" : "CANCEL";

  const gaps: DomainGap[] = DOMAINS.map((d) => {
    const gap = brand.vector[d.key] - target.taste[d.key];
    return {
      domain: d.key,
      label: d.label,
      brand: Math.round(brand.vector[d.key]),
      market: Math.round(target.taste[d.key]),
      gap: Math.round(gap),
      direction: (gap >= 0 ? "clash" : "miss") as "clash" | "miss",
    };
  }).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  const moves: string[] = [];
  for (const h of tabooHits) {
    const fn = TABOO_MOVES[h.tabooId];
    if (fn && moves.length < 3) moves.push(fn(target.name));
  }
  for (const g of gaps) {
    if (moves.length >= 3) break;
    if (Math.abs(g.gap) < 22) continue;
    const fn = CLASH_MOVES[g.domain];
    if (fn) {
      const move = fn(target.name);
      if (!moves.includes(move)) moves.push(move);
    }
  }
  for (const gm of GENERIC_MOVES(target.name)) {
    if (moves.length >= 3) break;
    moves.push(gm);
  }

  const top = gaps[0];
  const verdictLine =
    verdict === "LOVE"
      ? `${brand.name} and ${target.name} are speaking the same cultural language. Launch with confidence — but don't get cocky.`
      : verdict === "RISKY"
        ? `${brand.name} can work in ${target.name}, but the fault lines are real. Localize deliberately or launch quietly and learn.`
        : `${brand.name} walking into ${target.name} as-is is asking for a boycott. Rebuild the playbook for this market or stay out.`;

  const tabooLine =
    tabooHits.length > 0
      ? ` Third rails: ${tabooHits.map((h) => h.label.toLowerCase()).join(", ")}.`
      : "";

  const narrative =
    `${brand.name} scores ${score}/100 on cultural fit for ${target.name}. ` +
    `The widest gap is ${top.label.toLowerCase()} — the brand pushes ${top.brand}, the market sits at ${top.market}.${tabooLine} ` +
    verdictLine;

  return {
    brandName: brand.name,
    brandCategory: brand.category,
    brandBlurb: brand.blurb,
    homeMarket: homeName,
    targetMarket: `${target.name}, ${target.country}`,
    targetBlurb: target.blurb,
    score,
    verdict,
    verdictLine,
    gaps,
    tabooHits,
    moves: moves.slice(0, 3),
    narrative,
    mock,
  };
}
