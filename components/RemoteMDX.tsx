import React, { useMemo, memo } from 'react';
import { MDXRemote } from 'next-mdx-remote';
import * as componentsNamespace from '@/components';
import { MarkdownLink } from './MarkdownLink';
import { useFiles } from './FilesContext';
import { getLqipFromIndex, getDimensionsFromIndex, resolveImagePath } from './helpers/imageHelper';

const {
    PopImage,
    OptimizedImage,
    ChatRoom,
    ChangeLog,
    DynamicNav,
    EmbedFile,
    ImageGalleryProvider,
    FloatingDiv,
    ThemeToggle,
    Navbar,
    AutoIndex
} = componentsNamespace;

/** Renders img with LQIP looked up from index before image loads */
function ImageWithLqip({ basePath, ...props }: { basePath: string; [k: string]: any }) {
    const { fileList } = useFiles();
    const src = props.src;
    const resolvedPath = typeof src === 'string' ? resolveImagePath(src, basePath).split('?')[0] : '';
    const lqip = fileList && resolvedPath ? getLqipFromIndex(fileList, resolvedPath) : undefined;
    const dims = fileList && resolvedPath ? getDimensionsFromIndex(fileList, resolvedPath) : undefined;
    return (
        <PopImage
            {...props}
            basePath={basePath}
            lqip={lqip}
            intrinsicWidth={dims?.width}
            intrinsicHeight={dims?.height}
        />
    );
}

const mdxComponents = (basePath: string) => ({
    PopImage: (props: any) => <PopImage {...props} basePath={basePath} />,
    OptimizedImage: (props: any) => <OptimizedImage {...props} basePath={basePath} />,
    ChatRoom,
    ChangeLog,
    DynamicIndex: (props: any) => <AutoIndex {...props} currentPath={basePath} sort="name-asc" />,
    DynamicNav: (props: any) => <DynamicNav {...props} currentPath={basePath} />,
    EmbedFile: (props: any) => {
        let src = props.src;
        if (src && src.startsWith('./')) {
            const path = basePath ? (basePath.endsWith('/') ? basePath : basePath + '/') : '';
            src = path + src.slice(2);
        } else if (src && !src.startsWith('/') && !src.startsWith('http')) {
            const path = basePath ? (basePath.endsWith('/') ? basePath : basePath + '/') : '';
            src = path + src;
        }
        return <EmbedFile {...props} src={src} currentPath={basePath} />;
    },
    ImageGalleryProvider,
    FloatingDiv,
    ThemeToggle,
    Navbar,
    img: (props: any) => <ImageWithLqip {...props} basePath={basePath} />,
    AutoContent: (props: any) => <AutoIndex {...props} currentPath={basePath} sort="name-asc" />,
    Auto: (props: any) => <AutoIndex {...props} currentPath={basePath} sort="name-asc" />,
    AutoIndex: (props: any) => <AutoIndex {...props} currentPath={basePath} />,
    a: (props: any) => {
        let href = props.href || '';
        // Resolve relative links against basePath so they work regardless of trailing slash
        if (href && !href.startsWith('/') && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
            href = basePath ? `/${basePath}/${href}` : `/${href}`;
        }
        return <MarkdownLink {...props} href={href} />;
    },
});

export interface RemoteMDXProps {
    /** Pre-compiled MDX from /api/compile-mdx (avoids RSC-in-client warnings) */
    compiled: { compiledSource: string; frontmatter?: Record<string, unknown>; scope?: Record<string, unknown> };
    basePath?: string;
}

export const RemoteMDX = memo(function RemoteMDX({ compiled, basePath = '' }: RemoteMDXProps) {
    const components = useMemo(() => mdxComponents(basePath), [basePath]);

    return (
        <div className="mdx-content">
            <MDXRemote
                compiledSource={compiled.compiledSource}
                frontmatter={compiled.frontmatter ?? {}}
                scope={compiled.scope ?? {}}
                components={components as any}
            />
        </div>
    );
});
