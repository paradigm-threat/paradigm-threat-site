interface ImagePropsFormatted {
    src: string,
    [key: string]: any
}

import { normalizePathForMirror } from '@/lib/canonicalSiteAssetUrl'
import {
  buildLqipOptimizedAssetUrl,
  buildOptimizedAssetUrl,
  listOptimizedAssetUrls,
} from '@/lib/relayOptimizedAssetUrl'
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'

const DEFAULT_FILES_BASE_URL = getPrimaryFilesBaseUrl()

const DEFAULT_RASTER_W = 800
const HIGH_RES_RASTER_W = 2048

function parseDisplayWidth (w: unknown): number {
  if (w === undefined || w === null) return DEFAULT_RASTER_W
  const n = typeof w === 'string' ? parseInt(w, 10) : Number(w)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RASTER_W
}

/** Repo-relative `/…` or normalized mirror input for Relay `?w=` URLs. */
export function toRelayAssetPath (resolved: string, filesBaseUrl: string): string {
  const cleanPath = resolved.split('?')[0]
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return normalizePathForMirror(cleanPath)
  }
  let pathForAPI = cleanPath
  const base = filesBaseUrl.replace(/\/+$/, '')
  if (pathForAPI.startsWith(base)) {
    pathForAPI = pathForAPI.slice(base.length)
  }
  if (!pathForAPI.startsWith('/')) {
    pathForAPI = `/${pathForAPI}`
  }
  return pathForAPI
}

/** Gallery nav thumbnails — Relay mirror only (no `/api/image`). */
export function galleryRelayThumbnailUrl (src: string, width = 400): string {
  const relayPath = toRelayAssetPath(src, DEFAULT_FILES_BASE_URL)
  return buildOptimizedAssetUrl(relayPath, width)
}

let cachedIndex: any = null;
let indexPromise: Promise<any> | null = null;

export async function checkFileExists(path: string): Promise<boolean> {
    try {
        if (!indexPromise) {
            indexPromise = fetch(`${DEFAULT_FILES_BASE_URL}/index.json`)
                .then(res => res.ok ? res.json() : null)
                .then(index => {
                    cachedIndex = index;
                    return index;
                });
        }
        const index = await indexPromise;
        if (!index) return false;

        if (Array.isArray(index)) {
            return index.includes(path) || index.includes('/' + path);
        }
        return !!index[path] || !!index['/' + path];
    } catch (e) {
        return false;
    }
}

/**
 * Look up LQIP (blur placeholder) from the index tree by image path.
 * Index structure: index.media["01.before-creation"]["before-creation.png"]._lqip
 * Path can be "/media/01.before-creation/before-creation.png", "media/01.before-creation/before-creation.png", or full URL
 */
