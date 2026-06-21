import { LM_CREATE_TIMEOUT_MESSAGE } from '@/lib/siteAi/agentProgress'

export type BrowserLanguageModelSession = {
  prompt: (
    input: string | LanguageModelMessage[],
    options?: { signal?: AbortSignal }
  ) => Promise<string>
  destroy: () => void
}

export type LanguageModelMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ModelSessionProgress = {
  kind: 'checking' | 'downloading' | 'ready'
  message: string
  loaded?: number
}

const LM_OPTIONS = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
}

const LM_CREATE_TIMEOUT_MS = 120_000

function mergeAbortSignals (userSignal: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal
  timedOut: () => boolean
  dispose: () => void
} {
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const onUserAbort = () => controller.abort()
  if (userSignal) {
    if (userSignal.aborted) controller.abort()
    else userSignal.addEventListener('abort', onUserAbort, { once: true })
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timeoutId)
      if (userSignal) userSignal.removeEventListener('abort', onUserAbort)
    },
  }
}

/** True when the Prompt API reports anything other than unavailable. */
export async function isBrowserLanguageModelAvailable (): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const LM = window.LanguageModel
  if (!LM?.availability) return false
  try {
    const status = await LM.availability(LM_OPTIONS)
    return status !== 'unavailable'
  } catch {
    return false
  }
}

export async function createBrowserLanguageModelSession (
  systemPrompt: string,
  options?: {
    signal?: AbortSignal
    onSessionProgress?: (progress: ModelSessionProgress) => void
  }
): Promise<BrowserLanguageModelSession> {
  const LM = window.LanguageModel
  if (!LM?.create) {
    throw new Error('Browser language model (Prompt API) is not available')
  }

  options?.onSessionProgress?.({ kind: 'checking', message: 'Preparing on-device language model…' })

  const merged = mergeAbortSignals(options?.signal, LM_CREATE_TIMEOUT_MS)

  try {
    const session = await LM.create({
      ...LM_OPTIONS,
      signal: merged.signal,
      initialPrompts: [{ role: 'system', content: systemPrompt }],
      monitor (m) {
        m.addEventListener('downloadprogress', (e) => {
          const loaded = (e as ProgressEvent & { loaded?: number }).loaded
          options?.onSessionProgress?.({
            kind: 'downloading',
            message: 'Downloading language model…',
            loaded: typeof loaded === 'number' ? loaded : undefined,
          })
        })
      },
    })

    options?.onSessionProgress?.({ kind: 'ready', message: 'Language model ready' })

    return {
      prompt: (input, opts) => session.prompt(input, opts),
      destroy: () => session.destroy(),
    }
  } catch (e) {
    if (merged.timedOut() && !options?.signal?.aborted) {
      throw new Error(LM_CREATE_TIMEOUT_MESSAGE)
    }
    throw e
  } finally {
    merged.dispose()
  }
}
