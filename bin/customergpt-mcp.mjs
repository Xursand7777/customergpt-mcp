#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema, CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';

export const DEFAULT_BASE_URL = 'https://api.customergpt.ai';
const {version} = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

export function endpoint(env = process.env) {
  const url = new URL(env.CUSTOMERGPT_API_URL || DEFAULT_BASE_URL);
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) throw new Error('CUSTOMERGPT_API_URL must be an origin without /api, credentials or query parameters');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('CUSTOMERGPT_API_URL must use HTTPS except for a local development server');
  // Without a key only the anonymous demo tools are available.
  return new URL(url.origin + (env.CUSTOMERGPT_API_KEY ? '/api/mcp' : '/api/mcp/public'));
}

export async function start(env = process.env) {
  const url = endpoint(env);
  const remote = new Client({name: 'customergpt-mcp', version});
  await remote.connect(new StreamableHTTPClientTransport(url, {
    requestInit: {headers: {'User-Agent': 'customergpt-mcp/' + version, ...(env.CUSTOMERGPT_API_KEY ? {Authorization: 'Bearer ' + env.CUSTOMERGPT_API_KEY} : {})}},
  }));
  const local = new Server({name: 'customergpt', version}, {capabilities: {tools: {}}, instructions: remote.getInstructions()});
  local.setRequestHandler(ListToolsRequestSchema, request => remote.listTools(request.params));
  local.setRequestHandler(CallToolRequestSchema, request => remote.callTool(request.params));
  local.onclose = () => { void remote.close(); };
  await local.connect(new StdioServerTransport());
  return local;
}

const HELP = `CustomerGPT MCP server (stdio) v${version}

Proxies the hosted CustomerGPT MCP endpoint to MCP clients that launch local servers.

Usage:
  npx -y @customergpt/mcp

Environment:
  CUSTOMERGPT_API_KEY  Workspace API key. Without it only anonymous demo tools are listed.
  CUSTOMERGPT_API_URL  Backend origin (default ${DEFAULT_BASE_URL}).

Clients that support remote MCP can connect directly to ${DEFAULT_BASE_URL}/api/mcp with OAuth.`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.includes('--version') || args.includes('-v')) console.log(version);
  else if (args.length) { console.error(HELP); process.exitCode = args.some(a => ['--help', '-h'].includes(a)) ? 0 : 1; }
  else start().catch(error => {
    // stdout belongs to the MCP protocol; diagnostics go to stderr.
    console.error('customergpt-mcp: ' + error.message);
    process.exit(1);
  });
}
