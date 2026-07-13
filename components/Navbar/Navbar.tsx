'use client'

import React, { useState, useEffect, memo, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Search, Home, MessageSquare, Video, Clock, Heart, Rss, Server } from 'lucide-react'
import { ThemeToggle, FontToggle, DynamicNav, DynamicIndex } from '@/components'
import { FeelingLuckyButton } from '@/components/FeelingLucky/FeelingLuckyButton'
import { ResumeInvestigationPanel } from '@/components/ResumeInvestigationPanel'
import {
    remoteRelay,
    RELAY_REPO_NAMES_LABEL,
    type RelayPairOption,
} from '@/lib/remoteRelayStore'

interface NavbarProps {
    fileList: any
}

/** Full wordmark; served with static files. */
const HEADER_WORDMARK_SRC = '/site/header.png'
/** Triangle mark only (same graphic as favicon) — avoids clash with menu below ~350px. */
const HEADER_MARK_SRC = '/site/favicon.svg'

function relayStatusDotClass(opt: RelayPairOption): string {
    if (opt.live) {
        return opt.isActive
            ? 'bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.85)]'
            : 'bg-emerald-500'
    }
    if (opt.filesOk || opt.timelineOk) {
        return 'bg-amber-500'
    }
    return 'bg-slate-400 dark:bg-slate-600'
}

function RelayServerSelector() {
    const [menuOpen, setMenuOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)

    const activeIdx = useSyncExternalStore(
        (cb) => remoteRelay.subscribe(cb),
        () => remoteRelay.getActivePairIndex(),
        () => remoteRelay.getActivePairIndex(),
    )

    const optionsKey = useSyncExternalStore(
        (cb) => remoteRelay.subscribe(cb),
        () => remoteRelay.getRelayPairOptionsKey(),
        () => remoteRelay.getRelayPairOptionsKey(),
    )
    const options = remoteRelay.getRelayPairOptions()

    useEffect(() => {
        if (!menuOpen) return undefined
        const onDoc = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDoc)
            document.removeEventListener('keydown', onKey)
        }
    }, [menuOpen])

    if (options.length <= 1) return null

    const current = options.find((o) => o.idx === activeIdx) ?? options[0]!
    const currentTitle = current.live
        ? `${current.serverHost} (${current.latencyMs}ms)`
        : current.serverHost

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-400"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Relay server menu"
                title={`Relay server — ${currentTitle}`}
            >
                <Server size={18} strokeWidth={1.75} aria-hidden />
            </button>
            {menuOpen && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 z-[120] min-w-[min(calc(100vw-2rem),18rem)] max-w-[min(calc(100vw-2rem),28rem)] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
                >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Relay server
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {RELAY_REPO_NAMES_LABEL}
                        </div>
                    </div>
                    {options.map((opt) => (
                        <button
                            key={`${opt.idx}-${optionsKey}`}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                remoteRelay.setActivePairIndex(opt.idx)
                                setMenuOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 ${opt.isActive ? 'bg-slate-50 dark:bg-slate-900/60' : ''
                                }`}
                        >
                            <span
                                className={`h-2 w-2 shrink-0 rounded-full ${relayStatusDotClass(opt)}`}
                                aria-hidden
                                title={opt.live ? 'Live' : opt.filesOk || opt.timelineOk ? 'Partial' : 'Offline'}
                            />
                            <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                                {opt.latencyMs != null ? `${opt.latencyMs}ms` : '—'}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="break-all font-semibold text-sm text-slate-800 dark:text-slate-100">
                                    {opt.serverHost}
                                </span>
                                <span className="ml-1.5 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                    {opt.statsLabel}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

const Navbar = memo(function Navbar({ fileList }: NavbarProps) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    // Close menu when path changes
    useEffect(() => {
        queueMicrotask(() => setIsOpen(false))
    }, [pathname])

    const navLinks = [
        { href: '/search', label: 'Search', icon: Search },
        { href: '/', label: 'Home', icon: Home },
        { href: '/timeline', label: 'Timeline', icon: Clock },
        { href: '/chat', label: 'Chat', icon: MessageSquare },
        { href: 'https://paradigmthreat2.substack.com/', label: 'Substack', icon: Rss, external: true },
        { href: 'https://www.bitchute.com/channel/paradigmthreat', label: 'Videos', icon: Video, external: true },
        { href: 'https://www.patreon.com/c/ahsctimeline', label: 'Donate', icon: Heart, external: true },
    ]

    return (
        <header data-site-navbar className="sticky top-0 z-[100] w-full border-b border-slate-200 bg-slate-100/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex min-w-0 justify-between items-center gap-3 h-16 md:h-20">
                    <div className="flex min-w-0 flex-1 items-center gap-8 lg:flex-initial">
                        <Link
                            href="/"
                            className="hover:opacity-80 transition-opacity flex-shrink-0 min-w-0"
                        >
                            {/* Single <img> via <picture> — avoids preloading both wordmark and mark on every page. */}
                            <picture>
                                <source media="(max-width: 350px)" srcSet={HEADER_MARK_SRC} />
                                <img
                                    src={HEADER_WORDMARK_SRC}
                                    alt="Paradigm Threat"
                                    className="h-10 w-auto md:h-14 max-[350px]:h-10 max-[350px]:w-10 max-[350px]:object-contain"
                                />
                            </picture>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    target={link.external ? '_blank' : undefined}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${pathname === link.href
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    <link.icon size={18} />
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <div className="hidden lg:flex items-center gap-2">
                            <RelayServerSelector />
                            <FontToggle />
                            <ThemeToggle />
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-10 max-h-[80vh] overflow-y-auto border-b border-slate-200 bg-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-200 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
                    <nav className="flex flex-col p-4 gap-4">
                        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Display
                            </span>
                            <div className="flex items-center gap-2">
                                <RelayServerSelector />
                                <FontToggle />
                                <ThemeToggle />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    target={link.external ? '_blank' : undefined}
                                    className={`px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${pathname === link.href
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                                        }`}
                                >
                                    <link.icon size={20} />
                                    {link.label}
                                </Link>
                            ))}
                        </div>

                        <DynamicIndex
                            mode="menu"
                            onAfterNavigate={() => setIsOpen(false)}
                        />

                        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                            <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Directory
                            </div>
                            <DynamicNav directory={fileList} className="flex flex-col" />
                            <div className="px-4 mt-3 space-y-3">
                                <ResumeInvestigationPanel />
                                <FeelingLuckyButton />
                            </div>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
})

export default Navbar;
