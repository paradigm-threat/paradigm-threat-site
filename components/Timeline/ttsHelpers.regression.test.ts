/**
 * Regression tests for TTS preprocessing (Unicode arrows, section signs, etc.).
 * Run: pnpm test:unit
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    expandUnicodeSymbolsForTTS,
    preprocessSpeechText,
    stripMarkdownForTTS,
} from './ttsHelpers.ts'

describe('expandUnicodeSymbolsForTTS', () => {
    it('maps glued pairs to "to" (no literal arrow left)', () => {
        const out = expandUnicodeSymbolsForTTS('Iran→Israel pitch, OSS→CIA, 2012→2016')
        assert.equal(out, 'Iran to Israel pitch, OSS to CIA, 2012 to 2016')
        assert.ok(!out.includes('\u2192'))
    })

    it('collapses stacked glued arrows', () => {
        const out = expandUnicodeSymbolsForTTS('a→b→c')
        assert.equal(out, 'a to b to c')
        assert.ok(!out.includes('\u2192'))
    })

    it('maps spaced narrative arrows to ", then "', () => {
        const out = expandUnicodeSymbolsForTTS('The Office → 13 Hours → Jack Ryan')
        assert.ok(out.includes('then'))
        assert.ok(!out.includes('\u2192'))
    })

    it('maps section sign for numbers and prose', () => {
        assert.match(expandUnicodeSymbolsForTTS('See §6.1–6.3.'), /section 6\.1/)
        assert.match(expandUnicodeSymbolsForTTS('§ Paradigm synthesis'), /^Section Paradigm synthesis/)
    })

    it('maps common non-right arrows', () => {
        assert.match(expandUnicodeSymbolsForTTS('A ← B'), /from/)
        assert.match(expandUnicodeSymbolsForTTS('X ⇒ Y'), / so /)
    })
})

describe('stripMarkdownForTTS + preprocessSpeechText', () => {
    it('strips markdown then expands arrows (end-to-end)', () => {
        const md = '*Iran→Israel* and *A* → *B*.'
        const out = stripMarkdownForTTS(md, '')
        assert.ok(!out.includes('\u2192'), out)
        assert.match(out, /Iran to Israel/)
        assert.match(out, /, then/)
    })

    it('preprocessSpeechText includes symbol expansion', () => {
        const out = preprocessSpeechText('Q→Z')
        assert.ok(!out.includes('\u2192'))
        assert.match(out, /to/)
    })
})
