'use client'

import React from "react";
import { usePathname } from "next/navigation";
import { useScrollToTopOnPathnameUnlessHistory } from "@/lib/hooks/useScrollToTopOnPathnameUnlessHistory";
import { Navbar, ImageGalleryProvider, FilesProvider, useFiles, ClientErrorReporter } from "@/components";
import { RelayServerToast } from "@/components/RelayServerToast";
import { RelayFooterAttribution } from "@/components/RelayFooterAttribution";
import { FooterSiteNav } from "@/components/FooterSiteNav";
import PwaRedirect from "@/components/PwaRedirect";
import { VercelTelemetry } from '@/components/VercelTelemetry'
import { WebMcpProvider } from "@/components/webmcp/WebMcpProvider"
import { BrowserAiSupportProvider } from "@/components/SiteAi/BrowserAiSupportProvider"
import { scheduleDeferredContentFonts } from "@/lib/deferredContentFonts"
import { useEffect } from "react"

/**
 * Client chrome + providers. Root `app/layout.tsx` stays a Server Component
 * (html/body + static font preloads) so we do not force DYNAMIC_SERVER_USAGE.
 */
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <FilesProvider>
      <RootProvidersInner>{children}</RootProvidersInner>
    </FilesProvider>
  )
}

function RootProvidersInner({ children }: { children: React.ReactNode }) {
  const { fileList } = useFiles();
  const pathname = usePathname();
  useScrollToTopOnPathnameUnlessHistory(pathname);

  useEffect(() => {
    scheduleDeferredContentFonts()
  }, [])

  return (
    <BrowserAiSupportProvider>
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

      <VercelTelemetry />
      <RelayServerToast />
      <WebMcpProvider />
    </BrowserAiSupportProvider>
  )
}
