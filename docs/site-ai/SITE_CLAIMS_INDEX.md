# Site Claims Index

Curated **major conclusions** Paradigm Threat supports, used by Site AI and the reply assistant to lead with the site’s thesis before `read_article` expands from source articles.

**Source of truth:** `site-claims.json` in **paradigm-threat-files** (published on FILES mirrors alongside `index.json`).  
**Site runtime:** `lib/siteAi/siteClaimsStore.ts` fetches `/site-claims.json` from the active relay pair.  
**Matching:** `lib/siteAi/matchSiteClaims.ts`  
**Tool:** `get_site_claims` (WebMCP + on-device agent)

## Uniqueness labels

| Label | Meaning |
|-------|---------|
| `site-distinctive` | Synthesis or framing specific to this site (incl. Saturnian+Fomenko+Blip, two-camp UFO frame, sealed-hood/WebMCP thesis when marked repo-unique) |
| `broader-tradition` | Builds on mud-flood, EU, Fomenko, etc. literature |
| `site-position` | Our explicit stance on a common question (includes debunks) |

## Adding or editing a claim

1. Edit `site-claims.json` in **paradigm-threat-files** (root of that repo).
2. Run `npm run validate-site-claims` in paradigm-threat-files (also runs in `npm run autogen` / pre-commit).
3. Set `canonicalPaths` to real index paths (repo-relative, e.g. `history/mudflood/page.md`).
4. Add `demoQuestions` when the claim answers a chat chip.
5. Use `doNotSay` for anti-patterns (e.g. hedging the site avoids).
6. Deploy/push files repo so mirrors serve the updated JSON.
7. Run `pnpm run test:unit` in paradigm-threat-site — `siteClaims.regression.test.ts` checks demo matching.

## Confidence

- `project-thesis` — site’s argued position (label as thesis in answers)
- `documented` — tied to primary docs the site cites
- `speculative` — exploratory; use sparingly

Agents must still call `read_article` on `canonicalPaths` before treating details as grounded.
