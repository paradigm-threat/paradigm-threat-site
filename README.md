# Paradigm Threat

**[paradigmthreat.net](https://paradigmthreat.net)**

An investigation into alternate Earth history, correlating mainstream (Scaligerian) chronology with Fomenko's New Chronology, Saturnian Cosmology, and other timeline systems. The site presents research articles, media, and an interactive timeline spanning from before creation through the modern era.

The Paradigm Threat project poses an intellectual challenge to the reigning paradigms of every discipline — history, cosmology, medicine, physics, religion, finance, governance. Armed with sourced research, cross-referenced chronologies, and a willingness to follow the evidence wherever it leads. Ready to debate.

## Features

- **Interactive Timeline** — Browse events across multiple chronology systems with TTS narration and a Ken Burns slideshow with smooth crossfade transitions
- **Content Library** — Research articles on cosmology, governance, historical events, and scientific anomalies served from a remote file server
- **Chat** — Real-time discussion channels
- **Search** — Full-text search across all content
- **Image Gallery** — Global lightbox carousel for media across all pages
- **Dark/Light Theme** — Toggle between display modes

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) 14 (App Router)
- **Styling:** Tailwind CSS + SCSS
- **Deployment:** [Vercel](https://vercel.com)
- **Analytics:** Vercel Analytics + Speed Insights
- **Testing:** Cypress (component + E2E)

## Related Repositories

| Repository | Purpose |
|---|---|
| [paradigm-threat-timeline](https://gitlab.com/clevertree/paradigm-threat-timeline) | Timeline data, content markdown, and media |
| [paradigm-threat-files](https://gitlab.com/clevertree/paradigm-threat-files) | Static file server content (articles, images) |
| [paradigm-threat-site](https://gitlab.com/clevertree/paradigm-threat-site) | This Next.js app |

## Development

```bash
npm install
npm run dev
```

Opens on [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_TIMELINE_BASE_URL` | `https://paradigm-threat-timeline-a77fe2.gitlab.io` | Timeline Relay/Pages origin (QUERY catalogs + static media/export). Multiple mirrors: separate with `\|` or newlines (no comma or semicolon). |
| `TIMELINE_ORIGINS` | (unset) | Optional pipe- or newline-separated timeline static origins, **tried in order**, for timeline mirror failover. `/export/...` on the site origin **307-redirects** to `NEXT_PUBLIC_TIMELINE_BASE_URL/export/...` (no Vercel binary proxy). |
| `NEXT_PUBLIC_FILES_BASE_URL` | `https://paradigm-threat-files-69f9dc.gitlab.io` | Static files (GitLab Pages or Relay). Multiple mirrors: whitespace-separated. In the browser, files and timeline lists are **paired by node hostname** (`iad1` / `hkg1` / `sjc1`) so list order cannot zip mismatched nodes; the first healthy pair is chosen at load. Retired `lon1` / `dfw1` hosts are rewritten to `iad1`. Raster images use **`{mirror}/{path}?w=`** (Relay `server.hooks.get` WebP); no `/api/image` proxy on this app. |
| `NEXT_PUBLIC_PIPER_API_URLS` | (see code) | Browser Piper TTS: **space**-separated relay bases (`/tts`, `/voices`). Defaults match `PIPER_API_URLS`. The client calls relay **directly** (no `/api/tts/piper` proxy). Optional `NEXT_PUBLIC_PIPER_API_SECRET` if mirrors require Bearer auth. |
| `PIPER_API_URLS` | (see code) | Server/build Piper bases (tests). Default: `dfw1`, `iad1`, `hkg1` relay hosts. |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server (port 8081) |
| `npm run cypress:open` | Open Cypress test runner |
