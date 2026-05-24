'use client'

import React, { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dices } from 'lucide-react'
import {
  fetchMergedSearchIndexClient,
  pickRandomFeelingLuckyHref,
} from '@/lib/clientMergedSearchIndex'

interface FeelingLuckyButtonProps {
  className?: string
}

export function FeelingLuckyButton ({ className = '' }: FeelingLuckyButtonProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = useCallback(async () => {
    setError(null)
    setPending(true)
    try {
      const entries = await fetchMergedSearchIndexClient()
      if (!entries?.length) {
        setError('Could not load search index from Relay')
        return
      }
      const href = pickRandomFeelingLuckyHref(entries)
      if (!href) {
        setError('No articles in index')
        return
      }
      router.push(href)
    } catch {
      setError('Network error')
    } finally {
      setPending(false)
    }
  }, [router])

  return (
    <div className={`space-y-1 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-200/80 dark:bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-300/80 dark:hover:bg-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Dices size={16} className="shrink-0 opacity-80" aria-hidden />
        {pending ? 'Picking…' : "I'm Feeling Lucky"}
      </button>
      {error ? (
        <p className="text-[10px] text-red-600 dark:text-red-400 px-1">{error}</p>
      ) : null}
    </div>
  )
}
