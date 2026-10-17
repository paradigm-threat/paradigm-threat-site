'use client'

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, ChevronDown, FileText } from 'lucide-react'

interface DynamicNavProps {
    children?: React.ReactNode,
    className: string,
    directory: Record<string, any>

    [key: string]: any,
}

type NavFileLeaf = {
    name: string
    title: string
    href: string
}

const META_KEYS = new Set(['_count', '_version', '_title', '_updated', '_commit', '_keywords', '_lqip', '_width', '_height'])
const FILE_LIST_CAP = 12

function isExcludedNavFile (name: string): boolean {
    if (name === 'page.md' || name === 'page.mdx') return true
    if (name.endsWith('.auto.md')) return true
    if (name.startsWith('_')) return true
    return false
}

function isMarkdownNavFile (name: string): boolean {
    if (isExcludedNavFile(name)) return false
    return name.endsWith('.md') || name.endsWith('.mdx') || /\.(txt|cs)$/i.test(name)
}

function isDirNode (val: unknown): val is Record<string, any> {
    return val !== null && typeof val === 'object' && '_count' in (val as object)
}

function isFileNode (val: unknown): val is Record<string, any> {
    return val !== null && typeof val === 'object' && !Array.isArray(val) && !('_count' in (val as object))
}

function fileHref (parentPath: string, name: string): string {
    if (/\.(md|mdx)$/i.test(name)) {
        const base = name.replace(/\.(md|mdx)$/i, '')
        return parentPath + base
    }
    return parentPath + name
}

function fileTitle (name: string, data: Record<string, any> | undefined): string {
    if (typeof data?._title === 'string' && data._title.trim()) return data._title
    return name
        .replace(/\.(md|mdx|txt|cs)$/i, '')
        .replace(/_/g, ' ')
}

/** Returns paths that should be expanded to reveal currentPath (ancestors only) */
function getPathsToCurrent(currentPath: string | null): Set<string> {
    if (!currentPath) return new Set()
    const parts = currentPath.split('/').filter(Boolean)
    const expanded = new Set<string>()
    let path = ''
    for (let i = 0; i < parts.length; i++) {
        path += (path ? '/' : '/') + parts[i]
        expanded.add(path)
    }
    return expanded
}

function partitionDirChildren (data: Record<string, any> | null | undefined): {
    folders: string[]
    files: NavFileLeaf[]
} {
    if (!data || typeof data !== 'object') return { folders: [], files: [] }
    const folders: string[] = []
    const files: NavFileLeaf[] = []
    for (const key of Object.keys(data)) {
        if (META_KEYS.has(key) || key.startsWith('_')) continue
        const val = data[key]
        if (isDirNode(val)) {
            folders.push(key)
        } else if (isFileNode(val) && isMarkdownNavFile(key)) {
            files.push({
                name: key,
                title: fileTitle(key, val),
                href: '', // filled by caller with parent path
            })
        }
    }
    folders.sort((a, b) => a.localeCompare(b))
    files.sort((a, b) => a.name.localeCompare(b.name))
    return { folders, files }
}

