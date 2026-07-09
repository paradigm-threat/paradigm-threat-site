# MCP Server — Vercel deployment

Server-side research MCP ships as **`/api/mcp`** on paradigm-threat-site (Streamable HTTP, stateless).

**WebMCP stays client-only** — this route does not replace browser tools.

## Enable on Vercel

1. Project → **Settings → Environment Variables**
2. Add **`MCP_SERVER_ENABLED`** = `1` (Production + Preview as desired)
3. Optional mirror overrides (same as site):
   - `NEXT_PUBLIC_FILES_BASE_URL`
   - `NEXT_PUBLIC_TIMELINE_BASE_URL`
4. Redeploy

No `NEXT_PUBLIC_SERVER_RELAY_FETCH` required — MCP fetches Relay directly.

## Endpoint

| URL | Purpose |
|-----|---------|
| `GET /api/mcp?health=1` | Health JSON |
| `POST /api/mcp` | MCP Streamable HTTP (JSON-RPC) |
| `DELETE /api/mcp` | Session teardown (stateless noop) |

Production: `https://paradigmthreat.net/api/mcp`

## Cursor / Claude Desktop (HTTP)

```json
{
  "mcpServers": {
    "paradigm-threat": {
      "url": "https://paradigmthreat.net/api/mcp"
    }
  }
}
```

Use preview URL when testing a PR deployment.

## ChatGPT Apps

Register custom MCP server URL: `https://paradigmthreat.net/api/mcp`

Shipped tools include ChatGPT aliases: **`search`**, **`fetch`**.

## Local dev

```bash
cd paradigm-threat-site
MCP_SERVER_ENABLED=1 pnpm run dev
npm run validate:mcp
# or: node scripts/validate-mcp.mjs http://localhost:3000
```

## Validate production

```bash
node scripts/validate-mcp.mjs https://paradigmthreat.net
```

Requires `MCP_SERVER_ENABLED=1` on that deployment.

## Runtime

- **Runtime:** Node.js (`app/api/mcp/route.ts`)
- **maxDuration:** 60s
- **Transport:** Stateless — new `WebStandardStreamableHTTPServerTransport` per request (serverless-safe)

## Tools (v0.1)

| Tool | Notes |
|------|-------|
| `search_site` / `search` | Keyword AND search over Relay index |
| `get_site_claims` | Curated thesis cards |
| `research_status` | Coverage envelope (`not_in_corpus`, gaps, next steps) |
| `read_article` / `fetch` | Markdown via Relay |
| `get_chronology_framework` | NC / Blip glossary |
| `compute_years_ago` / `get_event_dates` | Timeline date math |

## Code layout

| Path | Role |
|------|------|
| `app/api/mcp/route.ts` | Vercel route |
| `lib/mcp/createServer.ts` | MCP SDK tool registration |
| `lib/mcp/http.ts` | Stateless request handler |
| `lib/mcp/serverHandlers.ts` | Tool executors (Relay fetch) |
| `lib/mcp/relayFetch.ts` | Server-side index / MD / claims fetch |
| `lib/mcp/researchEnvelope.ts` | Honest coverage / no-answer protocol |

See also [MCP_SERVER_PLAN.md](MCP_SERVER_PLAN.md).
