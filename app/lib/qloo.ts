// Qloo client — live Taste Graph when QLOO_API_KEY is set, mock data otherwise.
//
// Live paths:
//   Brand side:  GET {BASE}/v2/search?query=...  -> entity resolution
//                GET {BASE}/v2/insights?filter.type=urn:entity&signal.interests.entities=...
//                -> ranked taste affinities, bucketed into cultural domains.
//   Market side: GET {BASE}/v2/insights?filter.type=urn:entity:place&filter.location.query={city}
//                -> real venues in the city; their tags + popularity build the
//                market's taste vector per domain. Verified live: Riyadh and
//                New York return completely different venue sets.
// Both need the `x-api-key` header. Hackathon keys only work against the
// hackathon base URL (default https://hackathon.api.qloo.com).

import { BRANDS, BrandProfile, Market, MARKETS, TasteVector, genericBrand } from "./mock";

const BASE = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
const KEY = process.env.QLOO_API_KEY || "";

export const isLive = () => KEY.length > 0;

const enc = (s: string) => encodeURIComponent(s);

async function qlooGet(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-api-key": KEY, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Qloo ${res.status}`);
  return res.json();
}

// Brand-side domain keywords — matched against the entity's own tag list
// from the Qloo graph (ordered by relevance, so earlier tags weigh more).
const BRAND_DOMAIN_WORDS: { domain: keyof TasteVector; words: string[] }[] = [
  { domain: "dining", words: ["beer", "wine", "spirits", "food", "restaurant", "cuisine", "cafe", "coffee", "dining", "culinary", "beverage"] },
  { domain: "nightlife", words: ["beer", "wine", "spirits", "nightlife", "nightclub", "night club", "cocktail", "lounge", "rooftop", "celebrat", "social", "party", "club"] },
  { domain: "music", words: ["music", "concert", "dj", "festival", "band", "hip hop", "pop", "edm"] },
  { domain: "fashion", words: ["fashion", "sneaker", "footwear", "apparel", "clothing", "streetwear", "designer", "style", "luxury"] },
  { domain: "media", words: ["film", "movie", "sport", "gaming", "media", "streaming", "entertainment"] },
  { domain: "tradition", words: ["heritage", "traditional", "history", "established", "classic", "iconic", "legacy"] },
];

// Rank-weighted: the graph orders an entity's tags by relevance, so a match
// on the 1st tag counts far more than on the 50th. Saturates toward 100.
function entityTagsToVector(tags: { name: string }[]): TasteVector {
  const names = tags.map((t) => t.name.toLowerCase());
  const vec = {} as TasteVector;
  for (const { domain, words } of BRAND_DOMAIN_WORDS) {
    let raw = 0;
    names.forEach((n, i) => {
      if (words.some((w) => n.includes(w))) raw += 1 / (1 + i / 8);
    });
    vec[domain] = Math.max(5, Math.round((100 * raw) / (raw + 1.5)));
  }
  return vec;
}

export interface BrandResolution {
  profile: BrandProfile;
  live: boolean;
  signals: number; // taste affinities pulled from the graph
}

export async function resolveBrand(name: string): Promise<BrandResolution> {
  const q = name.trim().toLowerCase();
  const known = BRANDS.find(
    (b) => b.name.toLowerCase() === q || b.aliases?.some((a) => a === q)
  );
  if (!isLive()) return { profile: known || genericBrand(name), live: false, signals: 0 };

  try {
    const search = await qlooGet(`/v2/search?query=${enc(name)}&limit=1`);
    const entity = search?.results?.[0];
    if (!entity?.entity_id) throw new Error("no entity");
    const tags: { name: string }[] = Array.isArray(entity.tags) ? entity.tags : [];
    if (tags.length === 0) throw new Error("no tags");
    const profile = genericBrand(entity.name || name);
    if (known) {
      // Keep the curated identity (category, taboos); take the live taste vector.
      profile.category = known.category;
      profile.taboos = known.taboos;
    }
    profile.vector = entityTagsToVector(tags);
    profile.blurb = `Live Qloo entity: ${entity.name || name} — taste vector from ${tags.length} graph tags.`;
    return { profile, live: true, signals: tags.length };
  } catch {
    return { profile: known || genericBrand(name), live: false, signals: 0 };
  }
}

// ---- Market side: real venue signal per city ----

const PLACE_DOMAIN_WORDS: { domain: keyof TasteVector; words: string[] }[] = [
  { domain: "dining", words: ["restaurant", "food", "cuisine", "cafe", "dining", "dessert", "eatery", "brasserie", "bistro"] },
  { domain: "nightlife", words: ["nightlife", "nightclub", "night club", "cocktail", "lounge", "rooftop bar"] },
  { domain: "music", words: ["music", "concert", "live music", "jazz", "opera house"] },
  { domain: "fashion", words: ["shopping", "fashion", "mall", "retail", "boutique", "souk", "market hall"] },
  { domain: "media", words: ["cinema", "film", "movie", "theater", "theatre"] },
  { domain: "tradition", words: ["traditional", "heritage", "cultural", "historic", "authentic", "landmark", "mosque", "museum", "temple", "shrine"] },
];

interface PlaceHit {
  popularity: number;
  tagline: string;
}

function placesToVector(entities: any[]): { vector: TasteVector; placesScanned: number } {
  const vec: TasteVector = { dining: 50, music: 50, fashion: 50, media: 50, nightlife: 50, tradition: 50 };
  const hits: Record<string, PlaceHit[]> = {};
  for (const e of entities || []) {
    const tags = Array.isArray(e.tags) ? e.tags : [];
    const tagline = tags.map((t: any) => (typeof t === "string" ? t : t?.name || "")).join(" ").toLowerCase();
    const popularity = typeof e.popularity === "number" ? e.popularity : 0;
    for (const { domain, words } of PLACE_DOMAIN_WORDS) {
      if (words.some((w) => tagline.includes(w))) {
        (hits[domain] ||= []).push({ popularity, tagline });
      }
    }
  }
  for (const { domain } of PLACE_DOMAIN_WORDS) {
    const arr = (hits[domain] || []).sort((a, b) => b.popularity - a.popularity).slice(0, 5);
    if (arr.length > 0) {
      vec[domain] = Math.max(3, Math.round((arr.reduce((a, b) => a + b.popularity, 0) / arr.length) * 100));
    } else {
      vec[domain] = 3; // no venue signal for this domain in the city
    }
  }
  return { vector: vec, placesScanned: entities?.length || 0 };
}

export interface MarketResolution {
  market: Market;
  live: boolean;
  placesScanned: number;
}

export async function resolveMarket(id: string): Promise<MarketResolution> {
  const hit = MARKETS.find((m) => m.id === id);
  if (!hit) throw new Error(`Unknown market: ${id}`);
  if (!isLive()) return { market: hit, live: false, placesScanned: 0 };

  try {
    const data = await qlooGet(
      `/v2/insights?filter.type=${enc("urn:entity:place")}&filter.location.query=${enc(hit.name)}&take=50`
    );
    const entities = data?.results?.entities || [];
    if (entities.length === 0) throw new Error("empty venue signal");
    const { vector, placesScanned } = placesToVector(entities);
    return {
      market: {
        ...hit,
        taste: vector,
        blurb: `${hit.blurb} Market taste vector computed live from ${placesScanned} Qloo venues in ${hit.name}.`,
      },
      live: true,
      placesScanned,
    };
  } catch {
    return { market: hit, live: false, placesScanned: 0 };
  }
}
