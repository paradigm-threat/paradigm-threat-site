import type { Metadata } from 'next'
import Link from 'next/link'
import { isMcpServerEnabled } from '@/lib/siteOpsFeature'

export const metadata: Metadata = {
  title: 'Research MCP',
  description:
    'Model Context Protocol server for Paradigm Threat — search, chronology dates, and corpus-grounded research for AI agents.',
  alternates: { canonical: 'https://old.paradigmthreat.net/mcp' },
}

const MCP_ENDPOINT = 'https://old.paradigmthreat.net/api/mcp'

export default function McpPage () {
  const enabled = isMcpServerEnabled()

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Research MCP
        </h1>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          Paradigm Threat exposes a read-only{' '}
          <a
            href="https://modelcontextprotocol.io"
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Model Context Protocol
          </a>{' '}
          server so agents can search investigations, match site thesis cards, check research coverage,
          and compute timeline dates — grounded in the same Relay corpus as the site, with explicit
          gaps when a topic is not indexed.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Endpoint</h2>
        <p className="font-mono text-sm break-all text-slate-700 dark:text-slate-300">
          {MCP_ENDPOINT}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Status:{' '}
          {enabled
            ? <span className="text-emerald-600 dark:text-emerald-400">enabled on this deployment</span>
            : <span className="text-amber-600 dark:text-amber-400">disabled (MCP_SERVER_ENABLED not set)</span>}
        </p>
        {enabled && (
          <p className="text-sm">
            <Link href="/api/mcp?health=1" className="text-blue-600 dark:text-blue-400 hover:underline">
              Health check JSON
            </Link>
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tools</h2>
        <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
          <li><code className="text-xs">search_site</code> / <code className="text-xs">search</code> — keyword search over articles and timeline</li>
          <li><code className="text-xs">research_status</code> — coverage envelope (including <code className="text-xs">not_in_corpus</code>)</li>
          <li><code className="text-xs">get_site_claims</code> — curated thesis cards</li>
          <li><code className="text-xs">read_article</code> / <code className="text-xs">fetch</code> — markdown from Relay mirrors</li>
          <li><code className="text-xs">get_event_dates</code> / <code className="text-xs">compute_years_ago</code> — chronology and blip-adjusted elapsed time</li>
          <li><code className="text-xs">submit_investigation_idea</code> — propose a new topic for the site to research (appears on <Link href="/submit" className="text-blue-600 dark:text-blue-400 hover:underline">/submit</Link>)</li>
          <li><code className="text-xs">submit_chat_comment</code> — post to a chat channel on Relay <code className="text-xs">chat/public</code> branch</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cursor</h2>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 text-slate-100 p-4 text-xs leading-relaxed">
{`{
  "mcpServers": {
    "paradigm-threat": {
      "url": "${MCP_ENDPOINT}"
    }
  }
}`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">ChatGPT</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Settings → Apps → Create app → Server URL <code className="text-xs">{MCP_ENDPOINT}</code>, authentication <strong>No Auth</strong>.
          Add the app as a source in chat before asking research questions.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Host restrictions</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The MCP endpoint is public and read-mostly, but <strong>the host model may refuse to call tools</strong> — especially on free or consumer tiers (ChatGPT, Gemini, etc.). Common blocks: real people and alleged crimes or deaths, defamation-shaped framing, or write tools without explicit user confirmation. That happens in the host&apos;s safety layer <em>before</em> a request reaches paradigmthreat.net; connector installed and tools listed does not guarantee every query will run.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Neutral corpus prompts often work better: search for a title or codename, list paths only, or call <code className="text-xs">research_status</code> without asking the model to assert claims. Cursor and other dev-oriented clients are usually less restrictive than free ChatGPT.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notes</h2>
        <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2">
          <li>Browser <strong>WebMCP</strong> remains client-side on article pages; this server MCP is for hosts without an open tab (Cursor, ChatGPT Apps).</li>
          <li>Citations should prefer primary sources returned by tools — not paradigmthreat.net unless the claim is original to the repo.</li>
          <li>Implementation details: site repo <code className="text-xs">docs/MCP_VERCEL_DEPLOY.md</code>.</li>
        </ul>
      </section>
    </div>
  )
}
