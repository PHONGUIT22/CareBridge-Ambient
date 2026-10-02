import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/db.js';
import { seedDemoData } from '../database/seedDemoData.js';
import { MedicineRepo } from '../database/medicineRepo.js';
import { LogRepo } from '../database/logRepo.js';
import { VitalsRepo } from '../database/vitalsRepo.js';
import { CaregiverRepo } from '../database/caregiverRepo.js';
import { getLocalDateString } from '../utils/dateUtils.js';

import { logDoseStatusTool } from '../tools/logDoseStatus.js';
import { recordVitalsTool } from '../tools/recordVitals.js';
import { clinicalAdvisorTool } from '../tools/clinicalAdvisor.js';
import { orderRefillTool } from '../tools/orderRefill.js';
import { ringDeviceHubTool } from '../tools/ringDeviceHub.js';
import { negotiateAdherenceTool } from '../tools/negotiateAdherence.js';
import { handleAgentTurn } from '../tools/agentTurnHandler.js';
import { synthesizeSpeech } from '../aws/pollyClient.js';
import {
  checkDrugInteractions,
  BEERS_CRITERIA_GERIATRIC_DRUGS,
  getBeersCriteriaProfile,
} from '../services/drugInteractionService.js';
import {
  evaluateBedrockGuardrails,
  invokeBedrockWithStreaming,
  BEDROCK_GUARDRAIL_ID,
  BEDROCK_GUARDRAIL_VERSION,
} from '../aws/bedrockClient.js';
import { registeredResources, readResourceHandler } from '../resources/index.js';
import { registeredPrompts, getPromptHandler } from '../prompts/index.js';

export const apiRouter = Router();

/**
 * Helper to extract active authenticated user ID from request headers, query, or body
 */
export function extractUserId(req: Request): string | undefined {
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

// ==========================================
// AUTH & USER PROFILE ROUTES
// ==========================================

// POST /api/auth/login - Multi-user authentication & demo isolation
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
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

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as Record<string, unknown> | undefined;

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
        is_onboarded: isDemoAccount ? 1 : 0,
        caregiver_name: isDemoAccount ? 'Sarah Connor' : null,
        patient_name: isDemoAccount ? 'Eleanor Vance' : null,
        patient_age: isDemoAccount ? 78 : null,
        created_at: createdAt,
      };
    } else {
      // If demo account logging in, make sure is_demo, is_pro, and demo profile are set
      if (isDemoAccount) {
        db.prepare(`
          UPDATE users 
          SET is_demo = 1, is_pro = 1, is_onboarded = 1,
              caregiver_name = 'Sarah Connor',
              patient_name = 'Eleanor Vance',
              patient_age = 78
          WHERE id = ?
        `).run(user.id);
        user.is_demo = 1;
        user.is_pro = 1;
        user.is_onboarded = 1;
        user.caregiver_name = 'Sarah Connor';
        user.patient_name = 'Eleanor Vance';
        user.patient_age = 78;
      }
    }

    // Seed demo data ONLY when email is demo@gmail.com and pin is 1234
    if (isDemoAccount) {
      await seedDemoData(user.id as string, false);
    }

    const isOnboarded = isDemoAccount ? true : Boolean(user.is_onboarded);
    const caregiverName = (user.caregiver_name as string) || (isDemoAccount ? 'Sarah Connor' : null);
    const patientName = (user.patient_name as string) || (isDemoAccount ? 'Eleanor Vance' : null);
    const patientAge = (user.patient_age as number) || (isDemoAccount ? 78 : null);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: userRole,
        isPro: Boolean(user.is_pro),
        isDemo: Boolean(user.is_demo),
        isOnboarded,
        caregiverName,
        patientName,
        patientAge,
        name: userRole === 'senior'
          ? (patientName || (isDemoAccount ? 'Eleanor Vance (Senior)' : `${user.email} (Senior)`))
          : (caregiverName || (isDemoAccount ? 'Sarah Connor (Caregiver)' : `${user.email} (Caregiver)`)),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Auth Login Error]:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/user/profile - Save/Update Caregiver & Patient profile during Onboarding
