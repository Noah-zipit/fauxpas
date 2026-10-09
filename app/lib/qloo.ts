// Qloo client — live Taste Graph when QLOO_API_KEY is set, mock data otherwise.
//
// Live paths (per the official qloo-hackathon-kit):
//   GET {QLOO_BASE_URL}/v2/search?query=...        -> entity resolution
//   GET {QLOO_BASE_URL}/v2/insights?filter.type=... -> ranked taste affinities
// Both need the `x-api-key` header. Hackathon keys only work against the
// hackathon base URL (default https://hackathon.api.qloo.com).
//
// Mapping note: Qloo returns affinities per tag/entity with a 0..1 score.
// We bucket the top tags into our six cultural domains by tag name matching
// and scale to 0..100. It's a documented approximation — the mock path is the
// demo default until a key is configured.

import { BRANDS, BrandProfile, Market, MARKETS, TasteVector, genericBrand } from "./mock";

const BASE = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
const KEY = process.env.QLOO_API_KEY || "";

export const isLive = () => KEY.length > 0;

async function qlooGet(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-api-key": KEY, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Qloo ${res.status}`);
  return res.json();
}

const DOMAIN_KEYWORDS: { domain: keyof TasteVector; words: string[] }[] = [
  { domain: "dining", words: ["restaurant", "food", "dining", "cuisine", "cafe", "coffee"] },
  { domain: "music", words: ["music", "concert", "artist", "band", "dj", "festival"] },
  { domain: "fashion", words: ["fashion", "apparel", "clothing", "streetwear", "designer"] },
  { domain: "media", words: ["film", "movie", "tv", "media", "streaming", "podcast"] },
  { domain: "nightlife", words: ["nightlife", "club", "bar", "party", "lounge"] },
  { domain: "tradition", words: ["heritage", "traditional", "family", "cultural"] },
];

function affinitiesToVector(results: any[]): TasteVector {
  const vec: TasteVector = { dining: 50, music: 50, fashion: 50, media: 50, nightlife: 50, tradition: 50 };
  const hits: Record<string, number[]> = {};
  for (const r of results || []) {
    const name = `${r.name || ""} ${r.tags?.join(" ") || ""}`.toLowerCase();
    const score = typeof r.affinity === "number" ? r.affinity : 0.5;
    for (const { domain, words } of DOMAIN_KEYWORDS) {
      if (words.some((w) => name.includes(w))) {
        (hits[domain] ||= []).push(score);
      }
    }
  }
  for (const { domain } of DOMAIN_KEYWORDS) {
    const arr = hits[domain];
    if (arr && arr.length) vec[domain] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100);
  }
  return vec;
}

export async function resolveBrand(name: string): Promise<{ profile: BrandProfile; mock: boolean }> {
  const q = name.trim().toLowerCase();
  const known = BRANDS.find(
    (b) => b.name.toLowerCase() === q || b.aliases?.some((a) => a === q)
  );
  if (known) return { profile: known, mock: !isLive() };
  if (!isLive()) return { profile: genericBrand(name), mock: true };

  try {
    const search = await qlooGet(`/v2/search?query=${encodeURIComponent(name)}&limit=1`);
    const entity = search?.results?.[0];
    const insights = await qlooGet(
      `/v2/insights?filter.type=urn:entity&signal.interests.entities=${entity?.entity_id || ""}`
    );
    const profile = genericBrand(name);
    profile.vector = affinitiesToVector(insights?.results);
    profile.blurb = `Live Qloo entity: ${entity?.name || name} — affinities from the Taste Graph.`;
    return { profile, mock: false };
  } catch {
    return { profile: genericBrand(name), mock: true };
  }
}

export async function resolveMarket(id: string): Promise<{ market: Market; mock: boolean }> {
  const hit = MARKETS.find((m) => m.id === id);
  if (!hit) throw new Error(`Unknown market: ${id}`);
  // Market taste vectors stay on curated mock data for the demo — the live
  // Insights API shines for brand entities; market priors are our editorial layer.
  return { market: hit, mock: !isLive() };
}
