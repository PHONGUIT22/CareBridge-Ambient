import { LogRepo, DailyLogItem } from '../database/logRepo.js';

export const getTodayScheduleTool = {
  definition: {
    name: 'getTodaySchedule',
    description: "Lấy toàn bộ lịch uống thuốc trong ngày, tỉ lệ tuân thủ phần trăm và liều thuốc sắp tới cần uống.",
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Ngày cần lấy dạng YYYY-MM-DD. Mặc định là ngày hôm nay.',
        },
      },
      required: [],
    },
  },

  async handler(args: { date?: string }) {
    const targetDate = args.date || new Date().toISOString().split('T')[0];
    const logs: DailyLogItem[] = await LogRepo.getLogsByDate(targetDate);

    const total = logs.length;
    const taken = logs.filter((l) => l.status === 'taken').length;
    const pending = logs.filter((l) => l.status === 'pending').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    // Tìm cữ thuốc kế tiếp cần uống
    const nowTime = new Date().toTimeString().slice(0, 5); // "HH:MM"
    const nextPendingDose = logs.find((l) => l.status === 'pending' && l.scheduledTime >= nowTime) 
      || logs.find((l) => l.status === 'pending') 
      || null;

    // Câu tóm tắt giọng nói cho Alexa đọc
    let speechSummary = '';
    if (total === 0) {
      speechSummary = "You have no scheduled medications for today.";
    } else if (pending === 0) {
      speechSummary = `Great job! You have taken all ${total} medications scheduled for today. Your adherence is 100%.`;
    } else if (nextPendingDose) {
      speechSummary = `You have taken ${taken} of ${total} doses today. Your next dose is ${nextPendingDose.name} at ${nextPendingDose.scheduledTime}.`;
    } else {
      speechSummary = `You have ${pending} pending dose remaining today.`;
    }

    return {
      date: targetDate,
      adherenceRate,
      totalDoses: total,
      takenCount: taken,
      pendingCount: pending,
      nextDose: nextPendingDose ? {
        medicineId: nextPendingDose.medicineId,
        name: nextPendingDose.name,
        dosage: nextPendingDose.dosage,
        time: nextPendingDose.scheduledTime,
      } : null,
      schedule: logs,
      speechSummary,
    };
  },
};