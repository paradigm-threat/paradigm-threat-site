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

  const session = await LM.create({
    ...LM_OPTIONS,
    signal: options?.signal,
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
}
