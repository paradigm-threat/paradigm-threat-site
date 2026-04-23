'use client'

import React, { Suspense, useMemo } from "react";
import { usePathname } from "next/navigation";
import { DynamicNav, FloatingDiv, AutoIndex, useFiles } from "@/components";
import { filesDirectoryFromPathname } from "@/lib/filesPathFromPathname";
import { FeelingLuckyButton } from "@/components/FeelingLucky/FeelingLuckyButton";
import { ResumeInvestigationPanel } from "@/components/ResumeInvestigationPanel";
import { RemoteFileIndexBanner } from "@/components/RemoteFileIndexBanner";
import { SuspenseLoader } from "@client";
import { BottomChromeProvider } from "@/lib/BottomChromeContext";
import { isMarkdownHubPath } from "@/lib/visitResumeStorage";

export default function MainLayout({
    children
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const { fileList } = useFiles();
    const sidebarIndexPath = useMemo(
        () => (pathname ? filesDirectoryFromPathname(pathname, fileList) : ''),
        [pathname, fileList]
    );
    // Hide FloatingDiv's Back to top on article pages (2+ path segments) and markdown hubs where TTS dock handles chrome
    const hideFloatingButtons = pathname
        ? pathname.split('/').filter(Boolean).length >= 2 || isMarkdownHubPath(pathname)
        : false;
    const isChatPage = pathname?.startsWith('/chat') ?? false;

    return (
        <BottomChromeProvider>
        <div className="relative flex w-full min-w-0 max-w-full flex-grow flex-col px-4 pb-8 pt-2">
            <RemoteFileIndexBanner />
            <div className="mx-auto flex w-full min-w-0 max-w-[90rem] flex-col gap-8 lg:flex-row">
                <aside className="lg:w-64 flex-shrink-0">
                    <FloatingDiv containerTag='nav' className="hidden lg:block lg:sticky lg:top-24 w-64" hideFloatingButtons={hideFloatingButtons}>
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

                <main className="mx-auto w-full min-w-0 max-w-4xl flex-grow">
                    <Suspense fallback={<SuspenseLoader />}>
                        {children}
                    </Suspense>
                </main>

                {/* Right sidebar: folder index (AutoIndex) — hidden on chat page below `toc` breakpoint */}
                {!isChatPage && sidebarIndexPath ? (
                <aside id="sidebar-right" className="hidden toc:block w-80 flex-shrink-0 p-4" aria-label="Folder contents">
                    <div className="toc:fixed toc:right-8 toc:top-24 toc:w-72 toc:max-h-[calc(100vh-8rem)] toc:overflow-y-auto">
                        <AutoIndex currentPath={sidebarIndexPath} sort="name-asc" maxHeight="calc(100vh-10rem)" />
                    </div>
                </aside>
                ) : null}
            </div>
        </div>
        </BottomChromeProvider>
    );
}
