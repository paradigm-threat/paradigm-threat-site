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
  signal?: AbortSignal
): Promise<BrowserLanguageModelSession> {
  const LM = window.LanguageModel
  if (!LM?.create) {
    throw new Error('Browser language model (Prompt API) is not available')
  }

  const session = await LM.create({
    ...LM_OPTIONS,
    signal,
    initialPrompts: [{ role: 'system', content: systemPrompt }],
    monitor (m) {
      m.addEventListener('downloadprogress', () => {
        /* model download — caller may surface UI separately */
      })
    },
  })

  return {
    prompt: (input, options) => session.prompt(input, options),
    destroy: () => session.destroy(),
  }
}
