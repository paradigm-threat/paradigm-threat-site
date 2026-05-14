'use client'

import React from 'react'
import type { MarkdownCompileDiagnostics } from './diagnostics'

export interface MarkdownCompileErrorPanelProps {
  diagnostics: MarkdownCompileDiagnostics
  /** Optional path label (repo-relative or URL). */
  sourcePath?: string
}

const KIND_LABEL: Record<MarkdownCompileDiagnostics['kind'], string> = {
  unknown_tag: 'Unknown component tag',
  malformed_tag: 'Malformed tag',
  unclosed_tag: 'Unclosed tag',
  mdx_syntax: 'Unsupported MDX / JSX syntax',
  wasm: 'Runtime (WASM)',
  json: 'Parse error',
  runtime: 'Render error',
}

export function MarkdownCompileErrorPanel ({
  diagnostics,
  sourcePath,
}: MarkdownCompileErrorPanelProps) {
  const loc =
    diagnostics.line != null
      ? `Line ${diagnostics.line}${diagnostics.column != null ? `, column ${diagnostics.column + 1}` : ''}`
      : null

  return (
    <div
      className="relay-markdown-error not-prose rounded-2xl border border-red-300/80 bg-red-50/90 p-6 text-left shadow-sm dark:border-red-900/60 dark:bg-red-950/40"
      role="alert"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-red-200/80 pb-3 dark:border-red-900/50">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
          Markdown compile error
        </h2>
        <span className="text-xs font-mono uppercase tracking-wide text-red-700/80 dark:text-red-300/80">
          {KIND_LABEL[diagnostics.kind]}
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
            Markdown excerpt
          </p>
          <pre className="max-h-[min(24rem,50vh)] overflow-auto rounded-xl border border-red-200/70 bg-white/90 p-4 font-mono text-xs leading-relaxed text-slate-900 dark:border-red-900/50 dark:bg-slate-950/80 dark:text-slate-100">
            {diagnostics.codeFrame}
          </pre>
        </div>
      ) : null}

      {diagnostics.hint ? (
        <p className="mt-4 text-xs leading-relaxed text-red-800/90 dark:text-red-200/90">
          <strong>Hint:</strong> {diagnostics.hint}
        </p>
      ) : null}

      <details className="mt-4 text-sm text-red-900/85 dark:text-red-100/85">
        <summary className="cursor-pointer select-none font-medium text-red-800 dark:text-red-200">
          Full message
        </summary>
        <pre className="mt-2 max-h-[min(20rem,40vh)] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-red-200/60 bg-white/70 p-3 font-mono text-xs dark:border-red-900/40 dark:bg-slate-950/60">
          {diagnostics.fullMessage}
        </pre>
      </details>
    </div>
  )
}
