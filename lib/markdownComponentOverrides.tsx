/**
 * Markdown component overrides for md2ast-react.
 *
 * Tags used in paradigm-threat-files corpus (grep audit):
 *   ChangeLog, FlashbackNowShowing, DeferredMarkdown, OptimizedImage, AutoIndex, ChatRoom
 *
 * Registered overrides for site components and HTML tags.
 */
'use client'

import React from 'react'
import type { MdOverrides } from '@/lib/md2ast-react'
import * as componentsNamespace from '@/components'
import DeferredMarkdown from '@/components/DeferredMarkdown/DeferredMarkdown'
import { MarkdownLink } from '@/components/MarkdownLink'
import { useFiles } from '@/components/FilesContext'
import { getDimensionsFromIndex, resolveImagePath } from '@/components/helpers/imageHelper'

const {
  PopImage,
  OptimizedImage,
  ChatRoom,
  ChangeLog,
  FlashbackNowShowing,
  DynamicIndex,
  DynamicNav,
  EmbedFile,
  ImageGalleryProvider,
  FloatingDiv,
  ThemeToggle,
  Navbar,
  AutoIndex,
} = componentsNamespace

function ImageWithIndexDims ({ basePath, ...props }: { basePath: string; [k: string]: unknown }) {
  const { fileList } = useFiles()
  const src = props.src
  const resolvedPath = typeof src === 'string' ? resolveImagePath(src, basePath).split('?')[0] : ''
  const dims = fileList && resolvedPath ? getDimensionsFromIndex(fileList, resolvedPath) : undefined
  return (
    <PopImage
      {...props}
      basePath={basePath}
      intrinsicWidth={dims?.width}
      intrinsicHeight={dims?.height}
    />
  )
}

/** Files corpus: full override map (articles, listings, page.md). */
export function filesMarkdownOverrides (basePath: string): MdOverrides {
  return {
    PopImage: (props: Record<string, unknown>) => {
      const { children, ...rest } = props
      return <PopImage {...rest} basePath={basePath}>{children as React.ReactNode}</PopImage>
    },
    OptimizedImage: (props: Record<string, unknown>) => <OptimizedImage {...props} basePath={basePath} />,
    ChatRoom: ChatRoom as MdOverrides[string],
    ChangeLog: ChangeLog as MdOverrides[string],
    FlashbackNowShowing: FlashbackNowShowing as MdOverrides[string],
    DeferredMarkdown: (props: Record<string, unknown>) => (
      <DeferredMarkdown {...props} />
    ),
    DynamicIndex: (props: Record<string, unknown>) => <DynamicIndex {...props} mode="inline" currentPath={basePath} />,
    DynamicNav: (props: Record<string, unknown>) => <DynamicNav {...(props as any)} currentPath={basePath} />,
    EmbedFile: (props) => {
      let src = props.src as string | undefined
      if (src?.startsWith('./')) {
        const path = basePath ? (basePath.endsWith('/') ? basePath : `${basePath}/`) : ''
        src = path + src.slice(2)
      } else if (src && !src.startsWith('/') && !src.startsWith('http')) {
        const path = basePath ? (basePath.endsWith('/') ? basePath : `${basePath}/`) : ''
        src = path + src
      }
      return <EmbedFile {...(props as any)} src={src} currentPath={basePath} />
    },
    ImageGalleryProvider: ImageGalleryProvider as MdOverrides[string],
    FloatingDiv: FloatingDiv as unknown as MdOverrides[string],
    ThemeToggle: ThemeToggle as MdOverrides[string],
    Navbar: Navbar as unknown as MdOverrides[string],
    img: (props) => <ImageWithIndexDims {...props} basePath={basePath} />,
    AutoContent: (props) => <DynamicIndex {...props} mode="inline" currentPath={basePath} />,
    Auto: (props) => <DynamicIndex {...props} mode="inline" currentPath={basePath} />,
    AutoIndex: (props) => <AutoIndex {...props} currentPath={basePath} />,
    a: (props: Record<string, unknown>) => {
      let href = (props.href as string) || ''
      if (href && !href.startsWith('/') && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
        href = basePath ? `/${basePath}/${href}` : `/${href}`
      }
      return <MarkdownLink {...props} href={href} />
    },
  }
}
