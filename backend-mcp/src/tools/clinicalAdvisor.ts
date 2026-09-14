import { analyzeClinicalQuery, ClinicalAnalysisResult } from '../aws/bedrockClient.js';
import { MedicineRepo } from '../database/medicineRepo.js';
import { VitalsRepo } from '../database/vitalsRepo.js';

export const clinicalAdvisorTool = {
  definition: {
    name: 'clinicalAdvisor',
    description: "Nhận triệu chứng hoặc thắc mắc của người cao tuổi, đẩy vào AWS Bedrock (Claude 3.5 Sonnet) để phân tích lâm sàng và đưa ra lời khuyên an toàn.",
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Câu nói hoặc mô tả triệu chứng của người bệnh (ví dụ: "I feel dizzy after taking my pill").',
        },
      },
      required: ['query'],
    },
  },

  async handler(args: { query: string }) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Thu thập ngữ cảnh lâm sàng thực tế của người bệnh từ Database
    const [medicines, vitals] = await Promise.all([
      MedicineRepo.getAllMedicines(),
      VitalsRepo.getVitalsByDate(todayStr),
    ]);

    const currentMeds = medicines.map((m) => `${m.name} (${m.dosage})`);
    const recentVitals = vitals
      ? `BP: ${vitals.systolic || '--'}/${vitals.diastolic || '--'} mmHg, Sugar: ${vitals.bloodSugar || '--'} mg/dL, HR: ${vitals.heartRate || '--'} bpm`
      : 'No vitals recorded today yet.';

    // Phân tích thông qua AWS Bedrock
    const analysis: ClinicalAnalysisResult = await analyzeClinicalQuery(args.query, {
      currentMeds,
      recentVitals,
    });

    return {
      success: true,
      query: args.query,
      assessment: analysis.displayCardTitle,
      speechResponse: analysis.speechResponse,
      actionAdvice: analysis.actionAdvice,
      clinicalExplanation: analysis.clinicalExplanation,
      displayCardTitle: analysis.displayCardTitle,
      urgencyLevel: analysis.urgencyLevel,
      recommendedAction: analysis.recommendedAction,
      richCard: {
        type: 'clinical_triage',
        title: analysis.displayCardTitle,
        actionAdvice: analysis.actionAdvice,
        advice: analysis.actionAdvice, // Alias for backward compatibility
        clinicalExplanation: analysis.clinicalExplanation,
        urgencyLevel: analysis.urgencyLevel,
        recommendedAction: analysis.recommendedAction,
      },
      bedrockModelUsed:
        process.env.BEDROCK_MODEL_ID || 'au.anthropic.claude-haiku-4-5-20251001-v1:0',
    };
  },
};