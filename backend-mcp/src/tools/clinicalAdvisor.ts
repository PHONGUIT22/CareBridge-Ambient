import { analyzeClinicalQuery, ClinicalAnalysisResult } from '../aws/bedrockClient.js';
import { MedicineRepo } from '../database/medicineRepo.js';
import { VitalsRepo } from '../database/vitalsRepo.js';
import { CaregiverRepo } from '../database/caregiverRepo.js';
import { sendEmergencySMS, SendSMSResult } from '../aws/snsClient.js';

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

    // Nếu urgencyLevel là HIGH hoặc EMERGENCY, tự động kích hoạt AWS SNS Dispatch SMS khẩn cấp
    let smsDispatchResult: SendSMSResult | null = null;
    const isEmergencyRisk = analysis.urgencyLevel === 'EMERGENCY' || analysis.urgencyLevel === 'HIGH';

    if (isEmergencyRisk) {
      try {
        const caregiver = await CaregiverRepo.getCaregiver();
        const caregiverName = caregiver?.name || 'Sarah Connor';
        const caregiverPhone = caregiver?.phone || '+1 (555) 0199';

        const alertBody = `[CareBridge EMERGENCY ALERT] Eleanor reported severe symptoms: "${args.query}". Risk Level: ${analysis.urgencyLevel}. Current Vitals: ${recentVitals}. Immediate family assistance requested. Ambient station active.`;
        smsDispatchResult = await sendEmergencySMS(caregiverPhone, alertBody, caregiverName);

        // Đảm bảo lời thoại phản hồi thông báo ngắn gọn dưới 20 từ cho AWS Polly render tức thì
        if (analysis.urgencyLevel === 'EMERGENCY') {
          analysis.speechResponse =
            `Emergency flagged. Sit down immediately. An urgent SMS alert with your vitals has been sent to your daughter Sarah.`;
        } else if (!analysis.speechResponse.toLowerCase().includes('sarah')) {
          analysis.speechResponse += ` An alert was sent to ${caregiverName.split(' ')[0]}.`;
        }
      } catch (err) {
        console.warn('[clinicalAdvisor] Failed to dispatch emergency SMS via AWS SNS:', err);
      }
    }

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
      smsDispatch: smsDispatchResult
        ? {
            delivered: true,
            recipient: smsDispatchResult.recipient,
            phone: smsDispatchResult.phone,
            timestamp: smsDispatchResult.timestamp,
            messageId: smsDispatchResult.messageId,
            simulated: smsDispatchResult.simulated,
          }
        : null,
      richCard: {
        type: 'clinical_triage',
        title: analysis.displayCardTitle,
        actionAdvice: analysis.actionAdvice,
        advice: analysis.actionAdvice, // Alias for backward compatibility
        clinicalExplanation: analysis.clinicalExplanation,
        urgencyLevel: analysis.urgencyLevel,
        recommendedAction: analysis.recommendedAction,
        smsDispatch: smsDispatchResult
          ? {
              delivered: true,
              recipient: smsDispatchResult.recipient,
              phone: smsDispatchResult.phone,
              timestamp: smsDispatchResult.timestamp,
              messageId: smsDispatchResult.messageId,
              simulated: smsDispatchResult.simulated,
            }
          : undefined,
      },
      bedrockModelUsed:
        process.env.BEDROCK_MODEL_ID || 'au.anthropic.claude-haiku-4-5-20251001-v1:0',
    };
  },
};