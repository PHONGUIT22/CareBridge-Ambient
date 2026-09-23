import './config/env.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

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

// Initialize Database and Seeder
import { initDB, getDatabase } from './database/db.js';
import { seedDemoData } from './database/seedDemoData.js';
import { MedicineRepo } from './database/medicineRepo.js';
import { LogRepo } from './database/logRepo.js';
import { VitalsRepo } from './database/vitalsRepo.js';
import { CaregiverRepo } from './database/caregiverRepo.js';

// Core MCP Tools
import { getTodayScheduleTool } from './tools/getTodaySchedule.js';
import { logDoseStatusTool } from './tools/logDoseStatus.js';
import { recordVitalsTool } from './tools/recordVitals.js';
import { clinicalAdvisorTool } from './tools/clinicalAdvisor.js';
import { orderRefillTool } from './tools/orderRefill.js';
import { ringDeviceHubTool } from './tools/ringDeviceHub.js';
import { negotiateAdherenceTool } from './tools/negotiateAdherence.js';
import { getLocalDateString } from './utils/dateUtils.js';
import { handleAgentTurn } from './tools/agentTurnHandler.js';
import { synthesizeSpeech } from './aws/pollyClient.js';
import { checkDrugInteractions } from './services/drugInteractionService.js';

const app = express();
const PORT = Number(process.env.MCP_PORT || process.env.PORT) || 3001;

// Allow Next.js frontend (port 3000) CORS access
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

// Handler when Alexa/Agent requests tool list
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: registeredTools.map((t) => t.definition),
  };
});

