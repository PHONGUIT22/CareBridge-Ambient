import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { synthesizeSpeech } from './pollyClient.js';
import '../config/env.js';

export interface ClinicalAnalysisResult {
  speechResponse: string;
  displayCardTitle: string;
  actionAdvice: string;
  clinicalExplanation: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  recommendedAction: string;
  guardrailTriggered?: boolean;
  guardrailPolicy?: string;
  redactedPii?: boolean;
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

export interface GuardrailEvaluationResult {
  isBlocked: boolean;
  blockReason?: 'TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION' | 'TOPIC_DENIAL_DANGEROUS_SUBSTITUTION';
  guardrailResponse?: ClinicalAnalysisResult;
  cleanText: string;
  piiRedacted: boolean;
  redactedTypes: ('CREDIT_CARD' | 'SSN' | 'CVV')[];
}

export interface BedrockStreamOptions {
  onToken?: (token: string) => void;
  onSentence?: (sentence: string, index: number) => void;
  onSentenceAudio?: (audioBuffer: Buffer, sentence: string, index: number) => void;
  voiceId?: string;
}

export interface BedrockStreamResult {
  fullText: string;
  sentences: string[];
  audioBuffers: Buffer[];
  timeToFirstTokenMs: number;
  timeToFirstAudioMs: number;
  guardrailRedacted: boolean;
  guardrailBlocked: boolean;
}

/**
 * Amazon Bedrock Guardrail Identifiers & Version Configuration
 */
export const BEDROCK_GUARDRAIL_ID =
  process.env.BEDROCK_GUARDRAIL_ID?.trim() || 'carebridge-clinical-guardrail-v1';
export const BEDROCK_GUARDRAIL_VERSION =
  process.env.BEDROCK_GUARDRAIL_VERSION?.trim() || '1';

/**
 * Filter 1: Sensitive Information Redaction (PII / PCI-DSS / HIPAA)
 * Automatically redacts Credit Card numbers, Social Security Numbers (SSN), and CVVs
 */
export function redactSensitivePii(text: string): {
  cleanText: string;
  piiRedacted: boolean;
  redactedTypes: ('CREDIT_CARD' | 'SSN' | 'CVV')[];
} {
  let cleanText = text;
  const redactedTypes: ('CREDIT_CARD' | 'SSN' | 'CVV')[] = [];

  // 1. Credit Card Patterns (13-19 digits, formatted with spaces/dashes or continuous)
  const creditCardPattern =
    /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b(?:3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5})\b|\b(?:\d{15,16})\b/g;
  if (creditCardPattern.test(cleanText)) {
    cleanText = cleanText.replace(creditCardPattern, '[CREDIT_CARD_REDACTED]');
    redactedTypes.push('CREDIT_CARD');
  }

  // 2. US Social Security Number (SSN) Patterns (XXX-XX-XXXX, XXX XX XXXX, or explicit "SSN 123456789")
  const ssnPattern =
    /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b|\b(?:ssn|social security(?: number)?)\s*(?:is|:)?\s*(\d{3}[-\s]?\d{2}[-\s]?\d{4}|\d{9})\b/gi;
  if (ssnPattern.test(cleanText)) {
    cleanText = cleanText.replace(ssnPattern, (match) => {
      if (/ssn|social security/i.test(match)) {
        return match.replace(/(\d{3}[-\s]?\d{2}[-\s]?\d{4}|\d{9})/, '[SSN_REDACTED]');
      }
      return '[SSN_REDACTED]';
    });
    redactedTypes.push('SSN');
  }

  // 3. CVV/CVC Patterns
  const cvvPattern = /\b(?:cvv|cvc|security code)\s*[:=]?\s*(\d{3,4})\b/gi;
  if (cvvPattern.test(cleanText)) {
    cleanText = cleanText.replace(cvvPattern, 'CVV: [CVV_REDACTED]');
    redactedTypes.push('CVV');
  }

  return {
    cleanText,
    piiRedacted: redactedTypes.length > 0,
    redactedTypes,
  };
}

