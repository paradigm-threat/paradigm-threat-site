import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { meshChannelFromChatRoom } from './chatMeshChannel.ts'

describe('meshChannelFromChatRoom', () => {
  it('maps legacy topics like park ChatRoomLive', () => {
    assert.equal(meshChannelFromChatRoom('nukes'), 'pt-nukes')
    assert.equal(meshChannelFromChatRoom('general'), 'pt-general')
    assert.equal(meshChannelFromChatRoom(''), 'pt-general')
    assert.equal(meshChannelFromChatRoom('governance/usury'), 'pt-governance-usury')
    assert.equal(meshChannelFromChatRoom('influence/censorship'), 'pt-influence-censorship')
    assert.equal(meshChannelFromChatRoom('pt-nukes'), 'pt-nukes')
    assert.equal(meshChannelFromChatRoom('#hollow-earth'), 'pt-hollow-earth')
  })
})
