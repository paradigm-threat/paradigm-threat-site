/**
 * Regression tests for TTS preprocessing (Unicode arrows, section signs, etc.).
 * Run: pnpm test:unit
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    buildParagraphStarts,
    expandInitialismsForTTS,
    expandUnicodeSymbolsForTTS,
    preprocessSpeechText,
    splitSentences,
    stripMarkdownForTTS,
} from './ttsHelpers.ts'

/** Largest block index i where starts[i] <= s (same rule as article TTS paragraph seek). */
function paragraphIndexForSentence(starts: number[], s: number): number {
    let paraIdx = 0
    for (let i = 0; i < starts.length; i++) {
        if (starts[i] <= s) paraIdx = i
    }
    return paraIdx
}

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

describe('buildParagraphStarts + splitSentences (paragraph seek)', () => {
    const longLine = (tag: string) =>
        `Block ${tag} with enough characters to stay above the thirty character merge threshold in splitSentences.`

    it('uses single-newline lines so later sentences map past block 0', () => {
        const text = `${longLine('one')}\n${longLine('two')}\n${longLine('three')}`
        const sentences = splitSentences(text)
        const starts = buildParagraphStarts(text)
        assert.ok(sentences.length >= 3, `sentences: ${sentences.length}`)
        const i0 = paragraphIndexForSentence(starts, 0)
        const iMid = paragraphIndexForSentence(starts, 1)
        const iLast = paragraphIndexForSentence(starts, sentences.length - 1)
        assert.equal(i0, 0)
        assert.equal(iMid, 1)
        assert.equal(iLast, 2)
    })

    it('still advances blocks across blank-line paragraphs', () => {
        const text = `${longLine('A')}\n\n${longLine('B')}\n\n${longLine('C')}`
        const sentences = splitSentences(text)
        const starts = buildParagraphStarts(text)
        assert.ok(sentences.length >= 3)
        assert.equal(paragraphIndexForSentence(starts, sentences.length - 1), 2)
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

describe('expandInitialismsForTTS + preprocessSpeechText', () => {
    it('rewrites CIA to dotted initialism', () => {
        const dotted = expandInitialismsForTTS('The CIA reviewed it.')
        assert.match(dotted, /C\.I\.A\./)
        assert.ok(!/\bCIA\b/.test(dotted))
        const full = preprocessSpeechText('Report from CIA on file.')
        assert.match(full, /C\.I\.A\./)
    })

    it('runs after arrow expansion so OSS to CIA gets both dotted', () => {
        const out = preprocessSpeechText(expandUnicodeSymbolsForTTS('OSS→CIA'))
        assert.match(out, /C\.I\.A\./)
        assert.match(out, /O\.S\.S\./)
        assert.ok(!/\bCIA\b/.test(out))
        assert.ok(!/\bOSS\b/.test(out))
    })

    it('does not rewrite lowercase cia in URLs', () => {
        const s = 'See https://www.cia.gov/readingroom for context.'
        assert.equal(expandInitialismsForTTS(s), s)
        const full = preprocessSpeechText(s)
        assert.ok(full.includes('cia.gov'), full)
        assert.ok(!full.includes('C.I.A.'), full)
    })

    it('stripMarkdownForTTS end-to-end mentions CIA dotted', () => {
        const out = stripMarkdownForTTS('The **CIA** document.', '')
        assert.match(out, /C\.I\.A\./)
    })
})
