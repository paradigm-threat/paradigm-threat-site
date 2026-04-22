import React from 'react'
import type { MdxCompileDiagnostics } from '@/lib/mdxCompileDiagnostics'

export interface MdxCompileErrorPanelProps {
  diagnostics: MdxCompileDiagnostics
  /** Repo-relative path or site URL path (no leading slash). */
  sourcePath?: string
  phase?: 'server' | 'client'
}

/**
 * Rich MDX compile error surface for authors (SSR + client /api/article failures).
 */
export function MdxCompileErrorPanel ({
  diagnostics,
  sourcePath,
  phase = 'server'
}: MdxCompileErrorPanelProps) {
  const loc =
    diagnostics.line != null
      ? `Line ${diagnostics.line}${diagnostics.column != null ? `, column ${diagnostics.column}` : ''}`
      : null

  return (
    <div
      className="not-prose rounded-2xl border border-red-300/80 bg-red-50/90 p-6 text-left shadow-sm dark:border-red-900/60 dark:bg-red-950/40"
      role="alert"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-red-200/80 pb-3 dark:border-red-900/50">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
          MDX compile error
        </h2>
        <span className="text-xs font-mono uppercase tracking-wide text-red-700/80 dark:text-red-300/80">
          {phase === 'server' ? 'Server render' : 'Client / API'}
        </span>
      </div>

      {sourcePath ? (
        <p className="mt-3 text-sm text-red-900/90 dark:text-red-100/90">
          <span className="font-medium">Source:</span>{' '}
          <code className="rounded bg-red-100/80 px-1.5 py-0.5 text-xs dark:bg-red-900/50">
            {sourcePath}
          </code>
        </p>
      ) : null}

      {loc ? (
        <p className="mt-2 text-sm font-medium text-red-800 dark:text-red-200">{loc}</p>
      ) : null}

      <p className="mt-3 text-sm leading-relaxed text-red-950 dark:text-red-50">
        {diagnostics.headline}
      </p>

      {diagnostics.codeFrame ? (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-800/80 dark:text-red-200/80">
            Source excerpt
          </p>
          <pre className="max-h-[min(24rem,50vh)] overflow-auto rounded-xl border border-red-200/70 bg-white/90 p-4 text-xs leading-relaxed text-slate-900 dark:border-red-900/50 dark:bg-slate-950/80 dark:text-slate-100">
            {diagnostics.codeFrame}
          </pre>
        </div>
      ) : null}

      <details className="mt-4 text-sm text-red-900/85 dark:text-red-100/85">
        <summary className="cursor-pointer select-none font-medium text-red-800 dark:text-red-200">
          Full compiler message
        </summary>
        <pre className="mt-2 max-h-[min(20rem,40vh)] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-red-200/60 bg-white/70 p-3 text-xs dark:border-red-900/40 dark:bg-slate-950/60">
          {diagnostics.fullMessage}
        </pre>
      </details>

      <p className="mt-4 text-xs leading-relaxed text-red-800/90 dark:text-red-200/90">
        <strong>Common fix:</strong> site pages use MDX, not plain CommonMark HTML. Replace HTML comments{' '}
        <code className="rounded bg-red-100/90 px-1 dark:bg-red-900/60">&lt;!-- … --&gt;</code> with JSX comments{' '}
        <code className="rounded bg-red-100/90 px-1 dark:bg-red-900/60">{'{/* … */}'}</code>
        . See{' '}
        <a
          className="font-medium underline decoration-red-600/60 underline-offset-2 hover:decoration-red-800 dark:decoration-red-400"
          href="https://mdxjs.com/docs/troubleshooting-mdx"
          rel="noreferrer"
          target="_blank"
        >
          MDX troubleshooting
        </a>
        .
      </p>
    </div>
  )
}
