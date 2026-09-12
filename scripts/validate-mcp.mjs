#!/usr/bin/env node
/**
 * Validate /api/mcp health + JSON-RPC tools/list when MCP_SERVER_ENABLED=1.
 *
 * Usage:
 *   MCP_SERVER_ENABLED=1 npm run dev   # separate terminal
 *   node scripts/validate-mcp.mjs
 *   node scripts/validate-mcp.mjs https://old.paradigmthreat.net
 */

const base = (process.argv[2] || process.env.MCP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const mcpUrl = `${base}/api/mcp`

async function main () {
  console.log(`MCP validate → ${mcpUrl}`)

  const health = await fetch(`${mcpUrl}?health=1`)
  const healthBody = await health.json().catch(() => ({}))
  if (!health.ok) {
    console.error('Health check failed:', health.status, healthBody)
    process.exit(1)
  }
  console.log('Health:', healthBody)

  const initBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'validate-mcp', version: '1.0.0' },
    },
  }

  const initRes = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(initBody),
  })

  const initText = await initRes.text()
  console.log('Initialize status:', initRes.status)
  if (!initRes.ok) {
    console.error(initText.slice(0, 500))
    process.exit(1)
  }

  const listBody = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  }

  const listRes = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(listBody),
  })

  const listText = await listRes.text()
  if (!listRes.ok) {
    console.error('tools/list failed:', listRes.status, listText.slice(0, 500))
    process.exit(1)
  }

  let tools = []
  try {
    const parsed = JSON.parse(listText)
    tools = parsed.result?.tools ?? parsed.tools ?? []
  } catch {
    const dataLine = listText.split('\n').find((l) => l.startsWith('data:'))
    if (dataLine) {
      const parsed = JSON.parse(dataLine.slice(5).trim())
      tools = parsed.result?.tools ?? []
    }
  }

  const names = tools.map((t) => t.name)
  console.log('Tools:', names.join(', ') || '(none parsed — raw follows)')
  if (!names.length) console.log(listText.slice(0, 800))

  for (const required of ['search_site', 'research_status', 'get_site_claims', 'submit_investigation_idea', 'submit_chat_comment']) {
    if (!names.includes(required)) {
      console.error(`Missing tool: ${required}`)
      process.exit(1)
    }
  }

  const callBody = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get_chronology_framework',
      arguments: {},
    },
  }

  const callRes = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(callBody),
  })

  const callText = await callRes.text()
  if (!callRes.ok) {
    console.error('tools/call failed:', callRes.status, callText.slice(0, 500))
    process.exit(1)
  }

  console.log('get_chronology_framework call OK (first 200 chars):', callText.slice(0, 200))
  console.log('MCP validation passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
