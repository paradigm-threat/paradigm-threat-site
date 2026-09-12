import React, { useSyncExternalStore } from 'react';
import { PtLink } from '@/components/PtLink';
import { lookupHttpHref } from '@/lib/normalizeHttpHref';
import { getDeadUrlsSnapshot, subscribeDeadUrls } from '@/lib/deadUrlsStore';

export const MarkdownLink = ({ href, children, className, title, ...props }: any) => {
    const deadMap = useSyncExternalStore(subscribeDeadUrls, getDeadUrlsSnapshot, getDeadUrlsSnapshot);
    const isExternal = href?.startsWith('http');
    const dead = isExternal ? lookupHttpHref(deadMap, href) : null;
    if (isExternal) {
        const reason = dead && typeof dead.reason === 'string' && dead.reason.length > 0
            ? dead.reason
            : 'dead';
        const cls = dead
            ? (className ? `${className} pt-dead-link` : 'pt-dead-link')
            : className;
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
                className={cls}
                title={dead ? reason : title}
            >
                {children}
                {dead ? <span> (dead)</span> : null}
            </a>
        );
    }
    return (
        <PtLink href={href || ''} className={className} title={title} {...props}>
            {children}
        </PtLink>
    );
};
