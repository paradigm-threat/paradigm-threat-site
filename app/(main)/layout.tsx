'use client'

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import { DynamicNav, FloatingDiv, DynamicIndex, useFiles } from "@/components";
import { RemoteFileIndexBanner } from "@/components/RemoteFileIndexBanner";
import { ResumeInvestigationBanner } from "@/components/ResumeInvestigationBanner";
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
    // Hide FloatingDiv's Back to top on article pages (2+ path segments) and markdown hubs where TTS dock handles chrome
    const hideFloatingButtons = pathname
        ? pathname.split('/').filter(Boolean).length >= 2 || isMarkdownHubPath(pathname)
        : false;
    const isChatPage = pathname?.startsWith('/chat') ?? false;

    return (
        <BottomChromeProvider>
        <div className="flex-grow flex flex-col w-full px-4 py-8 relative">
            <RemoteFileIndexBanner />
            <div className="max-w-[90rem] w-full mx-auto flex flex-col lg:flex-row gap-8">
                <aside className="lg:w-64 flex-shrink-0">
                    <FloatingDiv containerTag='nav' className="hidden lg:block lg:sticky lg:top-24 w-64" hideFloatingButtons={hideFloatingButtons}>
                        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto bg-slate-100 dark:bg-slate-900 rounded-lg p-3">
                            <DynamicNav directory={fileList} className="space-y-1">
                                <div className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-500 uppercase tracking-wider">
                                    Directory
                                </div>
                            </DynamicNav>
                        </div>
                    </FloatingDiv>
                </aside>

                <main className="flex-grow max-w-4xl mx-auto w-full">
                    <ResumeInvestigationBanner />
                    <Suspense fallback={<SuspenseLoader />}>
                        {children}
                    </Suspense>
                </main>

                {/* Right sidebar for Table of Contents - hidden on chat page, switches to inline below 1400px */}
                {!isChatPage && (
                <aside id="sidebar-right" className="hidden toc:block w-80 flex-shrink-0 p-4" aria-label="Table of contents">
                    <div className="toc:fixed toc:right-8 toc:top-24 toc:w-72 toc:max-h-[calc(100vh-8rem)] toc:overflow-y-auto">
                        <DynamicIndex mode="sidebar" />
                    </div>
                </aside>
                )}
            </div>
        </div>
        </BottomChromeProvider>
    );
}
