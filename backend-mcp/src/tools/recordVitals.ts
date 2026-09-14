import { VitalsRepo } from '../database/vitalsRepo.js';

export const recordVitalsTool = {
  definition: {
    name: 'recordVitals',
    description: 'Ghi nhận nhanh các chỉ số sinh tồn của người cao tuổi: huyết áp tâm thu, tâm trương, đường huyết, nhịp tim.',
    inputSchema: {
      type: 'object',
      properties: {
        systolic: { type: 'number', description: 'Huyết áp tâm thu (e.g. 120, 130)' },
        diastolic: { type: 'number', description: 'Huyết áp tâm trương (e.g. 80, 85)' },
        bloodSugar: { type: 'number', description: 'Chỉ số đường huyết mg/dL (e.g. 105)' },
        heartRate: { type: 'number', description: 'Nhịp tim bpm (e.g. 72)' },
        date: { type: 'string', description: 'Ngày đo YYYY-MM-DD. Mặc định là hôm nay.' },
      },
    },
  },

  async handler(args: {
    systolic?: number;
    diastolic?: number;
    bloodSugar?: number;
    heartRate?: number;
    date?: string;
  }) {
    const targetDate = args.date || new Date().toISOString().split('T')[0];

    // Lấy dữ liệu cũ trong ngày để merge (tránh bị mất các chỉ số đo trước đó)
    const existing = await VitalsRepo.getVitalsByDate(targetDate);

    const mergedRecord = {
      date: targetDate,
      systolic: args.systolic !== undefined ? args.systolic : existing?.systolic,
      diastolic: args.diastolic !== undefined ? args.diastolic : existing?.diastolic,
      bloodSugar: args.bloodSugar !== undefined ? args.bloodSugar : existing?.bloodSugar,
      heartRate: args.heartRate !== undefined ? args.heartRate : existing?.heartRate,
      updatedAt: new Date().toISOString(),
    };

    await VitalsRepo.saveVitals(mergedRecord);

    // Đánh giá trạng thái lâm sàng theo tiêu chuẩn AHA (American Heart Association)
    let statusAssessment = 'Normal';
    if (mergedRecord.systolic && mergedRecord.systolic >= 140) {
      statusAssessment = 'Stage 2 Hypertension - Elevated';
    } else if (mergedRecord.systolic && mergedRecord.systolic >= 130) {
      statusAssessment = 'Stage 1 Hypertension - Mildly Elevated';
    }

    // Câu phản hồi ấm áp cho người cao tuổi
    let speechText = 'I have recorded your vitals. ';
    if (args.systolic && args.diastolic) {
      speechText += `Blood pressure is ${args.systolic} over ${args.diastolic}. It looks stable. `;
    }
    if (args.bloodSugar) {
      speechText += `Blood sugar is ${args.bloodSugar} milligrams per deciliter. `;
    }
    if (args.heartRate) {
      speechText += `Heart rate is ${args.heartRate} beats per minute. `;
    }

    return {
      success: true,
      data: mergedRecord,
      assessment: statusAssessment,
      speechText: speechText.trim(),
    };
  },
};