export function getLqipFromIndex(index: any, imagePath: string): string | undefined {
    if (!index || typeof imagePath !== 'string') return undefined
    let clean = imagePath.split('?')[0]
    if (clean.startsWith('http')) {
        try {
            clean = new URL(clean).pathname
        } catch {
            return undefined
        }
    }
    clean = clean.replace(/^\//, '')
    if (!clean) return undefined
    const parts = clean.split('/').filter(Boolean)
    let curr: any = index
    for (let i = 0; i < parts.length && curr; i++) {
        curr = curr[parts[i]]
    }
    return curr && typeof curr === 'object' && typeof curr._lqip === 'string' ? curr._lqip : undefined
}

/**
 * Look up intrinsic dimensions (width, height) from the index tree by image path.
 * Same path resolution as getLqipFromIndex. Used to reserve aspect ratio for LQIP placeholder.
 */
export function getDimensionsFromIndex(index: any, imagePath: string): { width: number; height: number } | undefined {
    if (!index || typeof imagePath !== 'string') return undefined
    let clean = imagePath.split('?')[0]
    if (clean.startsWith('http')) {
        try {
            clean = new URL(clean).pathname
        } catch {
            return undefined
        }
    }
    clean = clean.replace(/^\//, '')
    if (!clean) return undefined
    const parts = clean.split('/').filter(Boolean)
    let curr: any = index
    for (let i = 0; i < parts.length && curr; i++) {
        curr = curr[parts[i]]
    }
    if (!curr || typeof curr !== 'object') return undefined
    const w = curr._width
    const h = curr._height
    return typeof w === 'number' && w > 0 && typeof h === 'number' && h > 0
        ? { width: w, height: h }
        : undefined
}

export function resolveImagePath(src: string, basePath?: string): string {
    if (typeof src !== 'string') return '';
    if (!src) return '';
    if (src.startsWith('http')) return src;

    // Separate path from query string
    const [pathPart, queryPart] = src.split('?');
    const query = queryPart ? '?' + queryPart : '';
    const prefix = basePath ? (basePath.endsWith('/') ? basePath : basePath + '/') : '';

    if (pathPart.startsWith('/')) {
        if (basePath?.startsWith('http')) {
            // Root-relative path: resolve against basePath (works for both localhost and GitHub Pages subdirectories)
            const relPath = pathPart.slice(1);
            return (prefix + relPath) + query;
        }
        return pathPart + query; // Already absolute on current domain
    }

    let resolved = pathPart;
    if (pathPart.startsWith('./')) {
        resolved = pathPart.slice(2);
    }

    // When basePath is an absolute URL (e.g. timeline base = same domain as events.json), resolve to full URL
    if (basePath?.startsWith('http')) {
        return (prefix + resolved) + query;
    }
    // Path-based: combine and ensure it starts with / and has no double slashes
    const combined = (prefix + resolved).replace(/\/+/g, '/').replace(/^\/+/, '');
    return '/' + combined + query;
}

export function processImageProps(props: any, basePath?: string, filesRootUrl?: string): ImagePropsFormatted {
    const FILES_BASE_URL = (filesRootUrl || DEFAULT_FILES_BASE_URL).replace(/\/+$/, '')
    if (typeof props.src === 'object') {
        const { src, ...otherProps } = props
        const newProps = { ...src, ...otherProps }
        return processImageProps(newProps, basePath, filesRootUrl)
    }
    if (typeof props.default === 'object') {
        const { default: src, ...otherProps } = props
        const newProps = { ...src, ...otherProps }
        return processImageProps(newProps, basePath, filesRootUrl)
    }

    let { src, w, title, alt, className, intrinsicWidth, intrinsicHeight, ...finalProps } = props;

    // Parse JSON from title or alt
    const parseMeta = (str: string) => {
        if (typeof str !== 'string') return null;
        const trimmed = str.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                return JSON.parse(trimmed);
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    const meta = parseMeta(title) || parseMeta(alt);
    if (meta) {
        if (meta.className) className = className ? `${className} ${meta.className}` : meta.className;
        if (meta.w) w = meta.w;
        if (meta.weight) w = meta.weight; // Handle common typo
        if (meta.alt) alt = meta.alt;
        if (meta.title) title = meta.title;

        // If the string we parsed was title or alt, clear it if it wasn't replaced by the JSON content
        if (parseMeta(title)) title = meta.title || undefined;
        if (parseMeta(alt)) alt = meta.alt || undefined;

        // Merge any other props
        Object.assign(finalProps, meta);
        delete (finalProps as any).className;
        delete (finalProps as any).w;
    }

    if (props.lqip) {
        finalProps.blurDataURL = props.lqip;
    }

    // If optimizedSrc is already provided, we assume the props are already processed
    if (props.optimizedSrc && typeof src === 'string') {
        return { ...props, title, alt, className } as ImagePropsFormatted;
    }

    if (typeof src === "string") {
        // Resolve to absolute path relative to file server root
        const resolved = resolveImagePath(src, basePath);

        const queryStr = resolved.includes('?') ? resolved.slice(resolved.indexOf('?') + 1) : ''
        const queryParams = new URLSearchParams(queryStr)

        if (!w && queryParams.has('w')) {
            w = queryParams.get('w')
        }

        const relayPath = toRelayAssetPath(resolved, FILES_BASE_URL)
        const pathForSvgCheck = relayPath.split('?')[0].toLowerCase()
        const isSvg = pathForSvgCheck.endsWith('.svg')

        const displayW = parseDisplayWidth(w)
        finalProps.width = displayW

        if (isSvg) {
          finalProps.optimizedSrc = buildOptimizedAssetUrl(relayPath)
          finalProps.mirrorSrcs = listOptimizedAssetUrls(relayPath)
        } else {
          finalProps.optimizedSrc = buildOptimizedAssetUrl(relayPath, displayW)
          finalProps.mirrorSrcs = listOptimizedAssetUrls(relayPath, displayW)
          const lqip = buildLqipOptimizedAssetUrl(relayPath, displayW)
          if (lqip) finalProps.lqipOptimizedSrc = lqip
        }

        // Reserve correct aspect ratio for LQIP placeholder when intrinsic dimensions available
        if (intrinsicWidth && intrinsicHeight && intrinsicWidth > 0 && intrinsicHeight > 0) {
            finalProps.height = Math.round(finalProps.width * (intrinsicHeight / intrinsicWidth));
        }

        finalProps.highResSrc = isSvg
          ? buildOptimizedAssetUrl(relayPath)
          : buildOptimizedAssetUrl(relayPath, HIGH_RES_RASTER_W)

        return { src: relayPath, ...finalProps, title, alt, className } as ImagePropsFormatted;
    }

    throw new Error('Invalid src string' + JSON.stringify(props));
}
