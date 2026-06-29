import React from 'react';
import { PtLink } from '@/components/PtLink';

export const MarkdownLink = ({ href, children, ...props }: any) => {
    const isExternal = href?.startsWith('http');
    if (isExternal) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
            </a>
        );
    }
    return (
        <PtLink href={href || ''} {...props}>
            {children}
        </PtLink>
    );
};
