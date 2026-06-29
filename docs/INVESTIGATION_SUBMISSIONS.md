# Investigation submissions — ops

Visitor-proposed topics land in Postgres (`investigation_submissions`) via `/submit`, Site AI, search CTA, or the `submit_investigation_idea` WebMCP tool. **There is no admin UI on the site.**

## Database

- **Store:** Vercel-linked Neon project (`paradigm-threat-postgres`), database `verceldb`
- **Env:** `POSTGRES_*` / `POSTGRES_URL` — same connection for local dev (after `vercel env pull .env.local`) and production
- **Schema:** table `investigation_submissions` (already created in Neon `verceldb`). Columns: `id`, `created_at`, `topic`, `description`, `urls` (jsonb), `email`, `is_anonymous`, `source`, `search_query`. New schema changes: apply in Neon SQL Editor or `psql` — no checked-in migration files.

Public GET `/api/investigation-submissions` is CDN-cached (~60s); POST busts the server cache tag. Email is stored but never returned on the public list.

## Triage workflow (no admin UI)

Review and close submissions **outside the website**, the same way you already create investigations in Cursor:

1. **List open submissions** — Neon console → Tables → `investigation_submissions`, or SQL:

   ```sql
   SELECT id, created_at, topic, description, urls, email, source, search_query
   FROM investigation_submissions
   ORDER BY created_at DESC;
   ```

2. **Draft the investigation** — add markdown under `paradigm-threat-files/` (e.g. `events/.../investigations/...`) using your normal Cursor workflow.

3. **Remove the queue row** — after the investigation exists (or if rejecting spam), delete from Postgres. An LLM agent in Cursor is the expected tool for this step; there is no delete API or dashboard.

   ```sql
   DELETE FROM investigation_submissions WHERE id = $1;
   ```

   Optionally verify the public list no longer shows it (may take up to CDN cache TTL unless cache was revalidated).

Do **not** leave processed rows in the table — the `/submit` page lists recent submissions for visitors; the table is a **queue**, not an archive.

**Cache note:** GET `/api/investigation-submissions` is cached (CDN ~60s + stale-while-revalidate). Deletes done directly in SQL do **not** call `revalidateTag`, so the public list can lag briefly. Neon is always authoritative; the site catches up after cache expiry or a hard refresh.

## Agent instructions (Cursor)

When asked to process investigation submissions:

- Read rows from `investigation_submissions` (Neon or `POSTGRES_URL` via a one-off script).
- Use `topic`, `description`, and `urls` as the brief; respect optional private `email` only for follow-up, never in published content.
- Create or extend investigation markdown in `paradigm-threat-files`.
- **`DELETE` the submission row** when done so the public list stays accurate.

## API reference

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/investigation-submissions?limit=50` | Public DTO only; cached |
| POST | `/api/investigation-submissions` | Rate-limited; honeypot field `website` |

Feature flag: `NEXT_PUBLIC_INVESTIGATION_SUBMIT=0` disables both routes (503).

## Related code

- `server/investigationSubmissionsDB.ts` — insert + public list
- `lib/investigationSubmission/validateSubmission.ts` — Zod + public mapper
- `app/(main)/submit/page.tsx` — form + recent list
- `docs/WEBMCP_INTEGRATION.md` — `submit_investigation_idea` tool
