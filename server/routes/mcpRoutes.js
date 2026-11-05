const express = require('express');
const router = express.Router();
const { MCP_TOOLS, executeMcpTool } = require('../mcp/tools');
const crypto = require('crypto');

// Map to store active SSE sessions
const sseSessions = new Map();

// 1. Get MCP tools specification
router.get('/tools', (req, res) => {
  res.json({
    tools: MCP_TOOLS,
    protocolVersion: '2024-11-05',
    serverInfo: {
      name: 'jira-clone-mcp',
      version: '1.0.0'
    }
  });
});

// 2. Direct tool execution (playground & quick invoke)
router.post('/execute', async (req, res) => {
  try {
    const { tool, args } = req.body;
    if (!tool) {
      return res.status(400).json({ error: 'Tool name is required' });
    }

    const result = await executeMcpTool(tool, args || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Standard JSON-RPC 2.0 endpoint over HTTP POST
router.post('/rpc', async (req, res) => {
  const { id, method, params } = req.body || {};

  try {
    switch (method) {
      case 'initialize':
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'jira-clone-mcp', version: '1.0.0' },
            capabilities: { tools: { listChanged: false } }
          }
        });

      case 'ping':
        return res.json({ jsonrpc: '2.0', id, result: {} });

      case 'tools/list':
        return res.json({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } });

      case 'tools/call':
        if (!params || !params.name) {
          return res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing tool name' }
          });
        }
        const toolResult = await executeMcpTool(params.name, params.arguments || {});
        return res.json({ jsonrpc: '2.0', id, result: toolResult });

      default:
        return res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not supported: ${method}` }
        });
    }
  } catch (err) {
    return res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: err.message }
    });
  }
});

// 4. Server-Sent Events (SSE) Transport
router.get('/sse', (req, res) => {
  const sessionId = crypto.randomUUID();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseSessions.set(sessionId, res);

  // Send initial endpoint event as required by MCP SSE specification
  const endpointUrl = `/api/mcp/messages?sessionId=${sessionId}`;
  res.write(`event: endpoint\ndata: ${endpointUrl}\n\n`);

  req.on('close', () => {
    sseSessions.delete(sessionId);
  });
});

// 5. Message receiver for active SSE sessions
router.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const sseRes = sseSessions.get(sessionId);

  if (!sseRes) {
    return res.status(404).json({ error: 'SSE session not found or expired' });
  }

  const { id, method, params } = req.body || {};
  res.status(202).json({ accepted: true });

  // Process message and send response over SSE
  try {
    let resultPayload = null;
    let errorPayload = null;

    if (method === 'initialize') {
      resultPayload = {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'jira-clone-mcp', version: '1.0.0' },
        capabilities: { tools: { listChanged: false } }
      };
    } else if (method === 'tools/list') {
      resultPayload = { tools: MCP_TOOLS };
    } else if (method === 'tools/call') {
      resultPayload = await executeMcpTool(params.name, params.arguments || {});
    } else if (method === 'ping') {
      resultPayload = {};
    } else {
      errorPayload = { code: -32601, message: `Method not found: ${method}` };
    }

    const rpcResponse = {
      jsonrpc: '2.0',
      id,
      ...(errorPayload ? { error: errorPayload } : { result: resultPayload })
    };

    sseRes.write(`event: message\ndata: ${JSON.stringify(rpcResponse)}\n\n`);
  } catch (err) {
    const errorResponse = {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: err.message }
    };
    sseRes.write(`event: message\ndata: ${JSON.stringify(errorResponse)}\n\n`);
  }
});

module.exports = router;

