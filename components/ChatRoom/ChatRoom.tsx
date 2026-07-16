'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary'
import SuspenseLoader from '../atoms/SuspenseLoader/SuspenseLoader'
import { ChatMarkdown } from './ChatMarkdown'
import { ChatRelayUnavailableNotice } from '@/components/chat/ChatRelayUnavailableNotice'
import {
  queryChannels,
  queryPosts,
  queryRecentPosts,
  queryUserPosts,
  putComment,
  type ChatChannelInfo,
  type ChatLoadProgress,
  type ChatPostEntry,
} from '@/lib/chat/relayChatClient'
import { checkChatSubmitRateLimit } from '@/lib/chatSubmission/rateLimit'
import { Send, User, MessageSquare, AlertCircle, RefreshCcw, Maximize2, Minimize2, ArrowLeft } from 'lucide-react'

interface ChatRoomProps {
    channel?: string
    title?: string
    className?: string
    mode?: 'full'
}

interface ChannelEntry extends ChatPostEntry {
    isError?: boolean
}

interface ChannelContent {
    channel: string
    posts: Array<ChannelEntry>
}

function formatPostTime(created: string): string {
    const d = new Date(created)
    const now = new Date()
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (isToday) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function getChannelFromPath(pathname: string | null): string | null {
    if (!pathname) return null
    const segments = pathname.split('/').filter(Boolean)
    if (segments[0] === 'chat' && segments[1]) return segments[1]
    return null
}

type ChatView = 'channel' | 'recent' | 'user'

export default function ChatRoom({ channel: channelProp, title, className, mode }: ChatRoomProps) {
    const pathname = usePathname()
    const channelFromPath = getChannelFromPath(pathname)

    const [channelContent, setChannelContent] = useState<ChannelContent | null>(null)
    const [channelList, setChannelList] = useState<ChatChannelInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [loadStatus, setLoadStatus] = useState<string>('Connecting to Relay…')
    const [submitting, setSubmitting] = useState(false)
    const [relayUnavailable, setRelayUnavailable] = useState<string | null>(null)
    const [postCount, setPostCount] = useState<number>(0)
    const DEFAULT_HOME_CHANNEL = 'general'
    const [currentChannelName, setCurrentChannelName] = useState<string>(channelFromPath || channelProp || DEFAULT_HOME_CHANNEL)
    const [currentUserName, setCurrentUserName] = useState<string>('')
    const [view, setView] = useState<ChatView>('channel')
    const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
    const [recentPosts, setRecentPosts] = useState<ChatPostEntry[]>([])
    const [recentLoading, setRecentLoading] = useState(false)
    const [recentError, setRecentError] = useState<string | null>(null)
    const [userPosts, setUserPosts] = useState<ChatPostEntry[]>([])
    const [userLoading, setUserLoading] = useState(false)
    const [userError, setUserError] = useState<string | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)

    const addError = useCallback((error: string) => {
        setChannelContent(prev => {
            const newEntry: ChannelEntry = {
                id: 'error',
                channel: currentChannelName,
                channel_name: currentChannelName,
                username: 'system',
                created: new Date().toISOString(),
                content: error,
                anonymous: false,
                path: '',
                isError: true,
            }
            return {
                channel: currentChannelName,
                posts: [newEntry, ...(prev?.posts || [])]
            }
        })
    }, [currentChannelName])

    useEffect(() => {
        const username = localStorage.getItem('ChatRoom:username')
        if (username) setCurrentUserName(username)
    }, [])

    const onLoadProgress = useCallback((p: ChatLoadProgress) => {
        const count =
            p.total != null && p.loaded != null && p.total > 0
                ? ` (${p.loaded}/${p.total})`
                : ''
        setLoadStatus(`${p.detail}${count}`)
    }, [])

    const fetchPosts = useCallback(() => {
        if (!currentChannelName) return
        setLoading(true)
        setRelayUnavailable(null)
        setLoadStatus(`Loading #${currentChannelName}…`)
        queryPosts(currentChannelName, 50, { onProgress: onLoadProgress })
            .then((data) => setChannelContent(data))
            .catch((error: Error) => {
                console.error(error)
                setRelayUnavailable(error.message)
                addError(error.message)
            })
            .finally(() => setLoading(false))
    }, [currentChannelName, addError, onLoadProgress])

    useEffect(() => { fetchPosts() }, [fetchPosts, postCount])

    useEffect(() => {
        if (channelFromPath && channelFromPath !== currentChannelName) {
            setCurrentChannelName(channelFromPath)
            setChannelContent(null)
        }
    }, [channelFromPath, currentChannelName])

    useEffect(() => {
        if (mode === 'full') {
            setLoadStatus('Loading channels…')
            queryChannels({ onProgress: onLoadProgress })
                .then((channels) => {
                    setChannelList(channels)
                    if (channels.length > 0) {
                        const validFromPath = channelFromPath && channels.some((c) => c.name === channelFromPath)
                        const hasGeneral = channels.some((c) => c.name === DEFAULT_HOME_CHANNEL)
                        setCurrentChannelName((prev) =>
                            validFromPath ? channelFromPath
                                : !channelFromPath && hasGeneral ? DEFAULT_HOME_CHANNEL
                                : (prev && channels.some((c) => c.name === prev) ? prev : channels[0].name)
                        )
                    }
                })
                .catch((error: Error) => {
                    console.error(error)
                    setRelayUnavailable(error.message)
                    addError(error.message)
                })
        }
    }, [mode, channelFromPath, addError, onLoadProgress])

    const goToChannel = useCallback((name: string) => {
        setView('channel')
        setCurrentChannelName(name)
        setChannelContent(null)
    }, [])

    const showRecent = useCallback(() => {
        setView('recent')
        setRecentLoading(true)
        setRecentError(null)
        setLoadStatus('Loading recent messages…')
        queryRecentPosts(50, { onProgress: onLoadProgress })
            .then((json) => setRecentPosts(json.posts || []))
            .catch((err: Error) => setRecentError(err.message))
            .finally(() => setRecentLoading(false))
    }, [onLoadProgress])

    const showUser = useCallback((author: string) => {
        if (!author || author === 'anonymous' || author === 'system') return
        setView('user')
        setSelectedAuthor(author)
        setUserLoading(true)
        setUserError(null)
        setUserPosts([])
        setLoadStatus(`Loading posts by @${author}…`)
        queryUserPosts(author, 20, { onProgress: onLoadProgress })
            .then((json) => {
                setUserPosts(json.recentPosts.map((p) => ({
                    id: p.id,
                    channel: p.channel_name,
                    channel_name: p.channel_name,
                    username: author,
                    created: p.created,
                    content: p.content,
                    anonymous: false,
                    path: '',
                })))
            })
            .catch((err: Error) => setUserError(err.message))
            .finally(() => setUserLoading(false))
    }, [onLoadProgress])

    const backToChannel = useCallback(() => {
        setView('channel')
    }, [])

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget
        const formData = new FormData(form)
        const username = (formData.get('username') as string)?.trim() || 'guest'
        const content = (formData.get('content') as string)?.trim()

        if (!content) return
        if (!checkChatSubmitRateLimit('chatroom')) {
            addError('Too many messages. Please wait a moment.')
            return
        }

        localStorage.setItem('ChatRoom:username', username)
        setSubmitting(true)

        try {
            const post = await putComment({
                channel: currentChannelName,
                content,
                author: username,
                anonymous: false,
                source: 'web',
            })

            const newEntry: ChannelEntry = {
                ...post,
                username: post.username,
            }
            setChannelContent((prev) =>
                prev ? { ...prev, posts: [newEntry, ...prev.posts] } : { channel: currentChannelName, posts: [newEntry] }
            )

            form.reset()
            setPostCount(prev => prev + 1)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Failed to post message'
            addError(msg)
        } finally {
            setSubmitting(false)
        }
    }

    const inputDisabled = submitting || loading || !!relayUnavailable

    const containerClassName = `relative flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl ${className || ''} ${isExpanded ? 'fixed inset-0 z-[110] min-h-0' : 'h-[70vh]'} select-none`

    return (
        <ErrorBoundary assetName="ChatRoom">
            <div className={containerClassName}>
                {relayUnavailable && <ChatRelayUnavailableNotice message={relayUnavailable} />}
                <span className="absolute opacity-0 pointer-events-none select-text">
                    [Paradigm Threat Live Chat: {title || currentChannelName}]
                </span>

                {/* Header */}
                <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        {(view === 'recent' || view === 'user') && (
                            <button
                                onClick={backToChannel}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                                title="Back to channel"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div className="p-2 bg-blue-600 rounded-lg text-white">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white leading-none mb-1">
                                {view === 'recent' ? 'Recent messages' : view === 'user' && selectedAuthor ? selectedAuthor : title || `Channel: ${currentChannelName}`}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                                {view === 'recent' ? 'Latest activity' : view === 'user' ? 'User profile' : 'Relay public chat'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {mode === 'full' && view === 'channel' && (
                            <>
                                <button
                                    onClick={showRecent}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Recent
                                </button>
                                <select
                                    value={currentChannelName}
                                    onChange={(e) => goToChannel(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                >
                                    {channelList.map((c) => (
                                        <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </>
                        )}
                        {mode === 'full' && (view === 'recent' || view === 'user') && (
                            <button
                                onClick={backToChannel}
                                className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                Back to channel
                            </button>
                        )}
                        <button
                            onClick={() => setIsExpanded((x) => !x)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                            title={isExpanded ? 'Shrink' : 'Expand to fill window'}
                        >
                            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                        {view === 'channel' && (
                            <button
                                onClick={() => setPostCount(prev => prev + 1)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                                title="Refresh messages"
                            >
                                <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content area */}
                <div className="flex-grow overflow-y-auto p-6 space-y-4 scroll-smooth">
                    {view === 'channel' && (
                        <>
                            {loading && !channelContent && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                                    <SuspenseLoader />
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {loadStatus}
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-sm text-center">
                                        Chat reads from Relay QUERY on branch chat/public.
                                        First load after an index rebuild can take longer.
                                    </p>
                                </div>
                            )}
                            {loading && channelContent && (
                                <div className="text-xs text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                                    {loadStatus}
                                </div>
                            )}

                            {channelContent?.posts?.map((post, index) => (
                                <div
                                    key={post.id === 'error' ? `err-${index}` : post.id}
                                    className={`flex flex-col ${post.isError ? 'bg-red-500/10 border border-red-500/20 p-4 rounded-xl shadow-inner' : ''}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {!post.isError && post.username !== 'anonymous' && post.username !== 'system' ? (
                                            <button
                                                type="button"
                                                onClick={() => showUser(post.username)}
                                                className="font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline text-left"
                                            >
                                                {post.username}
                                            </button>
                                        ) : (
                                            <span className={`font-bold text-sm ${post.isError ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                                {post.username}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {formatPostTime(post.created)}
                                        </span>
                                        {post.isError && <AlertCircle size={14} className="text-red-500" />}
                                    </div>
                                    <div className={`prose prose-sm dark:prose-invert max-w-none prose-p:mb-0 ${post.isError ? 'text-red-500 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                        <ChatMarkdown content={typeof post.content === 'string' ? post.content : ''} />
                                    </div>
                                </div>
                            ))}

                            {!loading && channelContent?.posts?.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 opacity-50">
                                    <MessageSquare size={48} />
                                    <p>No messages yet. Be the first to speak!</p>
                                </div>
                            )}
                        </>
                    )}

                    {view === 'recent' && (
                        <>
                            {recentLoading && recentPosts.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                                    <SuspenseLoader />
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {loadStatus}
                                    </p>
                                </div>
                            )}
                            {recentError && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500">
                                    {recentError}
                                </div>
                            )}
                            {!recentLoading && !recentError && recentPosts.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 opacity-50">
                                    <MessageSquare size={48} />
                                    <p>No messages yet.</p>
                                </div>
                            )}
                            {!recentError && recentPosts.map((post) => (
                                <div
                                    key={post.id}
                                    className="flex flex-col gap-1 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800"
                                >
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        <button
                                            type="button"
                                            onClick={() => goToChannel(post.channel_name)}
                                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            #{post.channel_name}
                                        </button>
                                        <span className="text-slate-400">·</span>
                                        {post.username !== 'anonymous' ? (
                                            <button
                                                type="button"
                                                onClick={() => showUser(post.username)}
                                                className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {post.username}
                                            </button>
                                        ) : (
                                            <span>{post.username}</span>
                                        )}
                                        <span className="font-mono">{formatPostTime(post.created)}</span>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:mb-0 text-slate-700 dark:text-slate-300">
                                        <ChatMarkdown content={typeof post.content === 'string' ? post.content : ''} />
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {view === 'user' && (
                        <>
                            {userLoading && userPosts.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                                    <SuspenseLoader />
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {loadStatus}
                                    </p>
                                </div>
                            )}
                            {userError && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500">
                                    {userError}
                                </div>
                            )}
                            {selectedAuthor && !userError && (
                                <>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {Array.from(new Set(userPosts.map((p) => p.channel_name))).map((ch) => (
                                            <button
                                                key={ch}
                                                type="button"
                                                onClick={() => goToChannel(ch)}
                                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                {ch}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-4">
                                        {userPosts.map((post) => (
                                            <div
                                                key={post.id}
                                                className="flex flex-col gap-1 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800"
                                            >
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                    <button
                                                        type="button"
                                                        onClick={() => goToChannel(post.channel_name)}
                                                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        #{post.channel_name}
                                                    </button>
                                                    <span className="font-mono">{formatPostTime(post.created)}</span>
                                                </div>
                                                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:mb-0 text-slate-700 dark:text-slate-300">
                                                    <ChatMarkdown content={typeof post.content === 'string' ? post.content : ''} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer / Input - only for channel view */}
                {view === 'channel' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                        <form onSubmit={onSubmit} className="flex gap-2">
                            <div className="relative flex-shrink-0 group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                <input
                                    type="text"
                                    name="username"
                                    defaultValue={currentUserName}
                                    placeholder="guest"
                                    disabled={inputDisabled}
                                    className="pl-9 pr-3 py-2.5 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                            <div className="relative flex-grow group">
                                <input
                                    type="text"
                                    name="content"
                                    placeholder="Write a message..."
                                    required
                                    disabled={inputDisabled}
                                    autoComplete="off"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={inputDisabled}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center flex-shrink-0"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    )
}
