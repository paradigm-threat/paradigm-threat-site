# Edge request reduction — ops checklist

After deploy, confirm caching and quota headroom in [Vercel Observability](https://vercel.com/clevertrees-projects/paradigm-threat-site/observability).

## Automated (CI / deploy)

- `npm run smoke:prod` — article `Cache-Control` includes `s-maxage=86400`; logs `x-vercel-cache` on repeat fetch
- `npm run test:unit` — middleware path rules, robots, edge cache constants

## Manual — Observability (baseline + 7-day check)

1. **Edge Requests → Projects** — `paradigm-threat-site` daily volume vs 1M/mo quota (~33K/day ceiling)
2. **Routes** — default: `/[[...slug]]`; with SPA flag: `/` (see below). Target **cache hit rate > 50%** after CDN headers deploy
3. **User-Agent** — note bot spikes (Ahrefs, Semrush, GPTBot, etc.)

## Manual — Vercel Firewall (optional, dashboard)

Project → **Firewall** → add rules if crawlers dominate:

- Rate limit by User-Agent containing known SEO bots (e.g. `AhrefsBot`, `SemrushBot`) on `GET` to `/`
- Challenge or block `GPTBot` / `CCBot` if not needed for SEO

Do **not** enable full sitemap index walk (`NEXT_PUBLIC_SERVER_RELAY_FETCH=1`) while edge budget is tight.

## Architecture — interim SPA (optional, default off)

**Default (production):** Next `[[...slug]]` catch-all — per-path `generateMetadata` (social previews), CDN headers on document paths.

**Emergency edge mode:** set **`NEXT_PUBLIC_SPA_DOCUMENT_ROUTES=1`** in Vercel Production and **redeploy**. Article URLs rewrite to **`/`** (one cached shell); [`CatchAllClient`](components/content/CatchAllClient.tsx) reads `usePathname()` and fetches from Relay. **Trade-off:** crawlers lose per-article Open Graph tags until Relay hosts HTML or a lightweight OG layer is added.

Build runs `scripts/sync-spa-document-routes.mjs` (creates/removes `app/(main)/page.tsx`). Local test:

```bash
NEXT_PUBLIC_SPA_DOCUMENT_ROUTES=1 npm run build && npm run start
bash scripts/test-spa-routes.sh
```

On-demand ISR via `generateStaticParams` + client root layout caused `DYNAMIC_SERVER_USAGE` (500). Current approach: **middleware + vercel.json** `Vercel-CDN-Cache-Control` / `CDN-Cache-Control` on document routes (Vercel caches at CDN even when the Function returns `Cache-Control: private`). Revisit ISR if the app shell moves to a server root layout.

## Markdown image audit (files repo)

Run `scripts/check-site-origin-md-raster.sh` in **paradigm-threat-files** — site-origin raster URLs in markdown still cost one middleware edge hit each (307 to Relay). Bulk rewrite to Relay mirrors is optional follow-up.
