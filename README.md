# fauxpas — will they love you or cancel you?

Cultural-fit intelligence for brands. Enter a brand, its home market, and a target
market — fauxpas scans the cultural fit against the **Qloo taste graph** and hands
you a full risk report: a LOVE / RISKY / CANCEL verdict, a 0–100 fit score, the
fault lines between brand and market, the third-rail taboos, and three concrete
de-risking moves.

Built for the [Qloo Agentic Hackathon](https://qloo.devpost.com/) (Oct 2026).

## How it works

1. **Brand resolution** — known brands (McDonald's, Nike, Heineken…) resolve to a
   cultural footprint vector; anything else gets an estimated profile. With a
   `QLOO_API_KEY`, unknown brands resolve through Qloo's Entity Search + Insights API.
2. **Market taste vectors** — curated affinity profiles across six domains
   (dining, music, fashion, media, nightlife, tradition) plus taboo sensitivities
   (alcohol, pork, beef, modesty norms…).
3. **Risk engine** (`lib/report.ts`) — cosine similarity of brand vs market vectors,
   minus taboo penalties → score, verdict, fault lines, and generated de-risking moves.
4. **Narrative** — templated by default; polished by the user's own Groq key when
   `GROQ_API_KEY` is set (no other LLM spend).

## Run it

```bash
cd app
npm install
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

## Configuration

Copy `app/.env.example` to `app/.env` and fill in:

| Variable       | Required | What it does |
| -------------- | -------- | ------------ |
| `QLOO_API_KEY` | No       | Live Qloo Taste Graph. Unset = built-in mock cultural data. |
| `QLOO_BASE_URL`| No       | Defaults to `https://hackathon.api.qloo.com` (hackathon keys only work here). |
| `GROQ_API_KEY` | No       | Your own Groq key for LLM-polished narratives. Unset = templates. |

## Deploy

One-click on Vercel (import the `app/` directory), or any Node host. The hackathon
requires an externally-hosted demo — localhost doesn't qualify.

## License

MIT — see [LICENSE](./LICENSE).
