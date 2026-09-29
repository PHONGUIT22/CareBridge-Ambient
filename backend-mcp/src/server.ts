import './config/env.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Multi-tier environment variable loader for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}

// Initialize Database
import { initDB } from './database/db.js';

// Core MCP Tools
import { getTodayScheduleTool } from './tools/getTodaySchedule.js';
import { logDoseStatusTool } from './tools/logDoseStatus.js';
import { recordVitalsTool } from './tools/recordVitals.js';
import { clinicalAdvisorTool } from './tools/clinicalAdvisor.js';
import { orderRefillTool } from './tools/orderRefill.js';
import { ringDeviceHubTool } from './tools/ringDeviceHub.js';
import { negotiateAdherenceTool } from './tools/negotiateAdherence.js';

// Core MCP Resources & Prompts
import { registeredResources, readResourceHandler } from './resources/index.js';
import { registeredPrompts, getPromptHandler } from './prompts/index.js';

// Express REST API Router
import { apiRouter } from './routes/apiRoutes.js';

const app = express();
const PORT = Number(process.env.MCP_PORT || process.env.PORT) || 3001;

// CORS configuration for Next.js frontend
app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. INITIALIZE DATABASE SCHEMA & SYSTEM TABLES
initDB();

// ==========================================
// 2. SETUP MCP SERVER (Spec 2025-11-25)
// ==========================================
const mcpServer = new Server(
  {
    name: 'carebridge-ambient-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Registered tools ready for Alexa+ agent
const registeredTools = [
  getTodayScheduleTool,
  logDoseStatusTool,
  recordVitalsTool,
  clinicalAdvisorTool,
  orderRefillTool,
  ringDeviceHubTool,
  negotiateAdherenceTool,
];

// --- MCP TOOLS HANDLERS ---
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: registeredTools.map((t) => t.definition),
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: toolArgs } = request.params;

  try {
    switch (name) {
      case 'getTodaySchedule': {
        const result = await getTodayScheduleTool.handler(toolArgs as unknown as Parameters<typeof getTodayScheduleTool.handler>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'logDoseStatus': {
        const result = await logDoseStatusTool.handler(toolArgs as unknown as Parameters<typeof logDoseStatusTool.handler>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'recordVitals': {
        const result = await recordVitalsTool.handler(toolArgs as unknown as Parameters<typeof recordVitalsTool.handler>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'clinicalAdvisor': {
        const result = await clinicalAdvisorTool.handler(toolArgs as unknown as Parameters<typeof clinicalAdvisorTool.handler>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'orderRefill': {
        const result = await orderRefillTool.handler(toolArgs as unknown as Parameters<typeof orderRefillTool.handler>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'ringDeviceHub': {
        const result = await ringDeviceHubTool.handler(toolArgs as unknown as Parameters<typeof ringDeviceHubTool.handler>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'negotiateAdherence': {
        const result = await negotiateAdherenceTool.handler(toolArgs as unknown as Parameters<typeof negotiateAdherenceTool.handler>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`MCP Tool '${name}' does not exist.`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: 'text', text: `Error executing tool '${name}': ${message}` }],
    };
  }
});

// --- MCP RESOURCES HANDLERS ---
mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: registeredResources,
  };
});

mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  try {
    return await readResourceHandler(uri);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read MCP Resource '${uri}': ${message}`);
  }
});

// --- MCP PROMPTS HANDLERS ---
mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: registeredPrompts,
  };
});

mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: promptArgs } = request.params;
  try {
    return await getPromptHandler(name, promptArgs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get MCP Prompt '${name}': ${message}`);
  }
});

// ==========================================
// 3. STREAMABLE HTTP TRANSPORT (SSE cho Alexa+)
// ==========================================
const sseTransports = new Map<string, SSEServerTransport>();

// SSE stream initiation endpoint
app.get('/sse', async (req: Request, res: Response) => {
  console.log('[MCP] New client connected via SSE stream...');
  const transport = new SSEServerTransport('/message', res);
  sseTransports.set(transport.sessionId, transport);

  req.on('close', () => {
    console.log(`[MCP] Closed SSE session: ${transport.sessionId}`);
    sseTransports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

// Message POST endpoint from Alexa+ client
app.post('/message', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: 'MCP Session does not exist or has expired.' });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// ==========================================
// 4. MOUNT MODULAR REST API ROUTES
// ==========================================
app.use('/api', apiRouter);

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`
=====================================================
  CAREBRIDGE AMBIENT MCP SERVER READY!
  • Port:               ${PORT}
  • REST API:           http://localhost:${PORT}/api/today
  • MCP SSE Endpoint:   http://localhost:${PORT}/sse
  • MCP Message Post:   http://localhost:${PORT}/message
=====================================================
  `);
  console.log(`[AWS Config] Region: ${process.env.AWS_REGION || 'none'}, Key ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Configured' : 'Empty'}`);
});
export default app;