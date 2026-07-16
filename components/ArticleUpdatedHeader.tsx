'use client'

import React, { useMemo } from 'react'
import { useFiles } from '@/components/FilesContext'
import { catalogLeafAtPath, shortCommitTitle } from '@/lib/catalogLeafAtPath'
import { formatIndexDateWithLocalTime } from '@/lib/indexUpdated'

export function ArticleUpdatedHeader ({ articleMdPath }: { articleMdPath?: string }) {
  const { fileList } = useFiles()

  const meta = useMemo(() => {
    if (!articleMdPath) return null
    return catalogLeafAtPath(fileList, articleMdPath)
  }, [fileList, articleMdPath])

  const updatedLabel = formatIndexDateWithLocalTime(meta?._updated)
  if (!updatedLabel) return null

  const title = shortCommitTitle(meta?._commit) ?? undefined

  return (
    <p
      className="not-prose mb-4 text-sm text-slate-500 dark:text-slate-400 tabular-nums"
      title={title}
    >
      Last updated: {updatedLabel}
    </p>
  )
}
