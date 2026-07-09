import { createParadigmThreatMcpServer } from '@/lib/mcp/createServer'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { getClientIpFromRequest } from '@/lib/investigationSubmission/rateLimit'

/**
 * Stateless Streamable HTTP — one transport (+ connect) per request (Vercel serverless).
 */
export async function handleMcpHttpRequest (req: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  const server = createParadigmThreatMcpServer({
    submitClientKey: getClientIpFromRequest(req),
  })
  await server.connect(transport)

  try {
    return await transport.handleRequest(req)
  } finally {
    await server.close()
  }
}
