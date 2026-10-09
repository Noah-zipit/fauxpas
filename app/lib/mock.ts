// Mock cultural data — stands in for the Qloo Taste Graph while QLOO_API_KEY is unset.
// Affinity scores are 0–100 per domain. Taboo sensitivity is 0–100.
// When the live key arrives, lib/qloo.ts swaps these for real Insights API results.

export interface TasteVector {
  dining: number;
  music: number;
  fashion: number;
  media: number;
  nightlife: number;
  tradition: number;
}

export interface Taboo {
  id: string;
  label: string;
  detail: string;
}

export const TABOOS: Record<string, Taboo> = {
  alcohol: {
    id: "alcohol",
    label: "Alcohol",
    detail: "Alcohol is legally restricted or socially unacceptable here.",
  },
  pork: {
    id: "pork",
    label: "Pork",
    detail: "Pork is religiously and culturally off-limits.",
  },
  beef: {
    id: "beef",
    label: "Beef",
    detail: "Beef is religiously sensitive for large parts of the population.",
  },
  revealingFashion: {
    id: "revealingFashion",
    label: "Revealing fashion",
    detail: "Revealing clothing clashes with local modesty norms.",
  },
  loudMarketing: {
    id: "loudMarketing",
    label: "Loud marketing",
    detail: "Aggressive, in-your-face advertising is frowned upon.",
  },
  nightlifeCentric: {
    id: "nightlifeCentric",
    label: "Nightlife-centric branding",
    detail: "Late-night / party positioning doesn't land in this market.",
  },
};

export interface Market {
  id: string;
  name: string;
  country: string;
  taste: TasteVector;
  taboos: { tabooId: string; sensitivity: number }[];
  blurb: string;
}

export const MARKETS: Market[] = [
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    taste: { dining: 92, music: 78, fashion: 88, media: 85, nightlife: 72, tradition: 70 },
    taboos: [{ tabooId: "loudMarketing", sensitivity: 65 }],
    blurb: "Trend-setting but etiquette-driven — novelty is loved, brashness is not.",
  },
  {
    id: "riyadh",
    name: "Riyadh",
    country: "Saudi Arabia",
    taste: { dining: 78, music: 55, fashion: 62, media: 60, nightlife: 18, tradition: 95 },
    taboos: [
      { tabooId: "alcohol", sensitivity: 100 },
      { tabooId: "pork", sensitivity: 100 },
      { tabooId: "revealingFashion", sensitivity: 90 },
      { tabooId: "nightlifeCentric", sensitivity: 85 },
    ],
    blurb: "Deeply traditional, family-first, and completely dry — the highest-stakes launch on this list.",
  },
  {
    id: "berlin",
    name: "Berlin",
    country: "Germany",
    taste: { dining: 75, music: 92, fashion: 82, media: 80, nightlife: 96, tradition: 35 },
    taboos: [],
    blurb: "Open, alternative, night-owl — almost nothing shocks Berlin, blandness does.",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    country: "India",
    taste: { dining: 88, music: 82, fashion: 70, media: 85, nightlife: 55, tradition: 80 },
    taboos: [
      { tabooId: "beef", sensitivity: 85 },
      { tabooId: "pork", sensitivity: 60 },
      { tabooId: "revealingFashion", sensitivity: 50 },
    ],
    blurb: "Maximum-city energy with deep traditional roots — food is identity here.",
  },
  {
    id: "sao-paulo",
    name: "São Paulo",
    country: "Brazil",
    taste: { dining: 82, music: 92, fashion: 78, media: 80, nightlife: 88, tradition: 55 },
    taboos: [],
    blurb: "Warm, loud, celebratory — brands that bring the party tend to win.",
  },
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    taste: { dining: 88, music: 85, fashion: 90, media: 92, nightlife: 85, tradition: 40 },
    taboos: [],
    blurb: "The melting pot — saturated, cynical, and rewards authenticity over polish.",
  },
  {
    id: "london",
    name: "London",
    country: "UK",
    taste: { dining: 84, music: 86, fashion: 88, media: 88, nightlife: 78, tradition: 55 },
    taboos: [],
    blurb: "Cosmopolitan and irony-poisoned — clever beats loud.",
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    taste: { dining: 85, music: 65, fashion: 80, media: 70, nightlife: 45, tradition: 80 },
    taboos: [
      { tabooId: "alcohol", sensitivity: 70 },
      { tabooId: "pork", sensitivity: 95 },
      { tabooId: "revealingFashion", sensitivity: 75 },
    ],
    blurb: "Glamorous on the surface, conservative underneath — the expat bubble is not the market.",
  },
];

export interface BrandProfile {
  id: string;
  name: string;
  category: string;
  vector: TasteVector;
  taboos: string[];
  blurb: string;
  aliases?: string[];
}

export const BRANDS: BrandProfile[] = [
  {
    id: "mcdonalds",
    name: "McDonald's",
    category: "Fast food",
    vector: { dining: 95, music: 50, fashion: 45, media: 70, nightlife: 40, tradition: 45 },
    taboos: ["pork", "beef"],
    blurb: "Global fast-food giant — bacon and beef are core menu items.",
    aliases: ["mcdonalds", "mcdonald's", "mcd", "macdonalds"],
  },
  {
    id: "starbucks",
    name: "Starbucks",
    category: "Coffee",
    vector: { dining: 80, music: 60, fashion: 65, media: 60, nightlife: 35, tradition: 50 },
    taboos: [],
    blurb: "Premium coffee culture — the 'third place' between home and work.",
    aliases: ["starbucks"],
  },
  {
    id: "nike",
    name: "Nike",
    category: "Sportswear",
    vector: { dining: 30, music: 75, fashion: 90, media: 75, nightlife: 55, tradition: 40 },
    taboos: ["revealingFashion"],
    blurb: "Athletic streetwear with bold, irreverent marketing.",
    aliases: ["nike"],
  },
  {
    id: "redbull",
    name: "Red Bull",
    category: "Energy drinks",
    vector: { dining: 40, music: 85, fashion: 70, media: 80, nightlife: 90, tradition: 30 },
    taboos: ["nightlifeCentric"],
    blurb: "Energy drinks sold through extreme sports and after-dark culture.",
    aliases: ["redbull", "red bull"],
  },
  {
    id: "hm",
    name: "H&M",
    category: "Fast fashion",
    vector: { dining: 25, music: 60, fashion: 85, media: 65, nightlife: 50, tradition: 45 },
    taboos: ["revealingFashion"],
    blurb: "Affordable fast fashion — trend-led, disposable, global.",
    aliases: ["hm", "h&m", "h & m"],
  },
  {
    id: "heineken",
    name: "Heineken",
    category: "Beer",
    vector: { dining: 55, music: 80, fashion: 60, media: 70, nightlife: 92, tradition: 35 },
    taboos: ["alcohol", "nightlifeCentric"],
    blurb: "Global beer brand — the product IS the taboo in dry markets.",
    aliases: ["heineken"],
  },
];

/** Fallback profile for any brand not in the mock set: neutral-ish with mild edge. */
export function genericBrand(name: string): BrandProfile {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  const jitter = (n: number) => Math.max(20, Math.min(85, n + (h % 17) - 8));
  return {
    id: "custom",
    name: name.trim(),
    category: "Consumer brand",
    vector: {
      dining: jitter(55),
      music: jitter(60),
      fashion: jitter(62),
      media: jitter(60),
      nightlife: jitter(55),
      tradition: jitter(50),
    },
    taboos: [],
    blurb: "Custom brand — cultural footprint estimated from category averages.",
  };
}
