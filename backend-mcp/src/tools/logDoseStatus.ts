import { LogRepo } from '../database/logRepo.js';
import { MedicineRepo } from '../database/medicineRepo.js';
import { getDatabase } from '../database/db.js';

export const logDoseStatusTool = {
  definition: {
    name: 'logDoseStatus',
    description: "Đánh dấu trạng thái một cữ thuốc là 'taken' hoặc 'skipped', kèm ghi chú lâm sàng của người bệnh.",
    inputSchema: {
      type: 'object',
      properties: {
        logId: {
          type: 'string',
          description: 'Mã định danh của bản ghi intake log (nếu có).',
        },
        medicineName: {
          type: 'string',
          description: 'Tên thuốc người bệnh nói (ví dụ: Amlodipine, Metformin).',
        },
        status: {
          type: 'string',
          enum: ['taken', 'skipped', 'pending'],
          description: "Trạng thái mới của cữ thuốc. Mặc định là 'taken'.",
        },
        notes: {
          type: 'string',
          description: 'Ghi chú lâm sàng hoặc cảm giác khi uống (ví dụ: "Taken with oatmeal, slight dizziness").',
        },
      },
      required: [],
    },
  },

  async handler(args: { logId?: string; medicineName?: string; status?: 'taken' | 'skipped' | 'pending'; notes?: string }) {
    const todayStr = new Date().toISOString().split('T')[0];
    const status = args.status || 'taken';
    let targetLogId = args.logId;
    let matchedMedName = args.medicineName || 'Medication';

    // Nếu không truyền trực tiếp logId, tự tìm cữ pending phù hợp nhất hôm nay
    if (!targetLogId) {
      const todayLogs = await LogRepo.getLogsByDate(todayStr);

      if (args.medicineName) {
        const found = todayLogs.find(
          (l) => l.name.toLowerCase().includes(args.medicineName!.toLowerCase()) && l.status === 'pending'
        ) || todayLogs.find((l) => l.name.toLowerCase().includes(args.medicineName!.toLowerCase()));

        if (found) {
          targetLogId = found.logId;
          matchedMedName = found.name;
        }
      } else {
        // Lấy cữ pending gần nhất
        const pendingDose = todayLogs.find((l) => l.status === 'pending');
        if (pendingDose) {
          targetLogId = pendingDose.logId;
          matchedMedName = pendingDose.name;
        }
      }
    }

    if (!targetLogId) {
      return {
        success: false,
        message: "No pending medication schedule was found to update for today.",
        speechText: "I couldn't find a pending dose scheduled for that medication right now.",
      };
    }

    await LogRepo.updateStatusDirect(targetLogId, status, args.notes);

    // Kiểm tra tồn kho sau khi đã trừ liều vừa uống
    let remainingStock: number | null = null;
    let lowStockWarning = false;
    const priceStr = '$12.50';

    if (status === 'taken') {
      try {
        const db = getDatabase();
        const logRow = db.prepare('SELECT medicine_id FROM intake_logs WHERE id = ?').get(targetLogId) as any;
        if (logRow) {
          const med = await MedicineRepo.getMedicineById(logRow.medicine_id);
          if (med) {
            remainingStock = med.stockCount;
            if (remainingStock <= 5) {
              lowStockWarning = true;
            }
          }
        }
      } catch (e) {
        console.warn('[logDoseStatus] Could not check updated stock:', e);
      }
    }

    let speechText = '';
    if (status === 'taken') {
      if (lowStockWarning && remainingStock !== null) {
        speechText = `Logged as taken. Heads up: you only have ${remainingStock} pills left of ${matchedMedName}. Would you like me to order a 30-day refill via Amazon Pharmacy for ${priceStr}?`;
      } else {
        speechText = `Wonderful! I have recorded your ${matchedMedName} as taken.${args.notes ? ' I also saved your note.' : ''}`;
      }
    } else {
      speechText = `I have marked your ${matchedMedName} as skipped.`;
    }

    return {
      success: true,
      logId: targetLogId,
      medicineName: matchedMedName,
      newStatus: status,
      notes: args.notes || null,
      remainingStock,
      lowStockAlert: lowStockWarning
        ? {
            medicineName: matchedMedName,
            remainingStock,
            price: priceStr,
            refillSuggested: true,
            suggestedAction: 'orderRefill',
          }
        : null,
      speechText,
    };
  },
};