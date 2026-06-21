'use client'

import React from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { AgentProgressStep } from '@/lib/siteAi/agentProgress'

type AgentProgressPanelProps = {
  active: boolean
  current: string
  slowHint: string | null
  error?: string | null
  steps: AgentProgressStep[]
  className?: string
  variant?: 'inline' | 'panel'
}

export function AgentProgressPanel ({
  active,
  current,
  slowHint,
  error = null,
  steps,
  className = '',
  variant = 'panel',
}: AgentProgressPanelProps) {
  if (!active) return null

  const shell = variant === 'panel'
    ? 'rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2.5 space-y-2'
    : 'space-y-1.5'

  return (
    <div className={`${shell} ${className}`.trim()} role="status" aria-live="polite">
      <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        {!error && <Loader2 className="h-4 w-4 shrink-0 animate-spin mt-0.5 text-indigo-500" />}
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${error ? 'text-red-600 dark:text-red-400' : ''}`}>
            {error || current || 'Working…'}
          </p>
          {!error && slowHint && (
            <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-1">{slowHint}</p>
          )}
        </div>
      </div>
      {!error && steps.length > 0 && (
        <ul className="space-y-1 pl-6 text-xs text-slate-500 dark:text-slate-400 max-h-32 overflow-y-auto">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-1.5">
              {step.status === 'done' ? (
                <Check className="h-3 w-3 shrink-0 mt-0.5 text-emerald-500" aria-hidden />
              ) : (
                <Loader2 className="h-3 w-3 shrink-0 mt-0.5 animate-spin text-indigo-400" aria-hidden />
              )}
              <span className={step.status === 'done' ? 'line-through opacity-70' : ''}>
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
