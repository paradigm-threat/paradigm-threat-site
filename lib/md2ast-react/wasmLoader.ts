import type { MdNode } from './mdAst'

let wasmBaseUrl = '/wasm/md2ast/'

interface Md2jsxWasmModule {
  default: (input?: string | URL | Request | BufferSource) => Promise<unknown>
  transpile: (markdown: string, allowedTags: string[]) => string
}

let wasmMod: Md2jsxWasmModule | null = null
let wasmReady: Promise<Md2jsxWasmModule> | null = null

/** Configure where md2ast.js / md2ast_bg.wasm are served (trailing slash optional). */
export function configureMd2astWasm (baseUrl: string): void {
  wasmBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

/** @deprecated Use configureMd2astWasm */
export const configureRelayMarkdownWasm = configureMd2astWasm

async function loadWasm (): Promise<Md2jsxWasmModule> {
  if (wasmMod) return wasmMod
  if (!wasmReady) {
    wasmReady = (async () => {
      const entry = `${wasmBaseUrl}md2ast.js`
      const mod = (await import(/* webpackIgnore: true */ entry)) as Md2jsxWasmModule
      await mod.default()
      wasmMod = mod
      return mod
    })()
  }
  return wasmReady
}

export async function parseMarkdownInternal (
  markdown: string,
  allowedTags: string[],
): Promise<MdNode[]> {
  const mod = await loadWasm()
  const json = mod.transpile(markdown, allowedTags)
  return JSON.parse(json) as MdNode[]
}
