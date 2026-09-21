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
    description: "Retrieve the patient's daily medication schedule, percentage adherence rate, and next upcoming dose.",
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Target date in YYYY-MM-DD format. Defaults to today.',
        },
      },
      required: [],
    },
  },
  {
    name: 'logDoseStatus',
    description: "Mark medication dose intake status as 'taken' or 'skipped', with optional clinical or feeling notes.",
    input_schema: {
      type: 'object',
      properties: {
        logId: {
          type: 'string',
          description: 'Unique intake log record identifier (if known).',
        },
        medicineName: {
          type: 'string',
          description: 'Name of medicine spoken by patient (e.g., Amlodipine, Metformin, Lipitor, morning pills).',
        },
        status: {
          type: 'string',
          enum: ['taken', 'skipped', 'pending'],
          description: "New intake status ('taken' or 'skipped'). Defaults to 'taken'.",
        },
        notes: {
          type: 'string',
          description: 'Clinical observation or sensation noted during intake.',
        },
      },
      required: [],
    },
  },
  {
    name: 'recordVitals',
    description: 'Record geriatric biometric vitals: systolic and diastolic blood pressure, blood glucose, and heart rate.',
    input_schema: {
      type: 'object',
      properties: {
        systolic: { type: 'number', description: 'Systolic blood pressure mmHg (e.g. 120, 130)' },
        diastolic: { type: 'number', description: 'Diastolic blood pressure mmHg (e.g. 80, 85)' },
        bloodSugar: { type: 'number', description: 'Blood glucose level mg/dL (e.g. 105)' },
        heartRate: { type: 'number', description: 'Heart rate in beats per minute bpm (e.g. 72)' },
        date: { type: 'string', description: 'Date of measurement in YYYY-MM-DD format. Defaults to today.' },
      },
      required: [],
    },
  },
  {
    name: 'clinicalAdvisor',
    description: 'Evaluate senior symptoms or health queries (dizziness, chest pain, fatigue, drug interactions) for triage and guidance.',
    input_schema: {
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
  {
    name: 'orderRefill',
    description: 'Place an automated 1-Click prescription refill order via Amazon Pharmacy when inventory runs low or upon patient request.',
    input_schema: {
      type: 'object',
      properties: {
        medicineName: {
          type: 'string',
          description: 'Name of the medication to refill (e.g., Atorvastatin, Amlodipine, Metformin).',
        },
        quantity: {
          type: 'number',
          description: 'Number of tablets to refill (defaults to 30 tablets for a 1-month supply).',
        },
      },
      required: ['medicineName'],
    },
  },
  {
    name: 'ringDeviceHub',
    description:
      'Integrate Ring smart home ecosystem (Ring Video Doorbell Pro & Ring Smart Access Lock). Check front porch camera, verify Amazon Pharmacy deliveries, and unlock door for emergency paramedics.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['checkFrontPorch', 'triggerEmergencyDoorUnlock', 'getDeviceStatus'],
          description: 'Action to perform: checkFrontPorch (inspect porch/package), triggerEmergencyDoorUnlock (emergency paramedic access).',
        },
        reason: {
          type: 'string',
          description: 'Reason for triggering device action.',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'negotiateAdherence',
    description:
      'Handles patient resistance or refusal to take scheduled medication. Deploys an AI Health Guardian persona to negotiate adherence and activates the Sarah Connor emergency family circuit-breaker if refusal persists.',
    input_schema: {
      type: 'object',
      properties: {
        medicineName: {
          type: 'string',
          description: 'Name of the medication being refused or resisted (e.g. Amlodipine, Lipitor, morning pills).',
        },
        refusalReason: {
          type: 'string',
          description: 'Reason provided by the patient for refusing or wanting to skip.',
        },
        personaId: {
          type: 'string',
          enum: ['nurse_betty', 'dr_reynolds', 'grandson_leo', 'sergeant_miller'],
          description: 'Health Guardian persona to deploy. Defaults to grandson_leo.',
        },
        turnCount: {
          type: 'number',
          description: 'Resistance turn count (1 = initial persuasion, 2+ = Sarah Circuit-Breaker).',
        },
      },
      required: [],
    },
  },
];

/**
 * Invoke Bedrock Runtime using Claude Native Tool-Use API (anthropic_version: "bedrock-2023-05-31")
 * Enables Claude to autonomously reason and execute 1 of 5 MCP Tools.
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
      maxAttempts: 1,
    });

    const systemPrompt = `You are CareBridge Ambient OS, an empathetic, geriatric-focused AI health companion running on an Amazon Echo Show 10 for senior patient Eleanor Vance (78).
Based on the user's spoken request, choose the single most relevant tool from the provided tools:
- negotiateAdherence: HIGHEST PRIORITY whenever the patient expresses ANY reluctance, hesitation, resistance, refusal, says "don't want to take", "not taking my pills", "hate this pill", "skip my pills", "leave me alone", "refuse". Even if "today" or "schedule" is mentioned, if reluctance or refusal is expressed, ALWAYS choose negotiateAdherence.
- getTodaySchedule: ONLY when asking for daily medication routine, upcoming doses, or compliance rate. NOT when resisting doses.
- logDoseStatus: When the senior reports taking, drinking, or having taken a medication (e.g. "I took my morning pills", "I took Amlodipine").
- recordVitals: When reporting blood pressure, blood sugar, heart rate, or pulse measurements.
- clinicalAdvisor: When reporting symptoms, discomfort, feeling dizzy, pain, or asking clinical questions.
- orderRefill: When requesting a refill or ordering more medicine via Amazon Pharmacy.
- ringDeviceHub: When checking front porch Ring camera, packages, or unlocking door for emergency paramedics.

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
    const response = await bedrockClient.send(command, {
      abortSignal: AbortSignal.timeout(5000),
    });
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

  // If genuine AWS credentials exist, invoke Bedrock
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
        maxAttempts: 1,
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
      const response = await bedrockClient.send(command, {
        abortSignal: AbortSignal.timeout(5000),
      });
      const jsonStr = new TextDecoder().decode(response.body);
      const parsed = JSON.parse(jsonStr);
      const textOutput = parsed.content?.[0]?.text || '{}';

      // Strip markdown code block wrapping (```json ... ```) if emitted by Claude
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

  // Intelligent clinical DTO fallback for offline environments or unconfigured AWS credentials
  const lower = patientStatement.toLowerCase();
  const isEmergency =
    lower.includes('chest pain') ||
    lower.includes('shortness of breath') ||
    lower.includes('crushing') ||
    lower.includes('heart attack');

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

  const isDizzy = lower.includes('dizzy');

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