const DynamicNav = memo(function DynamicNav({ directory: inputDirectory, children, className }: DynamicNavProps) {
    const currentPath = usePathname()

    const directory = useMemo(() => {
        if (!inputDirectory) return {}

        if (Array.isArray(inputDirectory)) {
            const tree: Record<string, any> = {}
            inputDirectory.forEach(path => {
                if (path === '/' || !path) return
                const normalizedPath = path.startsWith('/') ? path : '/' + path
                const parts = normalizedPath.split('/').filter(Boolean)

                let current = tree
                parts.forEach((part: string, index: number) => {
                    if (index === parts.length - 1 && part.includes('.')) return
                    if (!current[part]) current[part] = { _count: 0 }
                    current = current[part]
                })
            })
            return tree
        }

        const cleanTree = (node: any): any => {
            const result: any = {}
            Object.keys(node).forEach(key => {
                if (key === '_count' || key === '_title') {
                    result[key] = node[key]
                    return
                }
                if (key.startsWith('_') || META_KEYS.has(key)) return
                const val = node[key]
                if (isDirNode(val)) {
                    result[key] = cleanTree(val)
                } else if (isFileNode(val) && isMarkdownNavFile(key)) {
                    result[key] = val
                }
            })
            return result
        }
        return cleanTree(inputDirectory)
    }, [inputDirectory])

    const defaultExpanded = useMemo(() => getPathsToCurrent(currentPath), [currentPath])

    const [expanded, setExpanded] = useState<Set<string>>(() => defaultExpanded)
    const [showAllFiles, setShowAllFiles] = useState<Set<string>>(() => new Set())

    useEffect(() => {
        queueMicrotask(() => setExpanded(new Set(getPathsToCurrent(currentPath))))
    }, [currentPath])

    const toggle = useCallback((path: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(path)) next.delete(path)
            else next.add(path)
            return next
        })
    }, [])

    const expandToCurrent = useCallback(() => {
        setExpanded(new Set(defaultExpanded))
    }, [defaultExpanded])

    const collapseAll = useCallback(() => {
        setExpanded(new Set())
        setShowAllFiles(new Set())
    }, [])

    const toggleShowAllFiles = useCallback((path: string) => {
        setShowAllFiles(prev => {
            const next = new Set(prev)
            if (next.has(path)) next.delete(path)
            else next.add(path)
            return next
        })
    }, [])

    const childKeys = Object.keys(directory)
        .filter(k => !META_KEYS.has(k) && !k.startsWith('_') && isDirNode(directory[k]))
        .sort((a, b) => a.localeCompare(b))

    const INDENT_PER_LEVEL = 16

    function renderFileRow (parentPath: string, file: NavFileLeaf, depth: number): React.ReactNode {
        const href = fileHref(parentPath, file.name)
        const isActive = currentPath === href || currentPath === href + '/' || currentPath?.endsWith('/' + file.name)
        const leftPad = depth * INDENT_PER_LEVEL

        return (
            <div
                key={href}
                className={`
                    flex items-start gap-0.5 rounded-lg text-xs transition-colors min-w-0
                    ${isActive
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'}
                `}
                style={{ paddingLeft: leftPad }}
            >
                <span className="w-[22px] shrink-0 flex items-center justify-center pt-1" aria-hidden>
                    <FileText size={12} className="opacity-70" />
                </span>
                <Link
                    prefetch={false}
                    href={href}
                    className="flex-1 min-w-0 py-1 pr-2 pl-0.5 whitespace-normal break-words [overflow-wrap:anywhere]"
                    title={file.title}
                >
                    {file.title}
                </Link>
            </div>
        )
    }

    function renderItem(parentPath: string, name: string, data: any, depth: number): React.ReactNode {
        const fullPath = parentPath + name
        const { folders, files } = partitionDirChildren(data)
        const fileLeaves = files.map((f) => ({
            ...f,
            href: fileHref(fullPath + '/', f.name),
        }))
        const hasChildren = folders.length > 0 || fileLeaves.length > 0
        const isExpanded = expanded.has(fullPath)
        const isActive = currentPath === fullPath || currentPath?.startsWith(fullPath + '/')
        const count = data?._count ?? 0
        const title = data?._title ?? (name.split('/').pop() ?? '').replace(/_/g, ' ')
        const leftPad = depth * INDENT_PER_LEVEL
        const showAll = showAllFiles.has(fullPath)
        const visibleFiles = showAll ? fileLeaves : fileLeaves.slice(0, FILE_LIST_CAP)
        const hiddenCount = fileLeaves.length - visibleFiles.length

        return (
            <div key={fullPath} className="flex flex-col">
                <div
                    className={`
                        flex items-start gap-0.5 rounded-lg text-sm transition-colors min-w-0
                        ${isActive
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
                    `}
                    style={{ paddingLeft: leftPad }}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); toggle(fullPath) }}
                            className="p-0.5 -m-0.5 mt-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 shrink-0 w-[22px] flex items-center justify-center"
                            aria-expanded={isExpanded}
                        >
                            {isExpanded
                                ? <ChevronDown size={14} className="shrink-0" />
                                : <ChevronRight size={14} className="shrink-0" />}
                        </button>
                    ) : (
                        <span className="w-[18px] shrink-0 flex-shrink-0" aria-hidden />
                    )}
                    <Link
                        prefetch={false}
                        href={fullPath}
                        className="flex-1 min-w-0 flex items-start justify-between gap-2 py-1.5 pr-2 pl-0.5"
                    >
                        <span className="whitespace-normal break-words [overflow-wrap:anywhere]">{title}</span>
                        {count > 0 && <span className="text-[10px] opacity-50 font-normal shrink-0 pt-0.5">({count})</span>}
                    </Link>
                </div>
                {hasChildren && isExpanded && (
                    <div className="space-y-0.5">
                        {folders.map(sub => renderItem(fullPath + '/', sub, data[sub], depth + 1))}
                        {visibleFiles.map((file) => renderFileRow(fullPath + '/', file, depth + 1))}
                        {hiddenCount > 0 && (
                            <button
                                type="button"
                                onClick={() => toggleShowAllFiles(fullPath)}
                                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 text-left"
                                style={{ paddingLeft: (depth + 1) * INDENT_PER_LEVEL + 22 }}
                            >
                                Show all {fileLeaves.length} files…
                            </button>
                        )}
                        {showAll && fileLeaves.length > FILE_LIST_CAP && (
                            <button
                                type="button"
                                onClick={() => toggleShowAllFiles(fullPath)}
                                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 text-left"
                                style={{ paddingLeft: (depth + 1) * INDENT_PER_LEVEL + 22 }}
                            >
                                Show fewer files
                            </button>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={`space-y-1 ${className || ''}`}>
            {children}
            <div className="flex items-center gap-1 pb-2">
                <button
                    type="button"
                    onClick={collapseAll}
                    className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded"
                >
                    Collapse all
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                    type="button"
                    onClick={expandToCurrent}
                    className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded"
                >
                    Expand to current
                </button>
            </div>
            <div className="space-y-0.0">
                {childKeys.map(key => renderItem('/', key, directory[key], 0))}
            </div>
        </div>
    )
})

export default DynamicNav