apiRouter.post('/user/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || extractUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: missing user identifier.' });
      return;
    }

    const { caregiverName, patientName, patientAge } = req.body || {};
    if (!caregiverName || !patientName) {
      res.status(400).json({ success: false, error: 'caregiverName and patientName are required fields.' });
      return;
    }

    const ageNum = parseInt(String(patientAge), 10) || 75;
    const trimmedCaregiver = String(caregiverName).trim();
    const trimmedPatient = String(patientName).trim();
    const db = getDatabase();

    db.prepare(`
      UPDATE users 
      SET caregiver_name = ?,
          patient_name = ?,
          patient_age = ?,
          is_onboarded = 1
      WHERE id = ?
    `).run(trimmedCaregiver, trimmedPatient, ageNum, userId);

    // Also update caregiver_profile table
    try {
      db.prepare(`
        INSERT INTO caregiver_profile (id, name, email, updated_at)
        VALUES ('caregiver_active', ?, 'caregiver@carebridge.internal', ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
      `).run(trimmedCaregiver, new Date().toISOString());
    } catch (_) {}

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;

    res.json({
      success: true,
      user: {
        id: updatedUser?.id || userId,
        email: updatedUser?.email,
        role: updatedUser?.role || 'caregiver',
        isPro: Boolean(updatedUser?.is_pro),
        isDemo: Boolean(updatedUser?.is_demo),
        isOnboarded: true,
        caregiverName: (updatedUser?.caregiver_name as string) || trimmedCaregiver,
        patientName: (updatedUser?.patient_name as string) || trimmedPatient,
        patientAge: (updatedUser?.patient_age as number) || ageNum,
        name: trimmedCaregiver,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[User Profile Error]:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// SCHEDULE & MEDICATION LOG ROUTES
// ==========================================

// GET /api/schedule - Fetch schedule + vitals + caregiver for targetDate (defaults to today)
apiRouter.get('/schedule', async (req: Request, res: Response) => {
  try {
    const today = getLocalDateString();
    const targetDate = (req.query.date as string) || today;
    const userId = extractUserId(req);
    const db = getDatabase();

    const [schedule, vitals, caregiver, userRow] = await Promise.all([
      LogRepo.getLogsByDate(targetDate, userId),
      VitalsRepo.getVitalsByDate(targetDate, userId),
      CaregiverRepo.getCaregiver(),
      userId ? (db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined) : null,
    ]);

    const isDemo = userRow?.is_demo === 1 || userId === 'usr_demo';
    const caregiverName = (userRow?.caregiver_name as string) || (isDemo ? 'Sarah Connor' : (caregiver?.name || 'Caregiver'));
    const patientName = (userRow?.patient_name as string) || (isDemo ? 'Eleanor Vance' : 'Patient');
    const patientAge = (userRow?.patient_age as number) || (isDemo ? 78 : undefined);

    const total = schedule.length;
    const taken = schedule.filter((s) => s.status === 'taken').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    res.json({
      success: true,
      date: targetDate,
      adherenceRate,
      schedule,
      vitals: vitals || null,
      caregiver: {
        ...caregiver,
        name: caregiverName,
      },
      caregiverName,
      patientName,
      patientAge,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Backward-compatible alias for /api/today -> forwards to date-filtered schedule
apiRouter.get('/today', async (req: Request, res: Response) => {
  try {
    const today = getLocalDateString();
    const targetDate = (req.query.date as string) || today;
    const userId = extractUserId(req);
    const db = getDatabase();

    const [schedule, vitals, caregiver, userRow] = await Promise.all([
      LogRepo.getLogsByDate(targetDate, userId),
      VitalsRepo.getVitalsByDate(targetDate, userId),
      CaregiverRepo.getCaregiver(),
      userId ? (db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined) : null,
    ]);

    const isDemo = userRow?.is_demo === 1 || userId === 'usr_demo';
    const caregiverName = (userRow?.caregiver_name as string) || (isDemo ? 'Sarah Connor' : (caregiver?.name || 'Caregiver'));
    const patientName = (userRow?.patient_name as string) || (isDemo ? 'Eleanor Vance' : 'Patient');
    const patientAge = (userRow?.patient_age as number) || (isDemo ? 78 : undefined);

    const total = schedule.length;
    const taken = schedule.filter((s) => s.status === 'taken').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    res.json({
      success: true,
      date: targetDate,
      adherenceRate,
      schedule,
      vitals: vitals || null,
      caregiver: {
        ...caregiver,
        name: caregiverName,
      },
      caregiverName,
      patientName,
      patientAge,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Direct "I Took My Pill" toggle action
apiRouter.post('/toggle', async (req: Request, res: Response) => {
  try {
    const { logId, currentStatus } = req.body;
    if (!logId) {
      res.status(400).json({ success: false, error: 'Missing logId parameter.' });
      return;
    }

    await LogRepo.toggleLogStatus(logId, currentStatus);
    res.json({ success: true, message: 'Medication dose status updated successfully.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Log or update dose status (Alexa voice command or direct UI action)
apiRouter.post('/dose', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await logDoseStatusTool.handler({ ...req.body, userId });
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Amazon Pharmacy 1-Click medication refill
apiRouter.post('/refill', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await orderRefillTool.handler({ ...req.body, userId });
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Ring Smart Ecosystem control and monitoring
apiRouter.post('/ring', async (req: Request, res: Response) => {
  try {
    const result = await ringDeviceHubTool.handler(req.body || {});
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Update clinical dose notes
apiRouter.post('/note', async (req: Request, res: Response) => {
  try {
    const { logId, notes } = req.body;
    if (!logId) {
      res.status(400).json({ success: false, error: 'Missing logId parameter.' });
      return;
    }
    await LogRepo.updateLogNotes(logId, notes || '');
    res.json({ success: true, message: 'Clinical note saved successfully.', logId, notes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Quick vitals recording from QuickVitalsBar
apiRouter.post('/vitals', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await recordVitalsTool.handler({ ...req.body, userId });
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Fetch 30-day historical matrix for punch-card visualization & clinician report
apiRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const [logs, vitals] = await Promise.all([
      LogRepo.getAllLogs(userId),
      VitalsRepo.getAllVitals(userId),
    ]);
    res.json({ success: true, logs, vitals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// MEDICINE CATALOG & SAFETY AUDIT ROUTES
// ==========================================

// Automated drug interaction check (Drug Safety & Beers Criteria check)
apiRouter.post('/medicines/check-interaction', async (req: Request, res: Response) => {
  try {
    const { newMedicineName, currentMedicines } = req.body || {};
    if (!newMedicineName || typeof newMedicineName !== 'string') {
      res.status(400).json({ success: false, error: 'Missing medicine name to check (newMedicineName).' });
      return;
    }
    const result = await checkDrugInteractions(newMedicineName, currentMedicines);
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Server Check Interaction Error]:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/medicines/beers-criteria - Query 2023 AGS Beers Criteria 15-Medication Registry
apiRouter.get('/medicines/beers-criteria', async (req: Request, res: Response) => {
  try {
    const query = req.query.drug as string;
    if (query) {
      const profile = getBeersCriteriaProfile(query);
      if (!profile) {
        res.status(404).json({
          success: false,
          error: `Drug "${query}" not found in Beers Criteria registry.`,
          availableDrugs: Object.keys(BEERS_CRITERIA_GERIATRIC_DRUGS),
        });
        return;
      }
      res.json({ success: true, drug: query, profile });
      return;
    }

    res.json({
      success: true,
      guideline: '2023 American Geriatrics Society (AGS) Beers Criteria®',
      medicationsCount: Object.keys(BEERS_CRITERIA_GERIATRIC_DRUGS).length,
      medications: BEERS_CRITERIA_GERIATRIC_DRUGS,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// All medicines catalog and inventory levels
apiRouter.get('/medicines', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const medicines = await MedicineRepo.getAllMedicines(userId);
    res.json({ success: true, medicines });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Add new medicine to catalog
apiRouter.post('/medicines', async (req: Request, res: Response) => {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Update medicine in catalog
apiRouter.put('/medicines/:id', async (req: Request, res: Response) => {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Delete medicine from catalog
apiRouter.delete('/medicines/:id', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, error: 'Missing medicine id.' });
      return;
    }
    await MedicineRepo.deleteMedicine(id, userId);
    res.json({ success: true, message: 'Medicine deleted successfully.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// CLINICAL ADVISOR & AGENTIC TURN ORCHESTRATION
// ==========================================

// Clinical advisor query endpoint for AlexaAgentConsole and voice/text queries
apiRouter.post('/advisor', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ success: false, error: 'Missing question query.' });
      return;
    }
    const result = await clinicalAdvisorTool.handler({ query, userId });
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// AI Health Guardian adherence negotiation endpoint
apiRouter.post('/guardian/negotiate', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await negotiateAdherenceTool.handler({ ...(req.body || {}), userId });
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Server Guardian Negotiate Error]:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// Agent turn orchestration endpoint (Claude Haiku Native Tool-Use & Offline Heuristic Fallback)
apiRouter.post('/agent/turn', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const { query, context } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Missing user query for agent turn.' });
      return;
    }
    const result = await handleAgentTurn({ query, context, userId });
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Server Agent Turn Error]:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// Stream turn endpoint alias
apiRouter.post('/stream/turn', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const { query, context } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Missing user query for agent turn.' });
      return;
    }
    const result = await handleAgentTurn({ query, context, userId });
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Server Stream Turn Error]:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// AWS Polly Neural TTS synthesis endpoint for Alexa & Echo Show Smart Displays
apiRouter.post('/tts', async (req: Request, res: Response) => {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Server TTS Error]:', message);
    res.status(200).json({
      success: false,
      fallback: true,
      error: message,
    });
  }
});

// Reset and reseed 30-day clinical demo dataset
apiRouter.post('/seed', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req) || 'usr_demo';
    await seedDemoData(userId, true);
    res.json({ success: true, message: `Reset and reseeded 30 days of clinical demo data for user ${userId} successfully!` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// MCP PROTOCOL REST INSPECTION ENDPOINTS
// ==========================================

// GET /api/mcp/resources - List registered MCP read-only resources
apiRouter.get('/mcp/resources', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      resources: registeredResources,
      count: registeredResources.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/mcp/resources/read - Read resource content via query param (?uri=carebridge://...)
apiRouter.get('/mcp/resources/read', async (req: Request, res: Response) => {
  try {
    const uri = req.query.uri as string;
    if (!uri) {
      res.status(400).json({
        success: false,
        error: 'Missing required query parameter "uri".',
        registeredUris: registeredResources.map((r) => r.uri),
      });
      return;
    }
    const result = await readResourceHandler(uri);
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(404).json({ success: false, error: message });
  }
});

// GET /api/mcp/prompts - List registered pre-engineered MCP prompts
apiRouter.get('/mcp/prompts', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      prompts: registeredPrompts,
      count: registeredPrompts.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/mcp/prompts/:name - Retrieve prompt instructions by name
apiRouter.get('/mcp/prompts/:name', async (req: Request, res: Response) => {
  try {
    const rawName = req.params.name;
    const name = Array.isArray(rawName) ? rawName[0] : rawName;
    const args = req.query as Record<string, string>;
    const result = await getPromptHandler(name, args);
    res.json({ success: true, promptName: name, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(404).json({ success: false, error: message });
  }
});

// POST /api/mcp/prompts/get - Retrieve prompt instructions with JSON payload arguments
apiRouter.post('/mcp/prompts/get', async (req: Request, res: Response) => {
  try {
    const { name, arguments: promptArgs } = req.body || {};
    if (!name) {
      res.status(400).json({
        success: false,
        error: 'Missing prompt name in request body.',
        availablePrompts: registeredPrompts.map((p) => p.name),
      });
      return;
    }
    const result = await getPromptHandler(name, promptArgs);
    res.json({ success: true, promptName: name, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(404).json({ success: false, error: message });
  }
});

// ==========================================
// AWS BEDROCK CLINICAL ENTERPRISE & GUARDRAILS
// ==========================================

// POST /api/bedrock/guardrails/check - Verify Topic Denial & PII Redaction
apiRouter.post('/bedrock/guardrails/check', async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Missing text in request body.' });
      return;
    }
    const result = evaluateBedrockGuardrails(text);
    res.json({
      success: true,
      guardrailConfig: {
        identifier: BEDROCK_GUARDRAIL_ID,
        version: BEDROCK_GUARDRAIL_VERSION,
      },
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/bedrock/stream - Streaming Claude Haiku 4.5 inference with TTFA < 400ms metrics
apiRouter.post('/bedrock/stream', async (req: Request, res: Response) => {
  try {
    const { query, voiceId } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Missing query in request body.' });
      return;
    }

    const streamedTokens: string[] = [];
    const streamedSentences: string[] = [];

    const streamResult = await invokeBedrockWithStreaming(
      query,
      {
        onToken: (tok) => streamedTokens.push(tok),
        onSentence: (sen) => streamedSentences.push(sen),
        voiceId,
      }
    );

    res.json({
      success: true,
      query,
      fullText: streamResult.fullText,
      sentences: streamResult.sentences,
      audioBuffersCount: streamResult.audioBuffers.length,
      timeToFirstTokenMs: streamResult.timeToFirstTokenMs,
      timeToFirstAudioMs: streamResult.timeToFirstAudioMs,
      targetTtfpAchieved: streamResult.timeToFirstAudioMs < 400,
      guardrailRedacted: streamResult.guardrailRedacted,
      guardrailBlocked: streamResult.guardrailBlocked,
      firstAudioBase64: streamResult.audioBuffers[0]?.toString('base64') || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});
