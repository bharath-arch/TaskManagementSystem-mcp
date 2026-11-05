#!/usr/bin/env node
require('dotenv').config();
const readline = require('readline');
const { connectDB } = require('../config/db');
const { seedInitialData } = require('../services/dataService');
const { MCP_TOOLS, executeMcpTool } = require('./tools');

const SERVER_NAME = 'jira-clone-mcp';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '2024-11-05';

function sendResponse(id, result, error = null) {
  const response = {
    jsonrpc: '2.0',
    id
  };
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  process.stdout.write(JSON.stringify(response) + '\n');
}

async function handleMessage(line) {
  if (!line || !line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
  } catch (err) {
    sendResponse(null, null, { code: -32700, message: 'Parse error: Invalid JSON' });
    return;
  }

  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize': {
        sendResponse(id, {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION
          },
          capabilities: {
            tools: {
              listChanged: false
            }
          }
        });
        break;
      }

      case 'notifications/initialized': {
        // Notification, no response needed
        break;
      }

      case 'ping': {
        sendResponse(id, {});
        break;
      }

      case 'tools/list': {
        sendResponse(id, {
          tools: MCP_TOOLS
        });
        break;
      }

      case 'tools/call': {
        if (!params || !params.name) {
          sendResponse(id, null, { code: -32602, message: 'Missing tool name in params' });
          return;
        }

        const toolResult = await executeMcpTool(params.name, params.arguments || {});
        sendResponse(id, toolResult);
        break;
      }

      default: {
        if (id !== undefined && id !== null) {
          sendResponse(id, null, { code: -32601, message: `Method not found: ${method}` });
        }
      }
    }
  } catch (err) {
    sendResponse(id, null, { code: -32603, message: `Internal error: ${err.message}` });
  }
}

async function start() {
  try {
    await connectDB();
    await seedInitialData();

    // Setup stdio readline
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', handleMessage);
    rl.on('close', () => {
      process.exit(0);
    });

    // Send notification to stderr so stdout remains pure JSON-RPC
    process.stderr.write(`[MCP] ${SERVER_NAME} v${SERVER_VERSION} listening on stdio...\n`);
  } catch (err) {
    process.stderr.write(`[MCP] Failed to start: ${err.message}\n`);
    process.exit(1);
  }
}

start();

