# CustomerGPT MCP

[![npm version](https://img.shields.io/npm/v/@customergpt/mcp.svg)](https://www.npmjs.com/package/@customergpt/mcp)
[![License: MIT](https://img.shields.io/npm/l/@customergpt/mcp.svg)](https://github.com/Xursand7777/customergpt-mcp/blob/main/LICENSE)

Connect AI assistants to **[CustomerGPT](https://customergpt.ai)** over the [Model Context Protocol](https://modelcontextprotocol.io). Let Claude, ChatGPT, Cursor or VS Code create support bots, train them on your website, read conversations and leads, and get the install snippet.

## Option 1: hosted endpoint (recommended)

If your client supports remote MCP servers, add this URL and sign in with OAuth:

```
https://api.customergpt.ai/api/mcp
```

No install required. Anonymous demo tools are available at `https://api.customergpt.ai/api/mcp/public`.

## Option 2: local launcher

For clients that only start local (stdio) servers:

```json
{
  "mcpServers": {
    "customergpt": {
      "command": "npx",
      "args": ["-y", "@customergpt/mcp"],
      "env": { "CUSTOMERGPT_API_KEY": "cgpt_..." }
    }
  }
}
```

The launcher forwards every request to the hosted endpoint, so new tools appear without updating the package. Requires Node.js 20+.

| Variable | Description |
| --- | --- |
| `CUSTOMERGPT_API_KEY` | Workspace API key. Without it only the anonymous demo tools are listed. |
| `CUSTOMERGPT_API_URL` | Backend origin. Default `https://api.customergpt.ai`. |

Prefer browser sign-in over an API key? Use [`@customergpt/cli`](https://www.npmjs.com/package/@customergpt/cli): run `customergpt login`, then use `customergpt mcp` as the command.

## Tools

Chatbots (list, get, create, update), knowledge sources (list, add, resync, delete), training jobs, test messages, conversations and leads, analytics, account usage, the install snippet and anonymous onboarding. Tools that change data ask the assistant to run a dry run and get your approval first.

## Related

- [`@customergpt/sdk`](https://www.npmjs.com/package/@customergpt/sdk) — typed JavaScript/TypeScript client
- [`@customergpt/cli`](https://www.npmjs.com/package/@customergpt/cli) — command-line interface

## License

MIT
