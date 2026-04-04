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
| `NEXT_PUBLIC_TIMELINE_BASE_URL` | `https://paradigm-threat-timeline-a77fe2.gitlab.io` | Timeline Pages origin (`/data/events.json`, `/index.json`). Multiple mirrors: separate with `\|` or newlines (no comma or semicolon). |
| `TIMELINE_ORIGINS` | (unset) | Optional pipe- or newline-separated timeline static origins, **tried in order**, for proxying `https://paradigmthreat.net/export/...` to `origin/export/...`. If unset, uses `NEXT_PUBLIC_TIMELINE_BASE_URL` (including its multi-URL form). |
| `NEXT_PUBLIC_FILES_BASE_URL` | `https://paradigm-threat-files-69f9dc.gitlab.io` | Static files (GitLab Pages). Multiple mirrors: `\|` or newlines. In the browser, entries are **zipped by index** with the timeline list into relay **pairs**; the fastest pair is chosen at load, with MD/index failover switching the whole pair. |
| `PIPER_API_URLS` | (unset) | Piper TTS upstream bases: **pipe or newline** only (e.g. `http://a:5590\|http://b:5590`). See `lib/tts/piperUpstream.ts`. |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server (port 8081) |
| `npm run cypress:open` | Open Cypress test runner |
