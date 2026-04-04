'use client'

import React, { useState, useEffect } from 'react'
import { getPrimaryFilesBaseUrl, getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'
import styles from './ChangeLog.module.css'

function toHrefForRepo(pathLike, repo) {
  const clean = String(pathLike || '').replace(/^\/+/, '')
  if (!clean) return null
  if (repo === 'paradigm-threat-timeline') {
    return clean.startsWith('timeline/') ? `/${clean}` : `/timeline/${clean}`.replace(/\/+/g, '/')
  }
  return `/${clean}`
}

function inferFilesFromMessage(message, repo) {
  if (typeof message !== 'string' || !message) return []
  const pathMatch = message.match(/\b([a-z0-9._-]+\/[a-z0-9._\/-]+)\b/i)
  if (!pathMatch) return []
  const rawPath = pathMatch[1].replace(/[),.;:!?]+$/, '')
  const href = toHrefForRepo(rawPath, repo)
  if (!href) return []
  return [{ path: rawPath, href, status: 'M' }]
}

function normalizeEntry(entry, fallbackRepo) {
  if (!entry || typeof entry !== 'object') return null
  const repo = entry.repo || fallbackRepo
  const explicitFiles =
    Array.isArray(entry.files) ? entry.files
      : Array.isArray(entry.changedFiles) ? entry.changedFiles
        : Array.isArray(entry.paths) ? entry.paths.map((p) => ({ path: p, href: toHrefForRepo(p, repo), status: 'M' }))
          : []
  const files = explicitFiles.length > 0 ? explicitFiles : inferFilesFromMessage(entry.message || '', repo)
  return {
    repo,
    hash: entry.hash || '',
    date: entry.date || '',
    message: entry.message || '',
    files
  }
}

function getFileLabel(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) return 'file'
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || normalized
}

export default function ChangeLog({ target = '_self' }) {
  const [changeLog, setChangeLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChangeLog = async () => {
      try {
        const filesBaseUrl = getPrimaryFilesBaseUrl()
        const timelineBaseUrl = getPrimaryTimelineBaseUrl()

        const [filesRes, timelineRes] = await Promise.allSettled([
          fetch(`${filesBaseUrl}/changelog.json`, { cache: 'no-store' }),
          fetch(`${timelineBaseUrl}/changelog.json`, { cache: 'no-store' })
        ])

        const filesData =
          filesRes.status === 'fulfilled' && filesRes.value.ok
            ? await filesRes.value.json()
            : []
        const timelineData =
          timelineRes.status === 'fulfilled' && timelineRes.value.ok
            ? await timelineRes.value.json()
            : []

        const merged = [
          ...(Array.isArray(filesData) ? filesData.map((x) => normalizeEntry(x, 'paradigm-threat-files')).filter(Boolean) : []),
          ...(Array.isArray(timelineData) ? timelineData.map((x) => normalizeEntry(x, 'paradigm-threat-timeline')).filter(Boolean) : [])
        ]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 16)

        setChangeLog(merged)
      } catch (e) {
        console.error('Failed to fetch changelog.json', e)
      } finally {
        setLoading(false)
      }
    }

    fetchChangeLog()
  }, [])

  if (loading) {
    return <div className="animate-pulse flex space-x-4 p-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div></div></div>
  }

  return (
    <ul className={styles.changelog}>
      {Array.isArray(changeLog) && changeLog.map(entry => (
        <li key={`${entry.repo}:${entry.hash}`}>
          <div>
            {new Date(entry.date).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })} - {entry.message} ({entry.repo})
          </div>
          {Array.isArray(entry.files) && entry.files.length > 0 && (
            <div>
              {entry.files.map((file, idx) => (
                <React.Fragment key={`${entry.hash}:${file.path}:${idx}`}>
                  {idx > 0 ? ' | ' : ''}
                  <a href={file.href} target={target} title={file.path}>{getFileLabel(file.path)}</a>
                </React.Fragment>
              ))}
            </div>
          )}
          {(!Array.isArray(entry.files) || entry.files.length === 0) && (
            <div className="opacity-70 text-sm">no file links in source changelog yet</div>
          )}
        </li>
      ))}
    </ul>
  )
}
