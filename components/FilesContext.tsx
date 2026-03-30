'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';

const INDEX_FETCH_TIMEOUT_MS = 5000

interface FilesContextType {
    fileList: any;
    loading: boolean;
    error: string | null;
    retryLoadIndex: () => void;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

export function FilesProvider({ children }: { children: ReactNode }) {
    const [fileList, setFileList] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    const retryLoadIndex = useCallback(() => {
        setRetryKey((k) => k + 1);
    }, []);

    useEffect(() => {
        const baseUrl = process.env.NEXT_PUBLIC_FILES_BASE_URL || 'https://clevertree.github.io/paradigm-threat-files';
        let isMounted = true;
        const abortController = new AbortController();
        const timeoutId = window.setTimeout(() => abortController.abort(), INDEX_FETCH_TIMEOUT_MS);

        const fetchFiles = async () => {
            if (!isMounted) return;
            setLoading(true);
            setError(null);
            try {
                const cacheBuster = Math.floor(Date.now() / 60000);
                const response = await fetch(`${baseUrl}/index.json?v=${cacheBuster}`, {
                    signal: abortController.signal,
                });
                window.clearTimeout(timeoutId);
                if (!isMounted) return;
                if (!response.ok) {
                    setFileList(null);
                    setError(`Failed to fetch file index (HTTP ${response.status}).`);
                    setLoading(false);
                    return;
                }
                const data = await response.json();
                if (isMounted) {
                    setFileList(data);
                    setError(null);
                    setLoading(false);
                }
            } catch (err: unknown) {
                window.clearTimeout(timeoutId);
                if (!isMounted) return;
                const name = err instanceof Error ? err.name : '';
                if (name === 'AbortError') {
                    setFileList(null);
                    setError(
                        'Timed out loading the file index after 5 seconds. The CDN or host may be blocking or throttling requests, or returning errors without a clear message.'
                    );
                } else {
                    setFileList(null);
                    setError(err instanceof Error ? err.message : 'Failed to load file index');
                }
                setLoading(false);
            }
        };

        fetchFiles();

        return () => {
            isMounted = false;
            window.clearTimeout(timeoutId);
            abortController.abort();
        };
    }, [retryKey]);

    const contextValue = useMemo(
        () => ({ fileList, loading, error, retryLoadIndex }),
        [fileList, loading, error, retryLoadIndex]
    );

    return (
        <FilesContext.Provider value={contextValue}>
            {children}
        </FilesContext.Provider>
    );
}

export function useFiles() {
    const context = useContext(FilesContext);
    if (context === undefined) {
        throw new Error('useFiles must be used within a FilesProvider');
    }
    return context;
}