// Handler when Alexa/Agent executes a tool
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: toolArgs } = request.params;

  try {
    switch (name) {
      case 'getTodaySchedule': {
        const result = await getTodayScheduleTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'logDoseStatus': {
        const result = await logDoseStatusTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'recordVitals': {
        const result = await recordVitalsTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'clinicalAdvisor': {
        const result = await clinicalAdvisorTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'orderRefill': {
        const result = await orderRefillTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'ringDeviceHub': {
        const result = await ringDeviceHubTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'negotiateAdherence': {
        const result = await negotiateAdherenceTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`MCP Tool '${name}' does not exist.`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error executing tool '${name}': ${error.message}` }],
    };
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
// 4. REST APIS FOR NEXT.JS FRONTEND
// ==========================================

/**
 * Helper to extract active authenticated user ID from request headers, query, or body
 */
function extractUserId(req: Request): string | undefined {
  const fromHeader = req.headers['x-user-id'];
  if (typeof fromHeader === 'string' && fromHeader.trim()) {
    return fromHeader.trim();
  }
  const fromQuery = req.query.userId;
  if (typeof fromQuery === 'string' && fromQuery.trim()) {
    return fromQuery.trim();
  }
  if (req.body && typeof req.body.userId === 'string' && req.body.userId.trim()) {
    return req.body.userId.trim();
  }
  return undefined;
}

// POST /api/auth/login - Multi-user authentication & demo isolation
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, pin, role } = req.body || {};
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, error: 'Email address is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPin = pin !== undefined && pin !== null ? String(pin).trim() : '';
    const userRole = role === 'senior' ? 'senior' : 'caregiver';

    const isDemoAccount = normalizedEmail === 'demo@gmail.com' && normalizedPin === '1234';
    const db = getDatabase();

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;

    if (!user) {
      const id = isDemoAccount ? 'usr_demo' : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isPro = isDemoAccount ? 1 : 0;
      const isDemo = isDemoAccount ? 1 : 0;
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, email, pin, role, is_pro, is_demo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, normalizedEmail, normalizedPin || null, userRole, isPro, isDemo, createdAt);

      user = {
        id,
        email: normalizedEmail,
        pin: normalizedPin || null,
        role: userRole,
        is_pro: isPro,
        is_demo: isDemo,
        created_at: createdAt,
      };
    } else {
      // If demo account logging in, make sure is_demo and is_pro are 1
      if (isDemoAccount && (!user.is_demo || !user.is_pro)) {
        db.prepare('UPDATE users SET is_demo = 1, is_pro = 1 WHERE id = ?').run(user.id);
        user.is_demo = 1;
        user.is_pro = 1;
      }
    }

    // Seed demo data ONLY when email is demo@gmail.com and pin is 1234
    if (isDemoAccount) {
      await seedDemoData(user.id, false);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: userRole,
        isPro: Boolean(user.is_pro),
        isDemo: Boolean(user.is_demo),
        name: userRole === 'senior'
          ? (isDemoAccount ? 'Eleanor Vance (Senior)' : `${user.email} (Senior)`)
          : (isDemoAccount ? 'Sarah Connor (Caregiver)' : `${user.email} (Caregiver)`),
      },
    });
  } catch (error: any) {
    console.error('[Auth Login Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/schedule - Fetch schedule + vitals + caregiver for targetDate (defaults to today)
app.get('/api/schedule', async (req: Request, res: Response) => {
  try {
    const today = getLocalDateString();
    const targetDate = (req.query.date as string) || today;
    const userId = extractUserId(req);
    const [schedule, vitals, caregiver] = await Promise.all([
      LogRepo.getLogsByDate(targetDate, userId),
      VitalsRepo.getVitalsByDate(targetDate, userId),
      CaregiverRepo.getCaregiver(),
    ]);

    const total = schedule.length;
    const taken = schedule.filter((s) => s.status === 'taken').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    res.json({
      success: true,
      date: targetDate,
      adherenceRate,
      schedule,
      vitals,
      caregiver,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backward-compatible alias for /api/today -> forwards to date-filtered schedule
app.get('/api/today', async (req: Request, res: Response) => {
  try {
    const today = getLocalDateString();
    const targetDate = (req.query.date as string) || today;
    const userId = extractUserId(req);
    const [schedule, vitals, caregiver] = await Promise.all([
      LogRepo.getLogsByDate(targetDate, userId),
      VitalsRepo.getVitalsByDate(targetDate, userId),
      CaregiverRepo.getCaregiver(),
    ]);

    const total = schedule.length;
    const taken = schedule.filter((s) => s.status === 'taken').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    res.json({
      success: true,
      date: targetDate,
      adherenceRate,
      schedule,
      vitals,
      caregiver,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Direct "I Took My Pill" toggle action
app.post('/api/toggle', async (req: Request, res: Response) => {
  try {
    const { logId, currentStatus } = req.body;
    if (!logId) {
      res.status(400).json({ success: false, error: 'Missing logId parameter.' });
      return;
    }

    await LogRepo.toggleLogStatus(logId, currentStatus);
    res.json({ success: true, message: 'Medication dose status updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log or update dose status (Alexa voice command or direct UI action)
app.post('/api/dose', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await logDoseStatusTool.handler({ ...req.body, userId });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Amazon Pharmacy 1-Click medication refill
app.post('/api/refill', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await orderRefillTool.handler({ ...req.body, userId });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ring Smart Ecosystem control and monitoring
app.post('/api/ring', async (req: Request, res: Response) => {
  try {
    const result = await ringDeviceHubTool.handler(req.body || {});
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update clinical dose notes
app.post('/api/note', async (req: Request, res: Response) => {
  try {
    const { logId, notes } = req.body;
    if (!logId) {
      res.status(400).json({ success: false, error: 'Missing logId parameter.' });
      return;
    }
    await LogRepo.updateLogNotes(logId, notes || '');
    res.json({ success: true, message: 'Clinical note saved successfully.', logId, notes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quick vitals recording from QuickVitalsBar
app.post('/api/vitals', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await recordVitalsTool.handler({ ...req.body, userId });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch 30-day historical matrix for punch-card visualization & clinician report
app.get('/api/history', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const [logs, vitals] = await Promise.all([
      LogRepo.getAllLogs(userId),
      VitalsRepo.getAllVitals(userId),
    ]);
    res.json({ success: true, logs, vitals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// All medicines catalog and inventory levels
app.get('/api/medicines', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const medicines = await MedicineRepo.getAllMedicines(userId);
    res.json({ success: true, medicines });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new medicine to catalog
app.post('/api/medicines', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const { name, dosage, reminderTimes, daysOfWeek, stockCount, imageUri, type } = req.body;
    if (!name || !dosage) {
      res.status(400).json({ success: false, error: 'Medicine name and dosage are required.' });
      return;
    }
    const id = await MedicineRepo.addMedicine({
      userId,
      name,
      dosage,
      reminderTimes: reminderTimes || ['08:00'],
      daysOfWeek: daysOfWeek || ['ALL'],
      stockCount: stockCount !== undefined ? Number(stockCount) : 30,
      imageUri,
      type: type || 'medication',
    });
    const todayStr = getLocalDateString();
    await LogRepo.generateLogsForDate(todayStr, userId);
    res.json({ success: true, id, message: 'New medicine added successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update medicine in catalog
app.put('/api/medicines/:id', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, error: 'Missing medicine id.' });
      return;
    }

    const { name, dosage, reminderTimes, daysOfWeek, stockCount, type, imageUri } = req.body || {};

    await MedicineRepo.updateMedicine(
      id,
      {
        name,
        dosage,
        reminderTimes,
        daysOfWeek,
        stockCount: stockCount !== undefined ? Number(stockCount) : undefined,
        type,
        imageUri,
      },
      userId
    );

    // Synchronize today's pending intake logs if reminderTimes or schedule changed
    const todayStr = getLocalDateString();
    const db = getDatabase();
    if (reminderTimes && Array.isArray(reminderTimes)) {
      if (userId) {
        db.prepare(
          "DELETE FROM intake_logs WHERE medicine_id = ? AND date = ? AND status = 'pending' AND user_id = ?"
        ).run(id, todayStr, userId);
      } else {
        db.prepare(
          "DELETE FROM intake_logs WHERE medicine_id = ? AND date = ? AND status = 'pending'"
        ).run(id, todayStr);
      }
    }
    await LogRepo.generateLogsForDate(todayStr, userId);

    res.json({ success: true, message: 'Medicine updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete medicine from catalog
app.delete('/api/medicines/:id', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, error: 'Missing medicine id.' });
      return;
    }
    await MedicineRepo.deleteMedicine(id, userId);
    res.json({ success: true, message: 'Medicine deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Automated drug interaction check (Drug Safety & Beers Criteria check)
app.post('/api/medicines/check-interaction', async (req: Request, res: Response) => {
  try {
    const { newMedicineName, currentMedicines } = req.body || {};
    if (!newMedicineName || typeof newMedicineName !== 'string') {
      res.status(400).json({ success: false, error: 'Missing medicine name to check (newMedicineName).' });
      return;
    }
    const result = await checkDrugInteractions(newMedicineName, currentMedicines);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Server Check Interaction Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clinical advisor query endpoint for AlexaAgentConsole and voice/text queries
app.post('/api/advisor', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ success: false, error: 'Missing question query.' });
      return;
    }
    const result = await clinicalAdvisorTool.handler({ query });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Health Guardian adherence negotiation endpoint
app.post('/api/guardian/negotiate', async (req: Request, res: Response) => {
  try {
    const result = await negotiateAdherenceTool.handler(req.body || {});
    res.json(result);
  } catch (error: any) {
    console.error('[Server Guardian Negotiate Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Agent turn orchestration endpoint (Claude Haiku Native Tool-Use & Offline Heuristic Fallback)
app.post('/api/agent/turn', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Missing user query for agent turn.' });
      return;
    }
    const result = await handleAgentTurn({ query, context });
    res.json(result);
  } catch (error: any) {
    console.error('[Server Agent Turn Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AWS Polly Neural TTS synthesis endpoint for Alexa & Echo Show Smart Displays
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Missing text content for TTS synthesis.' });
      return;
    }

    const audioBuffer = await synthesizeSpeech(text, voiceId);
    if (!audioBuffer) {
      res.status(200).json({
        success: false,
        fallback: true,
        message: 'AWS Polly is not configured or unavailable. Seamlessly fallback to Web Speech API.',
      });
      return;
    }

    if (req.headers.accept === 'audio/mpeg' || req.query.format === 'binary') {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.end(audioBuffer);
    } else {
      res.json({
        success: true,
        fallback: false,
        mimeType: 'audio/mpeg',
        audioBase64: audioBuffer.toString('base64'),
      });
    }
  } catch (error: any) {
    console.error('[Server TTS Error]:', error);
    res.status(200).json({
      success: false,
      fallback: true,
      error: error.message,
    });
  }
});

// Reset and reseed 30-day clinical demo dataset
app.post('/api/seed', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req) || 'usr_demo';
    await seedDemoData(userId, true);
    res.json({ success: true, message: `Reset and reseeded 30 days of clinical demo data for user ${userId} successfully!` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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