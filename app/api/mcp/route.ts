import { NextResponse } from 'next/server'
import { handleMcpHttpRequest } from '@/lib/mcp/http'
import { isMcpServerEnabled } from '@/lib/siteOpsFeature'

export const runtime = 'nodejs'
export const maxDuration = 60

function disabled (): Response {
  return NextResponse.json(
    { error: 'MCP server is disabled. Set MCP_SERVER_ENABLED=1 on Vercel.' },
    { status: 503 },
  )
}

export async function GET (req: Request) {
  if (!isMcpServerEnabled()) return disabled()

  const url = new URL(req.url)
  if (url.searchParams.get('health') === '1') {
    return NextResponse.json({
      name: 'paradigm-threat-research',
      status: 'ok',
      transport: 'streamable-http',
      stateless: true,
    })
  }

  return handleMcpHttpRequest(req)
}

export async function POST (req: Request) {
  if (!isMcpServerEnabled()) return disabled()
  return handleMcpHttpRequest(req)
}

export async function DELETE (req: Request) {
  if (!isMcpServerEnabled()) return disabled()
  return handleMcpHttpRequest(req)
}