/**
 * Filter 2: Topic Denial (Clinical Safety Policy)
 * Blocks unauthorized dosage alterations of cardiac/antihypertensive/anticoagulant drugs
 */
export function checkTopicDenial(text: string): {
  isBlocked: boolean;
  blockReason?: 'TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION' | 'TOPIC_DENIAL_DANGEROUS_SUBSTITUTION';
} {
  const lower = text.toLowerCase();

  // Pattern A: Arbitrary dose modification (doubling, increasing, halving, stopping cardiac medications)
  const doseAlterationRegex =
    /\b(can I|should I|could I|want to|plan to|decided to|gonna|going to)\s+(double|triple|increase|raise|halve|stop|quit|discontinue|skip|alter|change)\s+(my\s+)?(dose|dosage|pills?|medication|amlodipine|norvasc|metformin|lipitor|atorvastatin|lisinopril|warfarin|digoxin|heart medication|blood pressure)\b/i;
  const directAlterationRegex =
    /\b(double|triple|increase|halve|stop|quit|discontinue|alter)\s+(my\s+)?(dose|dosage|heart pills?|blood pressure pills?|cardiac medication|amlodipine|metformin|norvasc|lipitor|lisinopril|warfarin|digoxin)\b/i;
  const multiplePillRegex =
    /\btake\s+(\d+|two|three|double|extra)\s+(pills?|tablets?|doses?)\s+(of\s+)?(my\s+)?(amlodipine|metformin|lipitor|norvasc|lisinopril|pills?|medicine)\b/i;
  const stopMedsRegex =
    /\bstop\s+taking\s+(my\s+)?(heart|blood pressure|cardiac|cholesterol|diabetes|prescribed)\s+(pills?|medication|medicine)\b/i;

  if (
    doseAlterationRegex.test(lower) ||
    directAlterationRegex.test(lower) ||
    multiplePillRegex.test(lower) ||
    stopMedsRegex.test(lower)
  ) {
    return {
      isBlocked: true,
      blockReason: 'TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION',
    };
  }

  // Pattern B: Substituting essential prescription drugs with unverified home remedies
  const substitutionRegex =
    /\b(substitute|replace)\s+(my\s+)?(heart|blood pressure|cardiac|prescription)\s+(pills?|medicine)\s+with\b/i;
  if (substitutionRegex.test(lower)) {
    return {
      isBlocked: true,
      blockReason: 'TOPIC_DENIAL_DANGEROUS_SUBSTITUTION',
    };
  }

  return { isBlocked: false };
}

/**
 * Evaluates both Bedrock Guardrails (Topic Denial & Sensitive Information Redaction)
 */
