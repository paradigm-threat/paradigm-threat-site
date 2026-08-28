'use client'

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import { DynamicNav, FloatingDiv, DynamicIndex, useFiles } from "@/components";
import { FeelingLuckyButton } from "@/components/FeelingLucky/FeelingLuckyButton";
import { ResumeInvestigationPanel } from "@/components/ResumeInvestigationPanel";
import { RemoteFileIndexBanner } from "@/components/RemoteFileIndexBanner";
import { SuspenseLoader } from "@client";
import { BottomChromeProvider } from "@/lib/BottomChromeContext";
import { SiteAiProvider } from "@/components/SiteAi/SiteAiProvider";
import { SiteAiChrome } from "@/components/SiteAi/SiteAiChrome";
import { shouldHideLegacyFloatingBackToTop } from "@/lib/siteChrome/bottomChrome";

export default function MainLayout({
    children
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const { fileList } = useFiles();
    const hideFloatingButtons = pathname
        ? shouldHideLegacyFloatingBackToTop(pathname)
        : false;
    const isChatPage = pathname?.startsWith('/chat') ?? false;

    return (
        <BottomChromeProvider>
        <SiteAiProvider>
        <div data-site-chrome className="relative flex w-full min-w-0 max-w-full flex-grow flex-col px-4 pb-8 pt-2">
            <div className="mx-auto flex w-full min-w-0 max-w-[90rem] flex-col gap-8 lg:flex-row">
                {/* Main first in DOM so reader mode / crawlers see article before directory chrome. */}
                <main className="article-shell-reserve order-1 mx-auto w-full min-w-0 max-w-4xl flex-grow lg:order-2">
                    <RemoteFileIndexBanner />
                    <Suspense fallback={<SuspenseLoader />}>
                        {children}
                    </Suspense>
                </main>

                <aside
                    className="site-directory-sidebar order-2 lg:w-64 lg:order-1 flex-shrink-0"
                    aria-label="Site directory"
                >
                    <FloatingDiv
                        containerTag="nav"
                        aria-label="Site directory"
                        className="hidden lg:block lg:sticky lg:top-24 w-64"
                        hideFloatingButtons={hideFloatingButtons}
                    >
                        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto bg-slate-100 dark:bg-slate-900 rounded-lg p-3">
                            <DynamicNav directory={fileList} className="space-y-1">
                                <div className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-500 uppercase tracking-wider">
                                    Directory
                                </div>
                            </DynamicNav>
                            <div className="mt-3 space-y-3">
                                <ResumeInvestigationPanel />
                                <FeelingLuckyButton className="px-0" />
                            </div>
                        </div>
                    </FloatingDiv>
                </aside>

                {/* Right sidebar: heading TOC (DynamicIndex) — hidden on chat page below `toc` breakpoint */}
                {!isChatPage && (
                <aside
                    id="sidebar-right"
                    className="site-toc-sidebar order-3 hidden w-80 flex-shrink-0 p-4 toc:block"
                    aria-label="Table of contents"
                >
                    <nav
                        className="toc:fixed toc:right-8 toc:top-24 toc:w-72 toc:max-h-[calc(100vh-8rem)] toc:overflow-y-auto"
                        aria-label="Table of contents"
                    >
                        <DynamicIndex mode="sidebar" />
                    </nav>
                </aside>
                )}
            </div>
        </div>
        <SiteAiChrome />
        </SiteAiProvider>
        </BottomChromeProvider>
    );
}
