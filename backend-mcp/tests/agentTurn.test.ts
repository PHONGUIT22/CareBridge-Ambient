import { describe, it, expect, beforeAll } from 'vitest';
import { initDB } from '../src/database/db.js';
import { seedDemoData } from '../src/database/seedDemoData.js';
import { handleAgentTurn } from '../src/tools/agentTurnHandler.js';

describe('CareBridge Ambient Agentic Loop & Voice Turn Orchestrator', () => {
  beforeAll(async () => {
    initDB();
    await seedDemoData(false);
  });

  // TEST 1: Phân tích ý định hỏi lịch thuốc hôm nay -> getTodaySchedule
  it('dispatches getTodaySchedule tool when patient asks about daily medication calendar', async () => {
    const response = await handleAgentTurn({
      query: 'Alexa, what pills do I have scheduled for today?',
    });

    expect(response.success).toBe(true);
    expect(response.toolName).toBe('getTodaySchedule');
    expect(response.toolResult).toBeDefined();
    expect(typeof response.toolResult.adherenceRate).toBe('number');
    expect(response.speechResponse.length).toBeGreaterThan(0);
  });

  // TEST 2: Phân tích ý định ghi nhận đã uống thuốc -> logDoseStatus
  it('dispatches logDoseStatus tool when patient confirms taking morning pills', async () => {
    const response = await handleAgentTurn({
      query: 'I just took my morning Amlodipine pills with breakfast',
    });

    expect(response.success).toBe(true);
    expect(response.toolName).toBe('logDoseStatus');
    expect(response.toolResult).toBeDefined();
    expect(response.toolResult.newStatus).toBe('taken');
    expect(response.speechResponse).toBeDefined();
  });

  // TEST 3: Phân tích ý định đặt thuốc bổ sung qua Amazon Pharmacy -> orderRefill
  it('dispatches orderRefill tool when patient requests a prescription refill', async () => {
    const response = await handleAgentTurn({
      query: 'I am running out of Lipitor, please order a refill for me',
    });

    expect(response.success).toBe(true);
    expect(response.toolName).toBe('orderRefill');
    expect(response.toolResult).toBeDefined();
    expect(response.toolResult.orderId).toMatch(/^114-\d{7}-\d{7}$/);
    expect(response.toolResult.quantityAdded).toBe(30);
  });

  // TEST 4: Phân tích ý định kiểm tra chuông cửa Ring -> ringDeviceHub (checkFrontPorch)
  it('dispatches ringDeviceHub tool when patient asks about deliveries at the front porch', async () => {
    const response = await handleAgentTurn({
      query: 'Alexa, check if my medicine parcel arrived at the front door porch',
    });

    expect(response.success).toBe(true);
    expect(response.toolName).toBe('ringDeviceHub');
    expect(response.toolArgs?.action).toBe('checkFrontPorch');
    expect(response.toolResult?.packageDetected).toBe(true);
    expect(response.toolResult?.doorLockStatus).toBe('LOCKED');
  });

  // TEST 5: Phân tích ý định mở cửa khẩn cấp cho nhân viên y tế -> ringDeviceHub (triggerEmergencyDoorUnlock)
  it('dispatches emergency smart lock unlock when emergency or paramedics are mentioned', async () => {
    const response = await handleAgentTurn({
      query: 'Emergency medical alert! Please unlock the front door for incoming paramedics',
    });

    expect(response.success).toBe(true);
    expect(response.toolName).toBe('ringDeviceHub');
    expect(response.toolArgs?.action).toBe('triggerEmergencyDoorUnlock');
    expect(response.toolResult?.doorLockStatus).toBe('UNLOCKED FOR PARAMEDICS');
    expect(response.speechResponse).toContain('unlocked the front door for incoming paramedics');
  });

  // TEST 6: Phản hồi giao tiếp đàm thoại thông thường khi không yêu cầu tool
  it('gracefully provides supportive voice response for conversational queries', async () => {
    const response = await handleAgentTurn({
      query: 'Hello Alexa, how is the weather today?',
    });

    expect(response.success).toBe(true);
    expect(typeof response.speechResponse).toBe('string');
    expect(response.speechResponse.length).toBeGreaterThan(0);
  });
});
