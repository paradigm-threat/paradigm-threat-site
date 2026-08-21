import assert from 'node:assert/strict'
import { describe, it, afterEach } from 'node:test'
import {
  DEFAULT_PIPER_API_BASES,
  getClientPiperApiBaseUrls,
  getServerPiperApiBaseUrls,
} from '@/lib/tts/piperBases'

describe('piperBases', () => {
  const envBackup = { ...process.env }

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('defaults to relay-gateway hosts when env unset', () => {
    delete process.env.PIPER_API_URLS
    delete process.env.PIPER_API_URL
    delete process.env.NEXT_PUBLIC_PIPER_API_URLS
    delete process.env.NEXT_PUBLIC_PIPER_API_URL
    assert.deepEqual(getServerPiperApiBaseUrls(), [...DEFAULT_PIPER_API_BASES])
    assert.deepEqual(getClientPiperApiBaseUrls(), [...DEFAULT_PIPER_API_BASES])
  })

  it('parses space-separated PIPER_API_URLS', () => {
    process.env.PIPER_API_URLS = 'https://a.example https://b.example'
    assert.deepEqual(getServerPiperApiBaseUrls(), [
      'https://a.example',
      'https://b.example',
    ])
  })

  it('rewrites retired lon1/dfw1 Piper bases to iad1', () => {
    process.env.PIPER_API_URLS = 'https://lon1.relaygateway.net https://dfw1.relaygateway.net https://hkg1.relaygateway.net'
    assert.deepEqual(getServerPiperApiBaseUrls(), [
      'https://iad1.relaygateway.net',
      'https://hkg1.relaygateway.net',
    ])
  })
})
