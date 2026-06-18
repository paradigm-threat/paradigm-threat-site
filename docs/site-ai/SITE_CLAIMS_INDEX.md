# Site Claims Index

Curated **major conclusions** Paradigm Threat supports, used by Site AI and the reply assistant to lead with the site’s thesis before `read_article` expands from source articles.

**Source of truth (runtime):** `lib/siteAi/siteClaimsIndex.ts`  
**Matching:** `lib/siteAi/matchSiteClaims.ts`  
**Tool:** `get_site_claims` (WebMCP + on-device agent)

## Uniqueness labels

| Label | Meaning |
|-------|---------|
| `site-distinctive` | Synthesis or framing specific to this site (incl. Saturnian+Fomenko+Blip, two-camp UFO frame, sealed-hood/WebMCP thesis when marked repo-unique) |
| `broader-tradition` | Builds on mud-flood, EU, Fomenko, etc. literature |
| `site-position` | Our explicit stance on a common question (includes debunks) |

## Adding or editing a claim

1. Edit `SITE_CLAIMS_INDEX` in `siteClaimsIndex.ts`.
2. Set `canonicalPaths` to real index paths (repo-relative, e.g. `history/mudflood/page.md`).
3. Add `demoQuestions` when the claim answers a chat chip.
4. Use `doNotSay` for anti-patterns (e.g. hedging the site avoids).
5. Run `pnpm run test:unit` — `siteClaims.regression.test.ts` checks demo matching.

## Confidence

- `project-thesis` — site’s argued position (label as thesis in answers)
- `documented` — tied to primary docs the site cites
- `speculative` — exploratory; use sparingly

Agents must still call `read_article` on `canonicalPaths` before treating details as grounded.
