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
   * Lấy lịch uống thuốc, chỉ số sinh tồn và người chăm sóc hôm nay
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
   * Đổi trạng thái cữ thuốc (pending <-> taken) và tự động bù trừ tồn kho SQLite
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
   * Ghi nhận chỉ số sinh tồn (huyết áp, đường huyết, nhịp tim)
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
   * Lấy toàn bộ lịch sử uống thuốc và chỉ số sinh tồn 30 ngày
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
   * Lấy danh mục thuốc trong phác đồ điều trị
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
   * Gửi câu hỏi lâm sàng/triệu chứng tới cố vấn y tế AI (Bedrock Claude 3.5 Sonnet)
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
   * Kích hoạt reset & nạp lại 30 ngày dữ liệu sóng sin mẫu
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
   * Ghi nhận trạng thái thuốc theo lệnh thoại Alexa hoặc chọn trực tiếp
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
   * Cập nhật ghi chú lâm sàng cho cữ thuốc
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
