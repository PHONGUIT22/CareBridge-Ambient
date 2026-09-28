import { describe, it, expect, beforeAll } from 'vitest';
import {
  evaluateBedrockGuardrails,
  redactSensitivePii,
  checkTopicDenial,
  invokeBedrockWithStreaming,
  analyzeClinicalQuery,
  BEDROCK_GUARDRAIL_ID,
  BEDROCK_GUARDRAIL_VERSION,
} from '../src/aws/bedrockClient.js';
import {
  checkDrugInteractions,
  getBeersCriteriaProfile,
  BEERS_CRITERIA_GERIATRIC_DRUGS,
  CLINICAL_INTERACTION_RULES,
} from '../src/services/drugInteractionService.js';
import { initDB } from '../src/database/db.js';
import { seedDemoData } from '../src/database/seedDemoData.js';

describe('AWS Bedrock Clinical Enterprise Architecture Suite', () => {
  beforeAll(async () => {
    initDB();
    await seedDemoData('usr_demo', false);
  });

  // ==========================================
  // PART 1: AMAZON BEDROCK GUARDRAILS
  // ==========================================
  describe('Amazon Bedrock Guardrails Simulation & Integration', () => {
    it('configures guardrailIdentifier and guardrailVersion according to AWS specifications', () => {
      expect(BEDROCK_GUARDRAIL_ID).toBeDefined();
      expect(typeof BEDROCK_GUARDRAIL_ID).toBe('string');
      expect(BEDROCK_GUARDRAIL_ID.length).toBeGreaterThan(0);

      expect(BEDROCK_GUARDRAIL_VERSION).toBeDefined();
      expect(typeof BEDROCK_GUARDRAIL_VERSION).toBe('string');
    });

    describe('Filter 1: Sensitive Information Redaction (PII / PCI-DSS)', () => {
      it('redacts formatted and raw credit card numbers spoken through the microphone', () => {
        const queryWithCard = 'I want to pay for my copay with card 4111-2222-3333-4444 please.';
        const result = redactSensitivePii(queryWithCard);

        expect(result.piiRedacted).toBe(true);
        expect(result.redactedTypes).toContain('CREDIT_CARD');
        expect(result.cleanText).not.toContain('4111-2222-3333-4444');
        expect(result.cleanText).toContain('[CREDIT_CARD_REDACTED]');
      });

      it('redacts Social Security Numbers (SSN) spoken by senior', () => {
        const queryWithSsn = 'For Medicare verification, my SSN is 123-45-6789.';
        const result = redactSensitivePii(queryWithSsn);

        expect(result.piiRedacted).toBe(true);
        expect(result.redactedTypes).toContain('SSN');
        expect(result.cleanText).not.toContain('123-45-6789');
        expect(result.cleanText).toContain('[SSN_REDACTED]');
      });

      it('redacts both credit card and SSN simultaneously in compound utterances', () => {
        const compound = 'Card 5500 2345 6789 0123 and social security number is 987-65-4321';
        const result = redactSensitivePii(compound);

        expect(result.piiRedacted).toBe(true);
        expect(result.redactedTypes).toContain('CREDIT_CARD');
        expect(result.redactedTypes).toContain('SSN');
        expect(result.cleanText).toContain('[CREDIT_CARD_REDACTED]');
        expect(result.cleanText).toContain('[SSN_REDACTED]');
      });

      it('leaves standard clinical inquiries untampered when zero PII is present', () => {
        const clinicalQuery = 'I took my morning Amlodipine 5mg with a cup of warm water.';
        const result = redactSensitivePii(clinicalQuery);

        expect(result.piiRedacted).toBe(false);
        expect(result.redactedTypes).toHaveLength(0);
        expect(result.cleanText).toBe(clinicalQuery);
      });
    });

    describe('Filter 2: Topic Denial (Clinical Safety Policy)', () => {
      it('blocks dangerous attempts to arbitrarily double or increase cardiac medication', () => {
        const dangerousQuery = 'My blood pressure feels high, can I double my Amlodipine dose today?';
        const evaluation = checkTopicDenial(dangerousQuery);

        expect(evaluation.isBlocked).toBe(true);
        expect(evaluation.blockReason).toBe('TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION');
      });

      it('blocks attempts to stop life-sustaining cardiac or diabetes medications', () => {
        const stopQuery = 'I decided to stop taking my heart pills because I feel fine.';
        const evaluation = checkTopicDenial(stopQuery);

        expect(evaluation.isBlocked).toBe(true);
        expect(evaluation.blockReason).toBe('TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION');
      });

      it('blocks attempts to substitute prescribed cardiovascular drugs with home remedies', () => {
        const subQuery = 'Can I replace my blood pressure medicine with apple cider vinegar?';
        const evaluation = checkTopicDenial(subQuery);

        expect(evaluation.isBlocked).toBe(true);
        expect(evaluation.blockReason).toBe('TOPIC_DENIAL_DANGEROUS_SUBSTITUTION');
      });

      it('allows safe, legitimate symptom inquiries without triggering Topic Denial', () => {
        const safeQuery = 'I felt slightly dizzy for ten minutes after standing up from the sofa.';
        const evaluation = checkTopicDenial(safeQuery);

        expect(evaluation.isBlocked).toBe(false);
      });

      it('intercepts blocked queries in analyzeClinicalQuery and provides clinical refusal guidance', async () => {
        const result = await analyzeClinicalQuery('Should I take double dose of Metformin tonight?');

        expect(result.guardrailTriggered).toBe(true);
        expect(result.guardrailPolicy).toBe('TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION');
        expect(result.speechResponse).toContain('cannot recommend changing or stopping your medication dosage');
        expect(result.speechResponse).toContain('Dr. Reynolds');
        expect(result.displayCardTitle).toContain('GUARDRAIL BLOCKED');
        expect(result.urgencyLevel).toBe('HIGH');
      });
    });
  });

  // ==========================================
  // PART 2: STREAMING INFERENCE WITH TTFA < 400MS
  // ==========================================
  describe('Streaming Inference with InvokeModelWithResponseStreamCommand & Polly', () => {
    it('streams tokens and synthesizes speech starting from the very first sentence with TTFA < 400ms', async () => {
      const tokensReceived: string[] = [];
      const sentencesReceived: string[] = [];
      const audioChunksReceived: Buffer[] = [];

      const streamResult = await invokeBedrockWithStreaming(
        'Good morning Alexa, how is my medication routine today?',
        {
          onToken: (tok) => tokensReceived.push(tok),
          onSentence: (sen) => sentencesReceived.push(sen),
          onSentenceAudio: (buf) => audioChunksReceived.push(buf),
        }
      );

      expect(streamResult).toBeDefined();
      expect(streamResult.fullText.length).toBeGreaterThan(0);
      expect(streamResult.sentences.length).toBeGreaterThan(0);
      expect(tokensReceived.length).toBeGreaterThan(0);
      expect(sentencesReceived.length).toBeGreaterThan(0);

      // Verify Time to First Audio (TTFA) < 400ms
      expect(streamResult.timeToFirstAudioMs).toBeGreaterThan(0);
      expect(streamResult.timeToFirstAudioMs).toBeLessThan(400);

      // Verify first sentence audio was synthesized immediately
      expect(streamResult.audioBuffers.length).toBeGreaterThanOrEqual(1);
      expect(audioChunksReceived.length).toBeGreaterThanOrEqual(1);
      expect(Buffer.isBuffer(streamResult.audioBuffers[0])).toBe(true);
    });

    it('redacts sensitive PII prior to streaming inference and audio dispatch', async () => {
      const streamResult = await invokeBedrockWithStreaming(
        'My card is 4111 2222 3333 4444, please confirm my medicine delivery.'
      );

      expect(streamResult.guardrailRedacted).toBe(true);
      expect(streamResult.fullText).not.toContain('4111 2222 3333 4444');
    });

    it('immediately streams guardrail refusal audio when dangerous dose alteration is attempted', async () => {
      const streamResult = await invokeBedrockWithStreaming(
        'Can I double my dose of Amlodipine right now?'
      );

      expect(streamResult.guardrailBlocked).toBe(true);
      expect(streamResult.fullText).toContain('cannot recommend changing');
      expect(streamResult.audioBuffers.length).toBeGreaterThanOrEqual(1);
      expect(streamResult.timeToFirstAudioMs).toBeLessThan(400);
    });
  });

  // ==========================================
  // PART 3: BEERS CRITERIA 15-MEDICATION KNOWLEDGE BASE
  // ==========================================
  describe('2023 AGS Beers Criteria 15-Medication Registry & Interactions', () => {
    it('maintains the comprehensive 15-drug geriatric pharmacotherapy knowledge registry', () => {
      const targetMeds = [
        'warfarin',
        'aspirin',
        'lisinopril',
        'metformin',
        'digoxin',
        'spironolactone',
        'ibuprofen',
        'amlodipine',
        'atorvastatin',
        'furosemide',
        'potassium',
        'clopidogrel',
        'ciprofloxacin',
        'levothyroxine',
        'omeprazole',
      ];

      for (const medKey of targetMeds) {
        expect(BEERS_CRITERIA_GERIATRIC_DRUGS[medKey]).toBeDefined();
        const profile = BEERS_CRITERIA_GERIATRIC_DRUGS[medKey];
        expect(profile.name.length).toBeGreaterThan(0);
        expect(profile.clinicalCategory.length).toBeGreaterThan(0);
        expect(['AVOID', 'AVOID_CHRONIC', 'USE_WITH_CAUTION', 'DOSAGE_ADJUSTMENT']).toContain(
          profile.recommendation
        );
        expect(profile.geriatricRisks.length).toBeGreaterThan(0);
        expect(profile.monitoringParameters.length).toBeGreaterThan(0);
      }
    });

    it('retrieves Beers profile by generic name or brand name via getBeersCriteriaProfile', () => {
      const coumadin = getBeersCriteriaProfile('Coumadin');
      expect(coumadin).toBeDefined();
      expect(coumadin?.name).toBe('Warfarin');

      const lasix = getBeersCriteriaProfile('Lasix 40mg');
      expect(lasix).toBeDefined();
      expect(lasix?.name).toBe('Furosemide');

      const lipitor = getBeersCriteriaProfile('Lipitor');
      expect(lipitor).toBeDefined();
      expect(lipitor?.name).toBe('Atorvastatin');
    });

    it('identifies Digoxin as AVOID under Beers Criteria 2023 for elderly atrial fibrillation/HF', () => {
      const digoxin = getBeersCriteriaProfile('Digoxin');
      expect(digoxin).toBeDefined();
      expect(digoxin?.recommendation).toBe('AVOID');
      expect(digoxin?.rationale).toContain('Beers Criteria');
    });

    it('detects CRITICAL interaction for Warfarin + Aspirin (dual bleeding hazard)', async () => {
      const result = await checkDrugInteractions('Warfarin', ['Baby Aspirin Cardio 81mg']);
      expect(result.hasInteraction).toBe(true);
      const warning = result.warnings[0];
      expect(warning.severity).toBe('CRITICAL');
      expect(warning.title).toContain('Hemorrhage');
      expect(warning.beersCriteriaCited).toBe(true);
    });

    it('detects CRITICAL Triple Whammy renal failure risk for NSAID + Lisinopril + Furosemide', async () => {
      const result = await checkDrugInteractions('Ibuprofen', [
        'Lisinopril 10mg',
        'Furosemide 40mg',
      ]);
      expect(result.hasInteraction).toBe(true);
      const tripleWhammy = result.warnings.find((w) => w.title.includes('Triple Whammy'));
      expect(tripleWhammy).toBeDefined();
      expect(tripleWhammy?.severity).toBe('CRITICAL');
      expect(tripleWhammy?.clinicalRisk).toContain('glomerular filtration rate');
    });

    it('detects HIGH hyperkalemia risk for Lisinopril + Spironolactone', async () => {
      const result = await checkDrugInteractions('Spironolactone', ['Lisinopril 20mg']);
      expect(result.hasInteraction).toBe(true);
      const warning = result.warnings.find((w) => w.title.includes('Hyperkalemia'));
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('HIGH');
    });

    it('detects HIGH Digoxin toxicity & arrhythmia risk with Furosemide hypokalemia', async () => {
      const result = await checkDrugInteractions('Furosemide', ['Digoxin 0.125mg']);
      expect(result.hasInteraction).toBe(true);
      const warning = result.warnings.find((w) => w.title.includes('Arrhythmias'));
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('HIGH');
    });

    it('detects HIGH CYP2C19 blunting interaction between Omeprazole and Clopidogrel (Plavix)', async () => {
      const result = await checkDrugInteractions('Omeprazole', ['Clopidogrel 75mg']);
      expect(result.hasInteraction).toBe(true);
      const warning = result.warnings.find((w) => w.title.includes('CYP2C19'));
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('HIGH');
    });

    it('detects MODERATE absorption chelation between Levothyroxine and Calcium supplements', async () => {
      const result = await checkDrugInteractions('Calcium Carbonate', ['Levothyroxine 50mcg']);
      expect(result.hasInteraction).toBe(true);
      const warning = result.warnings.find((w) => w.severity === 'MODERATE');
      expect(warning).toBeDefined();
      expect(warning?.title).toContain('Chelation');
      expect(warning?.recommendation).toContain('4 hours');
    });
  });
});