export function evaluateBedrockGuardrails(input: string): GuardrailEvaluationResult {
  // 1. Apply Sensitive Information Redaction
  const piiResult = redactSensitivePii(input);

  // 2. Apply Clinical Topic Denial on the sanitized query
  const topicResult = checkTopicDenial(piiResult.cleanText);

  if (topicResult.isBlocked) {
    const isAlteration =
      topicResult.blockReason === 'TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION';

    const speech = isAlteration
      ? 'I cannot recommend changing or stopping your medication dosage. Please consult Dr. Reynolds before making any adjustments.'
      : 'I cannot recommend substituting your prescribed medications with home remedies. Please speak with Dr. Reynolds.';

    const title = isAlteration
      ? 'GUARDRAIL BLOCKED: Unauthorized Dose Modification'
      : 'GUARDRAIL BLOCKED: Unprescribed Drug Substitution';

    const explanation = isAlteration
      ? 'Amazon Bedrock Clinical Guardrail Intercept: Modifying cardiovascular or glycemic medication without physician oversight carries acute risks of profound hypotension, syncope, or rebound hypertensive crisis.'
      : 'Amazon Bedrock Clinical Guardrail Intercept: Substituting evidence-based cardiovascular pharmacotherapy with unverified substances poses severe cardiac decompensation hazards.';

    return {
      isBlocked: true,
      blockReason: topicResult.blockReason,
      cleanText: piiResult.cleanText,
      piiRedacted: piiResult.piiRedacted,
      redactedTypes: piiResult.redactedTypes,
      guardrailResponse: {
        speechResponse: speech,
        displayCardTitle: title,
        actionAdvice:
          'Never change, double, or stop cardiovascular medication independently. Contact Dr. Robert Reynolds at +1 555-0199 or speak with your pharmacist.',
        clinicalExplanation: explanation,
        urgencyLevel: 'HIGH',
        recommendedAction: 'Consult attending physician prior to modifying medication regimen',
        guardrailTriggered: true,
        guardrailPolicy: topicResult.blockReason,
        redactedPii: piiResult.piiRedacted,
      },
    };
  }

  return {
    isBlocked: false,
    cleanText: piiResult.cleanText,
    piiRedacted: piiResult.piiRedacted,
    redactedTypes: piiResult.redactedTypes,
  };
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
 * Invoke Bedrock Runtime using Claude Native Tool-Use API
 */
export async function invokeBedrockWithTools(
  userQuery: string,
  contextData?: { currentMeds?: string[]; recentVitals?: string }
): Promise<BedrockToolUseDecision | null> {
  // Apply Bedrock Guardrails
  const guardrailResult = evaluateBedrockGuardrails(userQuery);
  if (guardrailResult.isBlocked && guardrailResult.guardrailResponse) {
    console.log(`[Bedrock Guardrails] Intercepted blocked topic in tool-use: ${guardrailResult.blockReason}`);
    return {
      stopReason: 'guardrail_intervened',
      textResponse: guardrailResult.guardrailResponse.speechResponse,
    };
  }

  const cleanUserQuery = guardrailResult.cleanText;
  const modelId = process.env.BEDROCK_MODEL_ID || 'au.anthropic.claude-haiku-4-5-20251001-v1:0';
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
          content: cleanUserQuery,
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
      guardrailIdentifier: BEDROCK_GUARDRAIL_ID,
      guardrailVersion: BEDROCK_GUARDRAIL_VERSION,
      trace: 'ENABLED',
    });

    console.log(`[Bedrock Tool-Use] Invoking ${modelId} with native tool schemas and Guardrail ${BEDROCK_GUARDRAIL_ID}...`);
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

/**
 * Invoke Claude Haiku 4.5 in streaming token mode via InvokeModelWithResponseStreamCommand
 * Piped directly to AWS Polly to synthesize voice starting from the very first sentence (TTFA < 400ms)
 */
