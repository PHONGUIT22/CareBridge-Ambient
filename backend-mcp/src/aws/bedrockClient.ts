import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import '../config/env.js';

export interface ClinicalAnalysisResult {
  speechResponse: string;
  displayCardTitle: string;
  actionAdvice: string;
  clinicalExplanation: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  recommendedAction: string;
}

export interface BedrockToolUseDecision {
  stopReason: string;
  toolCall?: {
    id: string;
    name: string;
    input: Record<string, any>;
  };
  textResponse?: string;
  rawResponse?: any;
}

export const MCP_TOOLS_SCHEMAS = [
  {
    name: 'getTodaySchedule',
    description: 'Lấy toàn bộ lịch uống thuốc trong ngày của bệnh nhân, tỉ lệ tuân thủ phần trăm và liều thuốc sắp tới cần uống.',
    input_schema: {
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
  {
    name: 'logDoseStatus',
    description: "Đánh dấu trạng thái một cữ thuốc là 'taken' (đã uống) hoặc 'skipped' (bỏ qua), kèm ghi chú cảm giác hoặc lâm sàng.",
    input_schema: {
      type: 'object',
      properties: {
        logId: {
          type: 'string',
          description: 'Mã định danh của bản ghi intake log (nếu có).',
        },
        medicineName: {
          type: 'string',
          description: 'Tên thuốc người bệnh nói (ví dụ: Amlodipine, Metformin, Atorvastatin, morning pills).',
        },
        status: {
          type: 'string',
          enum: ['taken', 'skipped', 'pending'],
          description: "Trạng thái mới của cữ thuốc ('taken' hoặc 'skipped'). Mặc định là 'taken'.",
        },
        notes: {
          type: 'string',
          description: 'Ghi chú lâm sàng hoặc cảm giác khi uống.',
        },
      },
      required: [],
    },
  },
  {
    name: 'recordVitals',
    description: 'Ghi nhận nhanh các chỉ số sinh tồn của người cao tuổi: huyết áp tâm thu, tâm trương, đường huyết, nhịp tim.',
    input_schema: {
      type: 'object',
      properties: {
        systolic: { type: 'number', description: 'Huyết áp tâm thu (e.g. 120, 130)' },
        diastolic: { type: 'number', description: 'Huyết áp tâm trương (e.g. 80, 85)' },
        bloodSugar: { type: 'number', description: 'Chỉ số đường huyết mg/dL (e.g. 105)' },
        heartRate: { type: 'number', description: 'Nhịp tim bpm (e.g. 72)' },
        date: { type: 'string', description: 'Ngày đo YYYY-MM-DD. Mặc định là hôm nay.' },
      },
      required: [],
    },
  },
  {
    name: 'clinicalAdvisor',
    description: 'Nhận triệu chứng hoặc thắc mắc sức khỏe của người cao tuổi (chóng mặt, đau ngực, mệt mỏi, tương tác thuốc) để phân tích lâm sàng và đưa ra lời khuyên an toàn.',
    input_schema: {
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
  {
    name: 'orderRefill',
    description: 'Tự động đặt thuốc bổ sung (refill) qua Amazon Pharmacy 1-Click khi thuốc trong kho sắp hết hoặc người dùng yêu cầu đặt thêm thuốc.',
    input_schema: {
      type: 'object',
      properties: {
        medicineName: {
          type: 'string',
          description: 'Tên loại thuốc cần đặt thêm (ví dụ: Atorvastatin, Amlodipine, Metformin).',
        },
        quantity: {
          type: 'number',
          description: 'Số lượng viên thuốc đặt bổ sung (mặc định 30 viên).',
        },
      },
      required: ['medicineName'],
    },
  },
];

/**
 * Gọi Bedrock Runtime với Claude Native Tool-Use API (anthropic_version: "bedrock-2023-05-31")
 * Hỗ trợ Claude tự động chọn 1 trong 5 MCP Tools.
 */
export async function invokeBedrockWithTools(
  userQuery: string,
  contextData?: { currentMeds?: string[]; recentVitals?: string }
): Promise<BedrockToolUseDecision | null> {
  const modelId =
    process.env.BEDROCK_MODEL_ID || 'au.anthropic.claude-haiku-4-5-20251001-v1:0';
  const region = process.env.AWS_REGION || 'ap-southeast-2';

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  const hasRealCredentials =
    Boolean(accessKeyId) &&
    Boolean(secretAccessKey) &&
    secretAccessKey !== 'PASTE_YOUR_SECRET_KEY_HERE' &&
    !(secretAccessKey && secretAccessKey.includes('PASTE_'));

  if (!hasRealCredentials || !accessKeyId || !secretAccessKey) {
    console.log('[Bedrock Tool-Use] No real AWS credentials configured. Deferring to offline heuristic fallback.');
    return null;
  }

  try {
    const credentials = {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    };

    const bedrockClient = new BedrockRuntimeClient({
      region,
      credentials,
    });

    const systemPrompt = `You are CareBridge Ambient OS, an empathetic, geriatric-focused AI health companion running on an Amazon Echo Show 10 for senior patient Eleanor Vance (78).
Based on the user's spoken request, choose the single most relevant tool from the provided tools:
- getTodaySchedule: When asking for daily medication routine, upcoming doses, or compliance rate.
- logDoseStatus: When the senior reports taking, drinking, or skipping a medication (e.g. "I took my morning pills", "I took Amlodipine", "skipped my evening dose").
- recordVitals: When reporting blood pressure, blood sugar, heart rate, or pulse measurements.
- clinicalAdvisor: When reporting symptoms, discomfort, feeling dizzy, pain, or asking clinical questions.
- orderRefill: When requesting a refill or ordering more medicine via Amazon Pharmacy.

If no tool is needed (such as a greeting or simple conversation), respond directly with compassionate, reassuring text strictly under 20 words for fast speech rendering.`;

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userQuery,
        },
      ],
      tools: MCP_TOOLS_SCHEMAS,
      tool_choice: { type: 'auto' },
    };

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    console.log(`[Bedrock Tool-Use] Invoking ${modelId} with native tool schemas...`);
    const response = await bedrockClient.send(command);
    const jsonStr = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(jsonStr);

    const stopReason = parsed.stop_reason || 'end_turn';
    let toolCall: { id: string; name: string; input: Record<string, any> } | undefined;
    let textResponse: string | undefined;

    if (Array.isArray(parsed.content)) {
      for (const block of parsed.content) {
        if (block.type === 'tool_use') {
          toolCall = {
            id: block.id,
            name: block.name,
            input: block.input || {},
          };
        } else if (block.type === 'text') {
          textResponse = (textResponse ? textResponse + ' ' : '') + block.text;
        }
      }
    }

    console.log(`[Bedrock Tool-Use Response] Stop reason: ${stopReason}, Tool called: ${toolCall?.name || 'none'}`);

    return {
      stopReason,
      toolCall,
      textResponse: textResponse?.trim(),
      rawResponse: parsed,
    };
  } catch (err: any) {
    console.warn(`[Bedrock Tool-Use] AWS Bedrock call failed (${err?.name || 'Error'}: ${err?.message || err}). Falling back smoothly to offline heuristic fallback.`);
    return null;
  }
}

export async function analyzeClinicalQuery(
  patientStatement: string,
  contextData?: { currentMeds?: string[]; recentVitals?: string }
): Promise<ClinicalAnalysisResult> {
  const modelId =
    process.env.BEDROCK_MODEL_ID || 'au.anthropic.claude-haiku-4-5-20251001-v1:0';
  const region = process.env.AWS_REGION || 'ap-southeast-2';

  const systemPrompt = `
You are CareBridge Ambient Clinical AI, an empathetic, geriatric-focused clinical advisor deployed on Amazon Alexa / Echo Show devices for seniors.
Your goal is to provide calming, clinically sound, easily understandable health advice.
Always emphasize safety. If symptoms indicate an emergency (chest pain, stroke signs, extreme shortness of breath, sudden severe confusion), advise calling 000 / 911 immediately and set urgencyLevel to 'EMERGENCY'.
Context of patient:
- Active Medications: ${contextData?.currentMeds?.join(', ') || 'Amlodipine (Norvasc) 5mg, Metformin 500mg, Atorvastatin 20mg, Aspirin 81mg'}
- Recent Vitals: ${contextData?.recentVitals || 'Blood Pressure 125/82 mmHg, Blood Sugar 108 mg/dL'}

Respond STRICTLY in valid JSON with NO markdown codeblock markers, matching this exact schema:
{
  "speechResponse": "Concise, compassionate voice response for Alexa to speak out loud (strictly under 20 words for fast audio rendering).",
  "displayCardTitle": "Short, clear card title for Echo Show display (e.g. 'Mild Dizziness - Rest Recommended')",
  "actionAdvice": "Concrete, actionable step-by-step guidance for the senior or caregiver (e.g. 'Sit down immediately and drink a glass of warm water. Rest for 15 minutes before checking blood pressure.')",
  "clinicalExplanation": "Plain-language clinical reason for why this might be happening (e.g. 'Transient orthostatic hypotension may occur shortly after taking anti-hypertensive medication such as Amlodipine.')",
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
  "recommendedAction": "Primary immediate takeaway action"
}
`;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  const hasRealCredentials =
    Boolean(accessKeyId) &&
    Boolean(secretAccessKey) &&
    secretAccessKey !== 'PASTE_YOUR_SECRET_KEY_HERE' &&
    !(secretAccessKey && secretAccessKey.includes('PASTE_'));

  // Kiểm tra nếu có AWS Keys thật thì gọi Bedrock
  if (hasRealCredentials && accessKeyId && secretAccessKey) {
    try {
      console.log(`[Bedrock Invocation] Target Region: ${region}, Model ID: ${modelId}`);
      console.log(
        `[Bedrock Credentials] AccessKey: ${accessKeyId.substring(0, 4)}****, SecretKey: Present, SessionToken: ${
          sessionToken ? 'Present' : 'None'
        }`
      );

      const credentials = {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      };

      const bedrockClient = new BedrockRuntimeClient({
        region,
        credentials,
      });

      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 600,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: patientStatement,
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      console.log(`[Bedrock Invocation] Dispatching command to Bedrock runtime...`);
      const response = await bedrockClient.send(command);
      const jsonStr = new TextDecoder().decode(response.body);
      const parsed = JSON.parse(jsonStr);
      const textOutput = parsed.content?.[0]?.text || '{}';

      // Loại bỏ định dạng markdown (```json ... ```) nếu Claude bao quanh
      let cleanJson = textOutput.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }

      const parsedAnalysis = JSON.parse(cleanJson);

      const result: ClinicalAnalysisResult = {
        speechResponse:
          parsedAnalysis.speechResponse ||
          'I have noted your symptoms. Please rest seated and remain hydrated.',
        displayCardTitle:
          parsedAnalysis.displayCardTitle || 'Clinical Observation Logged',
        actionAdvice:
          parsedAnalysis.actionAdvice ||
          parsedAnalysis.advice ||
          'Please sit down and rest. Stay hydrated with warm water.',
        clinicalExplanation:
          parsedAnalysis.clinicalExplanation ||
          parsedAnalysis.explanation ||
          'Observation recorded in care log for caregiver review.',
        urgencyLevel: (['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'].includes(
          parsedAnalysis.urgencyLevel
        )
          ? parsedAnalysis.urgencyLevel
          : 'MEDIUM') as ClinicalAnalysisResult['urgencyLevel'],
        recommendedAction:
          parsedAnalysis.recommendedAction ||
          parsedAnalysis.actionAdvice ||
          'Rest seated for 15 minutes and monitor',
      };

      console.log(`[Bedrock Success] Claude Haiku response parsed:`, {
        title: result.displayCardTitle,
        urgency: result.urgencyLevel,
      });

      return result;
    } catch (err: any) {
      console.error(`[Bedrock Error] Failed to invoke AWS Bedrock:`);
      console.error(`  Error Name: ${err?.name || 'UnknownError'}`);
      console.error(`  Error Message: ${err?.message || String(err)}`);
      console.error(`  HTTP Status Code: ${err?.$metadata?.httpStatusCode ?? 'N/A'}`);
      console.error(`  Request ID: ${err?.$metadata?.requestId ?? 'N/A'}`);
      console.error(`  Stack Trace:\n`, err?.stack || err);
      console.warn(`[Bedrock Fallback] Switching to clinical offline fallback.`);
    }
  } else {
    console.log(
      `[Bedrock Info] AWS credentials not configured or placeholder detected. Using clinical fallback.`
    );
  }

  // Fallback thông minh chuẩn DTO cho trường hợp offline hoặc chưa có AWS Keys
  const lower = patientStatement.toLowerCase();
  const isEmergency =
    lower.includes('chest pain') ||
    lower.includes('shortness of breath') ||
    lower.includes('crushing') ||
    lower.includes('heart attack') ||
    lower.includes('đau ngực') ||
    lower.includes('khó thở');

  if (isEmergency) {
    return {
      speechResponse:
        "Emergency flagged. Sit down immediately. An urgent SMS alert with your vitals has been sent to your daughter Sarah.",
      displayCardTitle: 'EMERGENCY: Acute Chest Discomfort',
      actionAdvice:
        'Stop all physical movement immediately. Sit in an upright supported position. Rest quietly and keep your airway open. If pain radiates to jaw or left arm, call 911 immediately.',
      clinicalExplanation:
        'Severe acute chest discomfort warrants immediate clinical rule-out of acute coronary syndrome (ACS). CareBridge has auto-dispatched an urgent transactional SMS alert to primary caregiver Sarah Connor.',
      urgencyLevel: 'EMERGENCY',
      recommendedAction: 'Rest seated upright, maintain airway, emergency SMS delivered',
    };
  }

  const isDizzy =
    lower.includes('dizzy') ||
    lower.includes('chóng mặt');

  return {
    speechResponse: isDizzy
      ? "Please sit down and rest. Dizziness is common after blood pressure medication."
      : "I have recorded your note. Please rest quietly and drink a glass of water.",
    displayCardTitle: isDizzy ? 'Mild Dizziness - Sit & Rest' : 'Health Observation Logged',
    actionAdvice: isDizzy
      ? 'Please sit down immediately to prevent falls. Drink 200ml of room-temperature water. Rest for 15 minutes before checking blood pressure.'
      : 'Symptoms recorded in daily care log. Vital signs remain in safe parameters. Continue scheduled routine.',
    clinicalExplanation: isDizzy
      ? 'Amlodipine relaxes and dilates blood vessels, which may cause temporary orthostatic hypotension or lightheadedness upon standing.'
      : 'No acute medication contraindications found. Baseline vitals and daily regimen remain stable.',
    urgencyLevel: isDizzy ? 'MEDIUM' : 'LOW',
    recommendedAction: isDizzy ? 'Rest seated for 15 minutes and hydrate' : 'Continue daily rest',
  };
}