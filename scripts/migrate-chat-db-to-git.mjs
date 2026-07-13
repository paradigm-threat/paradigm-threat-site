#!/usr/bin/env node
/**
 * One-time export: Vercel Postgres chat → markdown files for `chat/public` branch.
 *
 * Usage:
 *   node --import tsx scripts/migrate-chat-db-to-git.mjs [--out DIR] [--dry-run]
 *
 * Requires POSTGRES_URL. Writes under .relay/chat/ for git commit on chat/public.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import matter from 'gray-matter'
import { sql } from '@vercel/postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

dotenv.config({ path: join(repoRoot, '.env.local') })
dotenv.config({ path: join(repoRoot, '.env') })

const CHAT_CHANNELS_ROOT = '.relay/chat/channels/'

function encodeChatChannel (channel) {
  return encodeURIComponent(channel.trim().replace(/^\/+/, ''))
}

function channelPathPrefix (channel) {
  return `${CHAT_CHANNELS_ROOT}${encodeChatChannel(channel)}/`
}

function compactIsoTimestamp (date) {
  return date.toISOString().replace(/[:.]/g, '-')
}

function commentFilePath (channel, created, legacyId) {
  const ulid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()
  const ts = compactIsoTimestamp(created)
  const idPart = String(legacyId).padStart(8, '0')
  return `${channelPathPrefix(channel)}${ts}_${idPart}_${ulid}.md`
}

function serializeChatComment (comment) {
  const fm = {
    schema: 'paradigm.chat.v1',
    id: String(comment.id),
    channel: comment.channel,
    anonymous: comment.anonymous,
    created: comment.created,
    source: comment.source || 'web',
    signed: false,
  }
  if (!comment.anonymous && comment.author) fm.author = comment.author
  return matter.stringify(comment.content, fm)
}

const dryRun = process.argv.includes('--dry-run')
const outIdx = process.argv.indexOf('--out')
const outDir = outIdx >= 0 ? process.argv[outIdx + 1] : join(repoRoot, '.relay-migrate-chat')

async function main () {
  const { rows: channels } = await sql`SELECT id, name, description FROM channels ORDER BY name`
  const { rows: posts } = await sql`
    SELECT p.id, p.user_id, p.channel_id, p.created, p.content, u.username, c.name AS channel_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    JOIN channels c ON p.channel_id = c.id
    ORDER BY p.created ASC
  `

  console.log(`Channels: ${channels.length}, Posts: ${posts.length}`)

  const channelsJson = {
    schema: 'paradigm.chat.channels.v1',
    channels: channels.map((c) => ({
      name: c.name,
      description: c.description || '',
    })),
  }

  if (!dryRun) {
    await mkdir(join(outDir, '.relay/chat'), { recursive: true })
    await writeFile(
      join(outDir, '.relay/chat/channels.json'),
      JSON.stringify(channelsJson, null, 2) + '\n',
    )
  }

  let written = 0
  for (const post of posts) {
    const created = new Date(post.created)
    const path = commentFilePath(post.channel_name, created, post.id)
    const markdown = serializeChatComment({
      id: post.id,
      channel: post.channel_name,
      author: post.username,
      anonymous: false,
      created: created.toISOString(),
      content: post.content,
    })
    if (!dryRun) {
      const full = join(outDir, path)
      await mkdir(dirname(full), { recursive: true })
      await writeFile(full, markdown)
    }
    written++
  }

  console.log(dryRun ? `Would write ${written} posts to ${outDir}` : `Wrote ${written} posts to ${outDir}`)
  console.log('Next: copy to paradigm-threat-site repo, commit on chat/public, push to Relay.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
