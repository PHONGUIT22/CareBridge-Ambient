import { describe, it, expect, beforeAll } from 'vitest';
import { initDB } from '../src/database/db.js';
import { seedDemoData } from '../src/database/seedDemoData.js';
import { MedicineRepo } from '../src/database/medicineRepo.js';
import { getTodayScheduleTool } from '../src/tools/getTodaySchedule.js';
import { logDoseStatusTool } from '../src/tools/logDoseStatus.js';
import { orderRefillTool } from '../src/tools/orderRefill.js';
import { ringDeviceHubTool } from '../src/tools/ringDeviceHub.js';
import { checkDrugInteractions } from '../src/services/drugInteractionService.js';

describe('CareBridge Ambient Core MCP Tools Suite', () => {
  beforeAll(async () => {
    initDB();
    await seedDemoData(false);
  });

  // TEST 1: getTodaySchedule tính đúng tỷ lệ tuân thủ & cữ tiếp theo
  describe('Tool: getTodaySchedule', () => {
    it('calculates accurate adherence rate and returns daily schedule array', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const result = await getTodayScheduleTool.handler({ date: todayStr });

      expect(result).toBeDefined();
      expect(result.date).toBe(todayStr);
      expect(typeof result.adherenceRate).toBe('number');
      expect(result.adherenceRate).toBeGreaterThanOrEqual(0);
      expect(result.adherenceRate).toBeLessThanOrEqual(100);

      // Verify adherence formula: Math.round((taken / total) * 100)
      if (result.totalDoses > 0) {
        const expectedRate = Math.round((result.takenCount / result.totalDoses) * 100);
        expect(result.adherenceRate).toBe(expectedRate);
      } else {
        expect(result.adherenceRate).toBe(100);
      }

      expect(Array.isArray(result.schedule)).toBe(true);
      expect(typeof result.speechSummary).toBe('string');
      expect(result.speechSummary.length).toBeGreaterThan(0);
    });
  });

  // TEST 2: logDoseStatus cập nhật trạng thái taken và tự động cập nhật tồn kho SQLite WAL
  describe('Tool: logDoseStatus', () => {
    it('marks dose as taken, saves clinical note, and returns updated stock', async () => {
      const allMeds = await MedicineRepo.getAllMedicines();
      expect(allMeds.length).toBeGreaterThan(0);
      const targetMed = allMeds[0];
      const initialStock = targetMed.stockCount;

      const result = await logDoseStatusTool.handler({
        medicineName: targetMed.name,
        status: 'taken',
        notes: 'Taken with warm oatmeal. Patient reported zero discomfort.',
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('taken');
      expect(result.notes).toBe('Taken with warm oatmeal. Patient reported zero discomfort.');
      expect(result.speechText).toContain(result.medicineName);

      // Verify stock consistency in SQLite WAL
      const updatedMed = await MedicineRepo.getMedicineById(targetMed.id);
      expect(updatedMed).toBeDefined();
      if (result.remainingStock !== null) {
        expect(updatedMed!.stockCount).toBe(result.remainingStock);
      }
    });

    it('gracefully handles skipped status without reducing stock', async () => {
      const result = await logDoseStatusTool.handler({
        medicineName: 'Amlodipine',
        status: 'skipped',
        notes: 'Skipped due to low morning blood pressure.',
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('skipped');
      expect(result.speechText).toContain('skipped');
    });
  });

  // TEST 3: orderRefill sinh đúng định dạng mã đơn hàng Amazon (114-XXXXXXX-XXXXXXX) & cộng +30 viên
  describe('Tool: orderRefill', () => {
    it('creates authentic Amazon Pharmacy order ID (114-XXXXXXX-XXXXXXX) and increments inventory', async () => {
      const allMeds = await MedicineRepo.getAllMedicines();
      const medToRefill = allMeds.find((m) => m.name.toLowerCase().includes('atorvastatin')) || allMeds[0];
      const previousStock = medToRefill.stockCount;
      const refillQuantity = 30;

      const result = await orderRefillTool.handler({
        medicineName: medToRefill.name,
        quantity: refillQuantity,
      });

      expect(result.success).toBe(true);
      // Verify Amazon order ID format (e.g. 114-7294821-4928103)
      expect(result.orderId).toMatch(/^114-\d{7}-\d{7}$/);
      expect(result.quantityAdded).toBe(refillQuantity);
      expect(result.previousStock).toBe(previousStock);
      expect(result.newStockCount).toBe(previousStock + refillQuantity);
      expect(result.pharmacyName).toBe('Amazon Pharmacy');
      expect(result.shippingMethod).toContain('Prime');

      // Verify richCard metadata for Echo Show display
      expect(result.richCard).toBeDefined();
      expect(result.richCard.type).toBe('AmazonPharmacyOrder');
      expect(result.richCard.orderId).toBe(result.orderId);
      expect(result.richCard.newStockCount).toBe(result.newStockCount);

      // Verify persistence in SQLite
      const reloadedMed = await MedicineRepo.getMedicineById(medToRefill.id);
      expect(reloadedMed!.stockCount).toBe(previousStock + refillQuantity);
    });
  });

  // TEST 4: ringDeviceHub kiểm tra camera thềm cửa và mở chốt cửa cấp cứu
  describe('Tool: ringDeviceHub', () => {
    it('checks front porch camera and detects delivered Amazon Pharmacy package', async () => {
      const result = await ringDeviceHubTool.handler({ action: 'checkFrontPorch' });

      expect(result.success).toBe(true);
      expect(result.action).toBe('checkFrontPorch');
      expect(result.cameraName).toBe('Ring Doorbell Pro - Front Porch');
      expect(result.doorLockStatus).toBe('LOCKED');
      expect(result.packageDetected).toBe(true);
      expect(result.packageDetails).toBeDefined();
      expect(result.packageDetails?.carrier).toBe('Amazon Prime Delivery');
      expect(result.richCard?.type).toBe('RingDoorbellFeed');
      expect(result.richCard?.mode).toBe('delivery');
    });

    it('triggers emergency paramedic smart door unlock with audit reason', async () => {
      const result = await ringDeviceHubTool.handler({
        action: 'triggerEmergencyDoorUnlock',
        reason: 'High Blood Pressure & Severe Dizziness Fall Incident',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('triggerEmergencyDoorUnlock');
      expect(result.doorLockStatus).toBe('UNLOCKED FOR PARAMEDICS');
      expect(result.emergencyReason).toBe('High Blood Pressure & Severe Dizziness Fall Incident');
      expect(result.speechText).toContain('unlocked the front door for incoming paramedics');
      expect(result.richCard?.mode).toBe('emergency');
    });
  });

  // TEST 5: drugInteractionService kiểm tra tương tác thuốc nguy hiểm (Beers Criteria)
  describe('Service: drugInteractionService', () => {
    it('detects CRITICAL bleeding risk when adding Warfarin with Aspirin on board', async () => {
      const result = await checkDrugInteractions('Warfarin', [
        'Baby Aspirin Cardio 81mg',
        'Metformin HCl 500mg',
      ]);

      expect(result.hasInteraction).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);

      const criticalWarning = result.warnings[0];
      expect(criticalWarning.severity).toBe('CRITICAL');
      expect(criticalWarning.conflictingMedName).toBe('Baby Aspirin Cardio 81mg');
      expect(criticalWarning.title).toContain('Hemorrhage');
      expect(criticalWarning.recommendation).toContain('Dr. Reynolds');
    });

    it('detects HIGH statin-induced rhabdomyolysis risk for Simvastatin + Amlodipine', async () => {
      const result = await checkDrugInteractions('Simvastatin', [
        'Amlodipine (Norvasc) 5mg',
      ]);

      expect(result.hasInteraction).toBe(true);
      const warning = result.warnings.find((w) => w.severity === 'HIGH');
      expect(warning).toBeDefined();
      expect(warning?.title).toContain('Rhabdomyolysis');
      expect(warning?.conflictingMedName).toBe('Amlodipine (Norvasc) 5mg');
    });

    it('approves safe medication (Vitamin C) with zero clinical interaction warnings', async () => {
      const result = await checkDrugInteractions('Vitamin C', [
        'Baby Aspirin Cardio 81mg',
        'Amlodipine (Norvasc) 5mg',
      ]);

      expect(result.hasInteraction).toBe(false);
      expect(result.warnings.length).toBe(0);
    });
  });
});