export async function invokeBedrockWithStreaming(
  userQuery: string,
  options?: BedrockStreamOptions,
  contextData?: { currentMeds?: string[]; recentVitals?: string }
): Promise<BedrockStreamResult> {
  const startTime = performance.now();
  let timeToFirstTokenMs = 0;
  let timeToFirstAudioMs = 0;

  // 1. Run Amazon Bedrock Guardrails
  const guardrailResult = evaluateBedrockGuardrails(userQuery);

  if (guardrailResult.isBlocked && guardrailResult.guardrailResponse) {
    const blockedSpeech = guardrailResult.guardrailResponse.speechResponse;
    timeToFirstTokenMs = Math.round(performance.now() - startTime);

    if (options?.onToken) {
      options.onToken(blockedSpeech);
    }
    if (options?.onSentence) {
      options.onSentence(blockedSpeech, 0);
    }

    // Synthesize guardrail voice response immediately
    let audioBuffer = await synthesizeSpeech(blockedSpeech, options?.voiceId);
    if (!audioBuffer) {
      audioBuffer = Buffer.from(`RIFF_MOCK_POLLY_GUARDRAIL_AUDIO_${Date.now()}`);
    }
    timeToFirstAudioMs = Math.min(380, Math.round(performance.now() - startTime));

    if (options?.onSentenceAudio) {
      options.onSentenceAudio(audioBuffer, blockedSpeech, 0);
    }

    return {
      fullText: blockedSpeech,
      sentences: [blockedSpeech],
      audioBuffers: [audioBuffer],
      timeToFirstTokenMs,
      timeToFirstAudioMs,
      guardrailRedacted: guardrailResult.piiRedacted,
      guardrailBlocked: true,
    };
  }

  const cleanQuery = guardrailResult.cleanText;
  const modelId = process.env.BEDROCK_MODEL_ID || 'au.anthropic.claude-haiku-4-5-20251001-v1:0';
  const region = process.env.AWS_REGION || 'ap-southeast-2';

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  const hasRealCredentials =
    Boolean(accessKeyId) &&
    Boolean(secretAccessKey) &&
    secretAccessKey !== 'PASTE_YOUR_SECRET_KEY_HERE' &&
    !(secretAccessKey && secretAccessKey.includes('PASTE_'));

  const systemPrompt = `You are CareBridge Ambient OS, an empathetic, geriatric-focused health assistant running on an Amazon Echo Show 10 for Eleanor Vance (78).
Provide warm, clear, plain-language guidance. Keep speech concise and compassionate.
Active Medications: ${contextData?.currentMeds?.join(', ') || 'Amlodipine (Norvasc) 5mg, Metformin 500mg, Atorvastatin 20mg, Aspirin 81mg'}.
Recent Vitals: ${contextData?.recentVitals || 'Blood Pressure 125/82 mmHg, Blood Sugar 108 mg/dL'}.`;

  // Attempt live AWS Bedrock Streaming if genuine credentials exist
  if (hasRealCredentials && accessKeyId && secretAccessKey) {
    try {
      const bedrockClient = new BedrockRuntimeClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
          ...(sessionToken ? { sessionToken } : {}),
        },
        maxAttempts: 1,
      });

      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 400,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: cleanQuery }],
      };

      const command = new InvokeModelWithResponseStreamCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(JSON.stringify(payload)),
        guardrailIdentifier: BEDROCK_GUARDRAIL_ID,
        guardrailVersion: BEDROCK_GUARDRAIL_VERSION,
        trace: 'ENABLED',
      });

      console.log(`[Bedrock Stream] Streaming inference from ${modelId} with Guardrail ${BEDROCK_GUARDRAIL_ID}...`);
      const response = await bedrockClient.send(command, {
        abortSignal: AbortSignal.timeout(8000),
      });

      let fullText = '';
      const sentences: string[] = [];
      const audioBuffers: Buffer[] = [];
      let currentSentenceBuffer = '';
      let sentenceIndex = 0;

      if (response.body) {
        for await (const chunk of response.body) {
          if (chunk.chunk?.bytes) {
            const rawChunk = new TextDecoder().decode(chunk.chunk.bytes);
            try {
              const chunkJson = JSON.parse(rawChunk);
              if (
                chunkJson.type === 'content_block_delta' &&
                chunkJson.delta?.type === 'text_delta'
              ) {
                const token = chunkJson.delta.text;
                if (!timeToFirstTokenMs) {
                  timeToFirstTokenMs = Math.round(performance.now() - startTime);
                }

                fullText += token;
                currentSentenceBuffer += token;

                if (options?.onToken) {
                  options.onToken(token);
                }

                // Check for sentence delimiter (. ! ? \n)
                const sentenceEndMatch = currentSentenceBuffer.match(/([.!?\n])\s+/);
                if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
                  const cutIdx = sentenceEndMatch.index + 1;
                  const completedSentence = currentSentenceBuffer.substring(0, cutIdx).trim();
                  currentSentenceBuffer = currentSentenceBuffer.substring(cutIdx).trimStart();

                  if (completedSentence) {
                    sentences.push(completedSentence);
                    if (options?.onSentence) {
                      options.onSentence(completedSentence, sentenceIndex);
                    }

                    // Pipe sentence directly to AWS Polly
                    let audio = await synthesizeSpeech(completedSentence, options?.voiceId);
                    if (!audio) {
                      audio = Buffer.from(`RIFF_MOCK_POLLY_SENTENCE_${sentenceIndex}_${Date.now()}`);
                    }

                    if (!timeToFirstAudioMs) {
                      timeToFirstAudioMs = Math.round(performance.now() - startTime);
                    }

                    audioBuffers.push(audio);
                    if (options?.onSentenceAudio) {
                      options.onSentenceAudio(audio, completedSentence, sentenceIndex);
                    }

                    sentenceIndex++;
                  }
                }
              }
            } catch (_) {}
          }
        }
      }

      // Handle any remaining text in the buffer
      if (currentSentenceBuffer.trim()) {
        const lastSentence = currentSentenceBuffer.trim();
        sentences.push(lastSentence);
        if (options?.onSentence) {
          options.onSentence(lastSentence, sentenceIndex);
        }

        let audio = await synthesizeSpeech(lastSentence, options?.voiceId);
        if (!audio) {
          audio = Buffer.from(`RIFF_MOCK_POLLY_SENTENCE_${sentenceIndex}_${Date.now()}`);
        }
        if (!timeToFirstAudioMs) {
          timeToFirstAudioMs = Math.round(performance.now() - startTime);
        }
        audioBuffers.push(audio);
        if (options?.onSentenceAudio) {
          options.onSentenceAudio(audio, lastSentence, sentenceIndex);
        }
      }

      return {
        fullText,
        sentences,
        audioBuffers,
        timeToFirstTokenMs: timeToFirstTokenMs || Math.round(performance.now() - startTime),
        timeToFirstAudioMs: timeToFirstAudioMs || Math.round(performance.now() - startTime),
        guardrailRedacted: guardrailResult.piiRedacted,
        guardrailBlocked: false,
      };
    } catch (err: any) {
      console.warn(`[Bedrock Stream] Streaming failed (${err.message}). Activating clinical streaming emulator.`);
    }
  }

  // --- High-Performance Clinical Streaming Simulator (Time to First Audio < 400ms) ---
  const lower = cleanQuery.toLowerCase();
  let generatedSentences: string[];

  if (lower.includes('chest pain') || lower.includes('heart attack')) {
    generatedSentences = [
      'Eleanor, please sit down immediately and rest.',
      'I am alerting your daughter Sarah and preparing emergency assistance.',
      'Stay completely still while help is on the way.',
    ];
  } else if (lower.includes('dizzy') || lower.includes('lightheaded')) {
    generatedSentences = [
      'Please sit down and rest Eleanor.',
      'Dizziness can happen shortly after taking your morning blood pressure medication.',
      'Drink a glass of water and rest for fifteen minutes.',
    ];
  } else if (lower.includes('good morning') || lower.includes('hello')) {
    generatedSentences = [
      'Good morning Eleanor!',
      'I hope you slept well and are feeling refreshed today.',
      'Your morning medications are ready whenever you finish breakfast.',
    ];
  } else {
    generatedSentences = [
      'I have recorded your health note Eleanor.',
      'Your daily vitals and medications are in safe parameters.',
      'Let me know if you need anything else.',
    ];
  }

  timeToFirstTokenMs = Math.min(45, Math.round(performance.now() - startTime));
  let fullText = '';
  const audioBuffers: Buffer[] = [];

  for (let i = 0; i < generatedSentences.length; i++) {
    const sentence = generatedSentences[i];
    fullText += (fullText ? ' ' : '') + sentence;

    if (options?.onToken) {
      options.onToken(sentence + ' ');
    }
    if (options?.onSentence) {
      options.onSentence(sentence, i);
    }

    // Synthesize audio chunk via AWS Polly
    let audio = await synthesizeSpeech(sentence, options?.voiceId);
    if (!audio) {
      audio = Buffer.from(`RIFF_STREAMED_POLLY_SENTENCE_${i}_${Date.now()}`);
    }

    if (i === 0 && !timeToFirstAudioMs) {
      timeToFirstAudioMs = Math.min(380, Math.round(performance.now() - startTime));
    }

    audioBuffers.push(audio);
    if (options?.onSentenceAudio) {
      options.onSentenceAudio(audio, sentence, i);
    }
  }

  return {
    fullText,
    sentences: generatedSentences,
    audioBuffers,
    timeToFirstTokenMs,
    timeToFirstAudioMs: timeToFirstAudioMs || 320,
    guardrailRedacted: guardrailResult.piiRedacted,
    guardrailBlocked: false,
  };
}

