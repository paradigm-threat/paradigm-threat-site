'use client'

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScrollToTopOnPathnameUnlessHistory } from "@/lib/hooks/useScrollToTopOnPathnameUnlessHistory";
import { DynamicNav, FloatingDiv, ThemeToggle, Navbar, ImageGalleryProvider, FilesProvider, useFiles, ClientErrorReporter } from "@/components";
import { RelayServerToast } from "@/components/RelayServerToast";
import { RelayFooterAttribution } from "@/components/RelayFooterAttribution";
import { FooterSiteNav } from "@/components/FooterSiteNav";
import PwaRedirect from "@/components/PwaRedirect";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { WebMcpProvider } from "@/components/webmcp/WebMcpProvider"

/** Styles **/
import './site/globals.scss'
import { SuspenseLoader } from "@client";

export default function RootLayout(
    {
        children
    }: {
        children: React.ReactNode
    }) {

    return (
        <FilesProvider>
            <RootLayoutInner>
                {children}
            </RootLayoutInner>
        </FilesProvider>
    )
}

function RootLayoutInner({ children }: { children: React.ReactNode }) {
    const { fileList } = useFiles();
    const pathname = usePathname();
    useScrollToTopOnPathnameUnlessHistory(pathname);

    return (
        <html lang="en" className="dark font-['Titillium_Web']" suppressHydrationWarning>
            <head>
                <title>Paradigm Threat</title>
                <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                <link rel="icon" type="image/svg+xml" href="/site/favicon.svg" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#0f172a" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <script dangerouslySetInnerHTML={{
                    __html: `try{if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(_){}`,
                }} />
            </head>
            <body className={`bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex min-w-0 max-w-full flex-col overflow-x-hidden transition-colors duration-300`}>
                <PwaRedirect />
                <ClientErrorReporter />
                <Navbar fileList={fileList} />

                <div
                    id="site-main-scroll"
                    className={`relative z-0 flex-1 min-h-0 min-w-0 flex flex-col overflow-x-hidden overflow-y-auto scroll-smooth`}
                >
                    <ImageGalleryProvider>
                        {children}
                    </ImageGalleryProvider>
                </div>

                <footer data-site-footer className="flex-shrink-0 w-full min-w-0 max-w-full bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12">
                    <div className="max-w-7xl mx-auto min-w-0 px-4 text-center space-y-6">
                        <FooterSiteNav />
                        <div className="text-slate-500 text-sm">
                            Created by <a href="https://clevertree.net/" className="text-blue-500 hover:underline font-semibold">Ari Asulin</a>
                        </div>
                        <div className="flex flex-col items-center gap-3 text-xs text-slate-400">
                            <RelayFooterAttribution />
                            <a href="https://paradigmthreat2.substack.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline font-semibold">Subscribe on Substack</a>
                            <a href="https://www.patreon.com/c/ahsctimeline" target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline font-semibold">♥ Patreon</a>
                        </div>
                    </div>
                </footer>

                <Analytics />
                <SpeedInsights />
                <RelayServerToast />
                <WebMcpProvider />
            </body>
        </html>
    )
}
