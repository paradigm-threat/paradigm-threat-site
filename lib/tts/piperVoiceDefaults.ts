/**
 * Default Piper voice when the user has not picked one (no `tl-tts-piper-voice` in localStorage).
 * Matches clevertree-tts-server display names like "Cori (GB)" by exact name, then fuzzy Cori + GB.
 */

export const PREFERRED_PIPER_DEFAULT_DISPLAY_NAME = 'Cori (GB)'

export type PiperVoicePick = {
    id: string
    name?: string
    lang?: string
    language?: string
    voice?: string
    quality?: string
}

function normName(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function pickCoriGb(voices: PiperVoicePick[]): PiperVoicePick | undefined {
    const target = normName(PREFERRED_PIPER_DEFAULT_DISPLAY_NAME)
    const exact = voices.find(v => normName(v.name ?? '') === target)
    if (exact) return exact
    return voices.find(
        v =>
            (/\bcori\b/i.test(v.name ?? '') || /en_GB-cori-/i.test(v.id)) &&
            (/\(gb\)/i.test(v.name ?? '') || /en[-_]gb/i.test(v.lang ?? v.language ?? '')),
    )
}

/**
 * Pick `voiceId` / `lang` for initial Piper UI: saved id wins; else Cori (GB) if listed;
 * else server `defaultVoiceId`; else first voice.
 */
export function resolveDefaultPiperVoiceId(
    voices: PiperVoicePick[],
    savedVoiceId: string | null,
    serverDefaultVoiceId: string | null,
): { voiceId: string; lang?: string } {
    const saved = savedVoiceId?.trim() ?? ''
    if (saved) {
        const v = voices.find(x => x.id === saved)
        return { voiceId: saved, lang: v?.lang ?? v?.language }
    }
    const cori = pickCoriGb(voices)
    if (cori) return { voiceId: cori.id, lang: cori.lang ?? cori.language }
    if (serverDefaultVoiceId) {
        const v = voices.find(x => x.id === serverDefaultVoiceId)
        return { voiceId: serverDefaultVoiceId, lang: v?.lang ?? v?.language }
    }
    const first = voices[0]
    return { voiceId: first?.id ?? '', lang: first?.lang ?? first?.language }
}
