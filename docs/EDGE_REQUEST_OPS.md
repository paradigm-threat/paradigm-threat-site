# Edge request reduction — ops checklist

After deploy, confirm caching and quota headroom in [Vercel Observability](https://vercel.com/clevertrees-projects/paradigm-threat-site/observability).

## Automated (CI / deploy)

- `npm run smoke:prod` — article `Cache-Control` includes `s-maxage=86400`; logs `x-vercel-cache` on repeat fetch
- `npm run test:unit` — middleware path rules, robots, edge cache constants

## Manual — Observability (baseline + 7-day check)

1. **Edge Requests → Projects** — `paradigm-threat-site` daily volume vs 1M/mo quota (~33K/day ceiling)
2. **Routes** — filter `/[[...slug]]`; target **cache hit rate > 50%** after CDN headers deploy
3. **User-Agent** — note bot spikes (Ahrefs, Semrush, GPTBot, etc.)

## Manual — Vercel Firewall (optional, dashboard)

Project → **Firewall** → add rules if crawlers dominate:

- Rate limit by User-Agent containing known SEO bots (e.g. `AhrefsBot`, `SemrushBot`) on `GET` to `/`
- Challenge or block `GPTBot` / `CCBot` if not needed for SEO

Do **not** enable full sitemap index walk (`NEXT_PUBLIC_SERVER_RELAY_FETCH=1`) while edge budget is tight.

## ISR note

On-demand ISR via `generateStaticParams` + client root layout caused `DYNAMIC_SERVER_USAGE` (500). Current approach: **middleware + vercel.json** `Cache-Control` on document routes. Revisit ISR if the app shell moves to a server root layout.
