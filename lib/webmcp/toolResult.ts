import type { CallToolResult, JsonObject } from '@mcp-b/webmcp-types'

export function toolJsonResult (data: unknown, isError = false): CallToolResult {
  const structured =
    data !== null && typeof data === 'object' && !Array.isArray(data)
      ? (data as JsonObject)
      : undefined
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: structured,
    isError,
  }
}

export function toolErrorResult (message: string): CallToolResult {
  return toolJsonResult({ error: message }, true)
}
