import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {ListToolsRequestSchema, CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {endpoint} from '../bin/customergpt-mcp.mjs';

const bin = fileURLToPath(new URL('../bin/customergpt-mcp.mjs', import.meta.url));

async function hosted(seen) {
  const http = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    seen.push({path: req.url, auth: req.headers.authorization});
    const server = new Server({name: 'hosted', version: '1'}, {capabilities: {tools: {}}, instructions: 'Use dryRun first.'});
    server.setRequestHandler(ListToolsRequestSchema, () => ({tools: [{name: 'chatbots_list', title: 'List chatbots', inputSchema: {type: 'object'}, annotations: {readOnlyHint: true}}]}));
    server.setRequestHandler(CallToolRequestSchema, call => ({content: [{type: 'text', text: JSON.stringify({ok: true, data: call.params})}]}));
    const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
    res.on('close', () => { void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, JSON.parse(body || 'null'));
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  return http;
}

test('stdio launcher proxies tools, calls and instructions to the hosted endpoint with the API key', async () => {
  const seen = [];
  const http = await hosted(seen);
  const client = new Client({name: 'mcp-test', version: '1'});
  try {
    await client.connect(new StdioClientTransport({command: process.execPath, args: [bin], env: {CUSTOMERGPT_API_URL: 'http://127.0.0.1:' + http.address().port, CUSTOMERGPT_API_KEY: 'cgpt_test'}, stderr: 'pipe'}));
    assert.equal(client.getInstructions(), 'Use dryRun first.');
    const {tools} = await client.listTools();
    assert.equal(tools[0].name, 'chatbots_list');
    assert.equal(tools[0].annotations.readOnlyHint, true);
    const result = await client.callTool({name: 'chatbots_list', arguments: {limit: 2}});
    assert.deepEqual(JSON.parse(result.content[0].text).data, {name: 'chatbots_list', arguments: {limit: 2}});
    assert.ok(seen.length > 0 && seen.every(r => r.path === '/api/mcp' && r.auth === 'Bearer cgpt_test'));
  } finally { await client.close(); await new Promise(resolve => http.close(resolve)); }
});

test('endpoint uses the public demo path without a key and rejects unsafe origins', () => {
  assert.equal(endpoint({}).href, 'https://api.customergpt.ai/api/mcp/public');
  assert.equal(endpoint({CUSTOMERGPT_API_KEY: 'k'}).href, 'https://api.customergpt.ai/api/mcp');
  assert.throws(() => endpoint({CUSTOMERGPT_API_URL: 'http://evil.example'}));
  assert.throws(() => endpoint({CUSTOMERGPT_API_URL: 'https://api.customergpt.ai/api'}));
});
