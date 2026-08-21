import React from "react";
import { RootProviders } from "@/components/RootProviders";

/** Styles **/
import './site/globals.scss'

/**
 * Server root layout — no 'use client'. Preloads Titillium (chrome LCP) and
 * latin-subset EB Garamond (~40KB). Keep SERVER_RELAY_FETCH unset in production
 * (docs/EDGE_REQUEST_OPS.md) — this layout does not fetch Relay content.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark font-['Titillium_Web']" suppressHydrationWarning>
      <head>
        <title>Paradigm Threat</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/site/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="preload"
          href="/fonts/TitilliumWeb-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/EBGaramond-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(_){}`,
        }} />
      </head>
      <body className={`bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex min-w-0 max-w-full flex-col overflow-x-hidden transition-colors duration-300`}>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  )
}
