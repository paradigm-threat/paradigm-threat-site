import { isBrowserLanguageModelAvailable } from '@/lib/replyAssistant/browserLanguageModel'
import { isSiteAiEnabled } from '@/lib/siteOpsFeature'
import { getModelContext } from '@/lib/webmcp/modelContext'
import { isMobileClient } from '@/lib/browserAi/isMobileClient'

export type BrowserAiUnsupportedReason = 'mobile' | 'no-prompt-api' | 'model-unavailable'

export type BrowserAiSetupReason = 'feature-disabled' | 'webmcp-unavailable'

export type BrowserAiSupport =
  | { status: 'unsupported'; reason: BrowserAiUnsupportedReason }
  | { status: 'needs-setup'; reason: BrowserAiSetupReason }
  | { status: 'ready' }

const LM_PROBE = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
}

function hasPromptApi (): boolean {
  return typeof window !== 'undefined' && !!window.LanguageModel?.availability
}

/** Client-side tier detection for Site AI and reply assistant. */
export async function detectBrowserAiSupport (): Promise<BrowserAiSupport> {
  if (typeof window === 'undefined') {
    return { status: 'unsupported', reason: 'no-prompt-api' }
  }

  if (isMobileClient()) {
    return { status: 'unsupported', reason: 'mobile' }
  }

  if (!hasPromptApi()) {
    return { status: 'unsupported', reason: 'no-prompt-api' }
  }

  let modelStatus: Awaited<ReturnType<NonNullable<typeof window.LanguageModel>['availability']>> | null = null
  try {
    modelStatus = await window.LanguageModel!.availability(LM_PROBE)
  } catch {
    return { status: 'unsupported', reason: 'model-unavailable' }
  }

  if (modelStatus === 'unavailable') {
    return { status: 'unsupported', reason: 'model-unavailable' }
  }

  if (!isSiteAiEnabled()) {
    return { status: 'needs-setup', reason: 'feature-disabled' }
  }

  const { initWebMcp } = await import('@/lib/webmcp/init')
  await initWebMcp()

  if (!getModelContext()) {
    return { status: 'needs-setup', reason: 'webmcp-unavailable' }
  }

  const modelReady = await isBrowserLanguageModelAvailable()
  if (!modelReady) {
    return { status: 'needs-setup', reason: 'webmcp-unavailable' }
  }

  return { status: 'ready' }
}

/** Whether the purple launcher should appear (capable desktop, not fully blocked). */
export function shouldShowBrowserAiLauncher (support: BrowserAiSupport | { status: 'checking' }): boolean {
  if (support.status === 'checking') return false
  return support.status === 'ready' || support.status === 'needs-setup'
}