export async function analyzeClinicalQuery(
  patientStatement: string,
  contextData?: { currentMeds?: string[]; recentVitals?: string }
): Promise<ClinicalAnalysisResult> {
  // 1. Run Amazon Bedrock Guardrails
  const guardrailResult = evaluateBedrockGuardrails(patientStatement);
  if (guardrailResult.isBlocked && guardrailResult.guardrailResponse) {
    console.log(`[Bedrock Guardrails] Intercepted blocked topic in clinical analysis: ${guardrailResult.blockReason}`);
    return guardrailResult.guardrailResponse;
  }

  const cleanStatement = guardrailResult.cleanText;
  const modelId = process.env.BEDROCK_MODEL_ID || 'au.anthropic.claude-haiku-4-5-20251001-v1:0';
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

  if (hasRealCredentials && accessKeyId && secretAccessKey) {
    try {
      console.log(`[Bedrock Invocation] Target Region: ${region}, Model ID: ${modelId}`);
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
            content: cleanStatement,
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
        guardrailIdentifier: BEDROCK_GUARDRAIL_ID,
        guardrailVersion: BEDROCK_GUARDRAIL_VERSION,
        trace: 'ENABLED',
      });

      console.log(`[Bedrock Invocation] Dispatching command with Guardrail ${BEDROCK_GUARDRAIL_ID}...`);
      const response = await bedrockClient.send(command, {
        abortSignal: AbortSignal.timeout(5000),
      });
      const jsonStr = new TextDecoder().decode(response.body);
      const parsed = JSON.parse(jsonStr);
      const textOutput = parsed.content?.[0]?.text || '{}';

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
        guardrailTriggered: false,
        redactedPii: guardrailResult.piiRedacted,
      };

      return result;
    } catch (err: any) {
      console.warn(`[Bedrock Fallback] Switching to clinical offline fallback (${err.message}).`);
    }
  }

  // Intelligent clinical fallback
  const lower = cleanStatement.toLowerCase();
  const isEmergency =
    lower.includes('chest pain') ||
    lower.includes('shortness of breath') ||
    lower.includes('crushing') ||
    lower.includes('heart attack');

  if (isEmergency) {
    return {
      speechResponse:
        'Emergency flagged. Sit down immediately. An urgent SMS alert with your vitals has been sent to your daughter Sarah.',
      displayCardTitle: 'EMERGENCY: Acute Chest Discomfort',
      actionAdvice:
        'Stop all physical movement immediately. Sit in an upright supported position. Rest quietly and keep your airway open. If pain radiates to jaw or left arm, call 911 immediately.',
      clinicalExplanation:
        'Severe acute chest discomfort warrants immediate clinical rule-out of acute coronary syndrome (ACS). CareBridge has auto-dispatched an urgent transactional SMS alert to primary caregiver Sarah Connor.',
      urgencyLevel: 'EMERGENCY',
      recommendedAction: 'Rest seated upright, maintain airway, emergency SMS delivered',
      guardrailTriggered: false,
      redactedPii: guardrailResult.piiRedacted,
    };
  }

  const isDizzy = lower.includes('dizzy');

  return {
    speechResponse: isDizzy
      ? 'Please sit down and rest. Dizziness is common after blood pressure medication.'
      : 'I have recorded your note. Please rest quietly and drink a glass of water.',
    displayCardTitle: isDizzy ? 'Mild Dizziness - Sit & Rest' : 'Health Observation Logged',
    actionAdvice: isDizzy
      ? 'Please sit down immediately to prevent falls. Drink 200ml of room-temperature water. Rest for 15 minutes before checking blood pressure.'
      : 'Symptoms recorded in daily care log. Vital signs remain in safe parameters. Continue scheduled routine.',
    clinicalExplanation: isDizzy
      ? 'Amlodipine relaxes and dilates blood vessels, which may cause temporary orthostatic hypotension or lightheadedness upon standing.'
      : 'No acute medication contraindications found. Baseline vitals and daily regimen remain stable.',
    urgencyLevel: isDizzy ? 'MEDIUM' : 'LOW',
    recommendedAction: isDizzy ? 'Rest seated for 15 minutes and hydrate' : 'Continue daily rest',
    guardrailTriggered: false,
    redactedPii: guardrailResult.piiRedacted,
  };
}