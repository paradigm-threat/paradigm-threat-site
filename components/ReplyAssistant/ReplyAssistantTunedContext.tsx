'use client'

import React from 'react'
import Link from 'next/link'
import { getReplyAssistantContextSections } from '@/lib/replyAssistant/replyAssistantContextCatalog'

const SECTIONS = getReplyAssistantContextSections()

export function ReplyAssistantTunedContext () {
  return (
    <section
      className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-8"
      aria-labelledby="reply-tuned-context-heading"
    >
      <div className="space-y-2">
        <h2
          id="reply-tuned-context-heading"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Topics this assistant is tuned on
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Derived from the site claims index and antisemitism reply playbook in code — not hand-edited
          copy. The agent still searches the full article corpus via WebMCP; these are the curated
          context cards and attack-specific playbooks it is prompted to prefer.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.id} className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {section.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {section.description}
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Topic</th>
                  <th className="px-3 py-2 font-medium">Lead / strategy</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {section.rows.map((row) => (
                  <tr key={row.id} className="bg-white dark:bg-slate-950/40 align-top">
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {row.topic}
                      {row.meta && (
                        <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                          {row.meta}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-md">
                      {row.summary}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.href ? (
                        <Link
                          href={row.href}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                        >
                          Article
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  )
}
