import {
  TodayDataResponse,
  HistoryDataResponse,
  MedicinesResponse,
  DoseActionResponse,
  ClinicalAdviceResponse,
  AmazonRefillOrder,
  VitalsRecord,
  LogStatus,
  AgentTurnResponse,
  RingDeviceHubResult,
  DrugInteractionCheckResult,
  GuardianNegotiationResult,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_MCP_URL ||
  'http://localhost:3001';

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const mcpClient = {
  /**
   * POST /api/agent/turn
   * Bedrock Claude Native Tool-Use & Agentic Loop Orchestrator
   */
  async executeAgentTurn(query: string): Promise<AgentTurnResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/agent/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      throw new Error(`Failed to execute agent turn: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/ring
   * Ring Smart Doorbell & Access Hub Controller
   */
  async triggerRingAction(
    action: 'checkFrontPorch' | 'triggerEmergencyDoorUnlock' | 'getDeviceStatus' = 'checkFrontPorch',
    reason?: string
  ): Promise<RingDeviceHubResult> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/ring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) {
      throw new Error(`Failed to trigger Ring action: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * GET /api/today
   * Fetch today's medication schedule, vitals, and caregiver profile
   */
  async getTodayData(): Promise<TodayDataResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/today`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch today data: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/toggle
   * Toggle dose status (pending <-> taken) and update SQLite inventory
   */
  async toggleDose(
    logId: string,
    currentStatus: string
  ): Promise<{ success: boolean; message?: string }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, currentStatus }),
    });
    if (!res.ok) {
      throw new Error(`Failed to toggle dose: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/vitals
   * Record vital signs (blood pressure, blood sugar, heart rate)
   */
  async recordVitals(vitals: Partial<VitalsRecord>): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vitals),
    });
    if (!res.ok) {
      throw new Error(`Failed to record vitals: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * GET /api/history
   * Fetch full 30-day medication and vitals history
   */
  async getHistory(): Promise<HistoryDataResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/history`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch history: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * GET /api/medicines
   * Fetch prescription medication catalog
   */
  async getMedicines(): Promise<MedicinesResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/medicines`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch medicines: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/advisor
   * Send clinical symptom query to AI advisor (AWS Bedrock Claude)
   */
  async askClinicalAdvisor(query: string): Promise<ClinicalAdviceResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/advisor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      throw new Error(`Failed to ask clinical advisor: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/seed
   * Trigger 30-day clinical demo data reset and seed
   */
  async triggerDataSeed(): Promise<{ success: boolean; message?: string }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/seed`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to trigger data seed: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/dose
   * Log dose status via Alexa voice command or direct UI selection
   */
  async logDoseStatus(args: {
    logId?: string;
    medicineName?: string;
    status?: LogStatus | string;
    notes?: string;
  }): Promise<DoseActionResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/dose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      throw new Error(`Failed to log dose status: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/note
   * Save clinical note for a medication dose
   */
  async saveDoseNote(
    logId: string,
    notes: string
  ): Promise<{ success: boolean; message?: string }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, notes }),
    });
    if (!res.ok) {
      throw new Error(`Failed to save dose note: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/medicines
   */
  async addMedicine(medicine: {
    name: string;
    dosage: string;
    reminderTimes?: string[];
    daysOfWeek?: string[];
    stockCount?: number;
    type?: 'medication' | 'routine';
  }): Promise<{ success: boolean; id?: string; message?: string }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/medicines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medicine),
    });
    if (!res.ok) {
      throw new Error(`Failed to add medicine: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * DELETE /api/medicines/:id
   */
  async deleteMedicine(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/medicines/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to delete medicine: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/medicines/check-interaction
   * Automated Drug-Drug Safety & Beers Criteria interaction checker
   */
  async checkDrugInteraction(
    newMedicineName: string,
    currentMedicines?: string[]
  ): Promise<DrugInteractionCheckResult> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/medicines/check-interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newMedicineName, currentMedicines }),
    });
    if (!res.ok) {
      throw new Error(`Failed to check drug interactions: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/refill (Amazon Pharmacy 1-Click Refill MCP Tool)
   */
  async orderRefill(params: {
    medicineName: string;
    quantity?: number;
  }): Promise<AmazonRefillOrder> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/refill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error(`Failed to place Amazon Pharmacy refill: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST /api/guardian/negotiate
   * Health Guardian persona persuasion & Sarah Circuit-Breaker
   */
  async negotiateAdherence(params: {
    medicineName: string;
    refusalReason?: string;
    personaId?: string;
    turnCount?: number;
  }): Promise<GuardianNegotiationResult> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/guardian/negotiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error(`Failed to negotiate adherence: ${res.statusText}`);
    }
    return res.json();
  },

  // Backward-compatible alias helpers
  fetchTodayData() {
    return this.getTodayData();
  },
  fetchHistory() {
    return this.getHistory();
  },
  fetchMedicines() {
    return this.getMedicines();
  },
  seedDemoData() {
    return this.triggerDataSeed();
  },
};
