import { analyzeClinicalQuery, ClinicalAnalysisResult } from '../aws/bedrockClient.js';
import { MedicineRepo } from '../database/medicineRepo.js';
import { VitalsRepo } from '../database/vitalsRepo.js';
import { CaregiverRepo } from '../database/caregiverRepo.js';
import { sendEmergencySMS, SendSMSResult } from '../aws/snsClient.js';
import { getLocalDateString } from '../utils/dateUtils.js';

export const clinicalAdvisorTool = {
  definition: {
    name: 'clinicalAdvisor',
    description: "Evaluate senior symptoms or health queries through AWS Bedrock (Claude 3.5 Sonnet / Haiku 4.5) for clinical triage and safety guidance.",
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Patient verbal statement or symptom description (e.g., "I feel dizzy after taking my pill").',
        },
      },
      required: ['query'],
    },
  },

  async handler(args: { query: string }) {
    const todayStr = getLocalDateString();

    // Collect patient's real clinical context from database
    const [medicines, vitals] = await Promise.all([
      MedicineRepo.getAllMedicines(),
      VitalsRepo.getVitalsByDate(todayStr),
    ]);

    const currentMeds = medicines.map((m) => `${m.name} (${m.dosage})`);
    const recentVitals = vitals
      ? `BP: ${vitals.systolic || '--'}/${vitals.diastolic || '--'} mmHg, Sugar: ${vitals.bloodSugar || '--'} mg/dL, HR: ${vitals.heartRate || '--'} bpm`
      : 'No vitals recorded today yet.';

    // Clinical analysis via AWS Bedrock
    const analysis: ClinicalAnalysisResult = await analyzeClinicalQuery(args.query, {
      currentMeds,
      recentVitals,
    });

    // If urgencyLevel is HIGH or EMERGENCY, automatically dispatch emergency SMS via AWS SNS
    let smsDispatchResult: SendSMSResult | null = null;
    const isEmergencyRisk = analysis.urgencyLevel === 'EMERGENCY' || analysis.urgencyLevel === 'HIGH';

    if (isEmergencyRisk) {
      try {
        const caregiver = await CaregiverRepo.getCaregiver();
        const caregiverName = caregiver?.name || 'Sarah Connor';
        const caregiverPhone = caregiver?.phone || '+1 (555) 0199';

        const alertBody = `[CareBridge EMERGENCY ALERT] Eleanor reported severe symptoms: "${args.query}". Risk Level: ${analysis.urgencyLevel}. Current Vitals: ${recentVitals}. Immediate family assistance requested. Ambient station active.`;
        smsDispatchResult = await sendEmergencySMS(caregiverPhone, alertBody, caregiverName);

        // Ensure voice response is concise under 20 words for fast AWS Polly rendering
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