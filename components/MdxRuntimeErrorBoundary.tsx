'use client'

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import Link from 'next/link'

export interface MdxRuntimeErrorBoundaryProps {
  children: ReactNode
  /** Shown in fallback (e.g. article URL path). */
  sourcePath?: string
}

interface State {
  error: Error | null
  resetNonce: number
}

/**
 * Catches render-time errors from MDX output (invalid JSX props, etc.) so the rest of the page shell stays up.
 */
export class MdxRuntimeErrorBoundary extends Component<MdxRuntimeErrorBoundaryProps, State> {
  state: State = { error: null, resetNonce: 0 }

  static getDerivedStateFromError (error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch (error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MdxRuntimeErrorBoundary]', error.message, info.componentStack)
    }
  }

  handleRetry = (): void => {
    this.setState((s) => ({ error: null, resetNonce: s.resetNonce + 1 }))
  }

  render (): ReactNode {
    const { children, sourcePath } = this.props
    const { error, resetNonce } = this.state

    if (error) {
      return (
        <div
          className="not-prose my-6 rounded-2xl border border-amber-300/90 bg-amber-50/95 p-6 text-left shadow-sm dark:border-amber-800/70 dark:bg-amber-950/50"
          role="alert"
        >
          <h2 className="text-lg font-semibold text-amber-950 dark:text-amber-100">
            MDX render error
          </h2>
          {sourcePath ? (
            <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-100/90">
              <span className="font-medium">Path:</span>{' '}
              <code className="rounded bg-amber-100/90 px-1.5 py-0.5 text-xs dark:bg-amber-900/60">
                {sourcePath}
              </code>
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-amber-950 dark:text-amber-50">
            {error.message}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-xl border border-amber-400/80 bg-white px-4 py-2 text-sm font-medium text-amber-950 shadow-sm hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-50 dark:hover:bg-amber-900/70"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Search
            </Link>
          </div>
        </div>
      )
    }

    return <div key={resetNonce}>{children}</div>
  }
}
