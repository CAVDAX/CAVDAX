/**
 * Dynamically populated at build-time from apps/mcp-server/package.json via vite.config.js
 * Fallback to 1.2.5 if evaluated outside Vite's define transform.
 */
export const MCP_SERVER_DEFAULT_VERSION = typeof __MCP_SERVER_VERSION__ !== 'undefined'
  ? __MCP_SERVER_VERSION__
  : '1.2.5';
