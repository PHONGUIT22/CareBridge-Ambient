import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// 1. Nạp biến môi trường đa tầng an toàn cho ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnvPath = path.resolve(__dirname, '../.env');
const backendEnvPath = path.resolve(__dirname, '../backend-mcp/.env');
const cwdEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });
if (fs.existsSync(backendEnvPath)) dotenv.config({ path: backendEnvPath, override: true });
if (fs.existsSync(cwdEnvPath)) dotenv.config({ path: cwdEnvPath, override: true });

const region = process.env.AWS_REGION || 'ap-southeast-2';
const modelId =
  process.env.BEDROCK_MODEL_ID || 'au.anthropic.claude-haiku-4-5-20251001-v1:0';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

console.log(`
=====================================================
  CAREBRIDGE AMBIENT - AWS BEDROCK CLI DIAGNOSTIC
=====================================================
• Target AWS Region:    ${region}
• Target Bedrock Model: ${modelId}
• AWS Access Key ID:    ${accessKeyId ? accessKeyId.substring(0, 4) + '****' + accessKeyId.slice(-4) : 'MISSING'}
• Secret Key Present:   ${Boolean(secretAccessKey && !secretAccessKey.includes('PASTE_'))}
• Session Token:        ${sessionToken ? 'Present (Temporary STS / Learner Lab)' : 'None'}
=====================================================
`);

if (!accessKeyId || !secretAccessKey || secretAccessKey.includes('PASTE_')) {
  console.error(`[Pre-Flight Error] AWS Credentials are missing or still placeholder in .env!`);
  console.error(`Please update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env before running.`);
  process.exit(1);
}

// 2. Khởi tạo Bedrock Runtime Client
const client = new BedrockRuntimeClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
    ...(sessionToken ? { sessionToken } : {}),
  },
});

// 3. Chuẩn bị payload kiểm tra
const testPrompt = 'Respond in JSON: {"status": "ok", "message": "Bedrock connected"}';
const payload = {
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 150,
  temperature: 0.1,
  messages: [
    {
      role: 'user',
      content: testPrompt,
    },
  ],
};

async function runBedrockDiagnostic() {
  console.log(`[Diagnostic] Sending test prompt to AWS Bedrock runtime...`);
  console.log(`[Prompt Content] "${testPrompt}"\n`);
  const startTime = performance.now();

  try {
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const latency = Math.round(performance.now() - startTime);

    const jsonStr = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(jsonStr);
    const textOutput = parsed.content?.[0]?.text || '';

    console.log(`-----------------------------------------------------`);
    console.log(`>>> [SUCCESS] Bedrock Model Invocation Succeeded! <<<`);
    console.log(`-----------------------------------------------------`);
    console.log(`• HTTP Status Code: ${response.$metadata.httpStatusCode}`);
    console.log(`• Roundtrip Latency: ${latency}ms`);
    console.log(`• Raw Model Output:`);
    console.log(textOutput);
    console.log(`\n• Usage Metrics:`, parsed.usage || 'N/A');
    console.log(`=====================================================\n`);
  } catch (error: any) {
    const latency = Math.round(performance.now() - startTime);
    console.error(`-----------------------------------------------------`);
    console.error(`>>> [FAILED] AWS Bedrock Invocation Failed! <<<`);
    console.error(`-----------------------------------------------------`);
    console.error(`• Latency to Error:     ${latency}ms`);
    console.error(`• Specific Error Name:  ${error.name || 'UnknownException'}`);
    console.error(`• Error Message:        ${error.message}`);
    console.error(`• HTTP Status Code:     ${error.$metadata?.httpStatusCode ?? 'N/A'}`);
    console.error(`• AWS Request ID:       ${error.$metadata?.requestId ?? 'N/A'}`);

    console.error(`\n[Diagnostic Guidance]:`);
    switch (error.name) {
      case 'AccessDeniedException':
        console.error(
          `  -> Permission Denied. Verify that the IAM user has 'bedrock:InvokeModel' allowed for model ARN: arn:aws:bedrock:${region}::foundation-model/${modelId}`
        );
        break;
      case 'ValidationException':
        console.error(
          `  -> Validation Error. In Sydney (ap-southeast-2), Anthropic models require the cross-region inference profile ID: 'au.anthropic.claude-haiku-4-5-20251001-v1:0'.`
        );
        break;
      case 'ResourceNotFoundException':
        console.error(
          `  -> Model Not Found. Model ID '${modelId}' may not be activated in AWS Bedrock Model Access for region '${region}'.`
        );
        break;
      case 'UnrecognizedClientException':
        console.error(
          `  -> Invalid Access Key. The AWS_ACCESS_KEY_ID provided is not recognized by AWS.`
        );
        break;
      case 'ExpiredTokenException':
        console.error(
          `  -> Expired Session Token. If using AWS Learner Lab or STS temporary credentials, please refresh AWS_SESSION_TOKEN.`
        );
        break;
      case 'ThrottlingException':
        console.error(
          `  -> Rate Limited. Request rate exceeded Bedrock service quotas for this model.`
        );
        break;
      default:
        console.error(`  -> Check network connectivity and credentials.`);
        break;
    }
    console.error(`=====================================================\n`);
    process.exit(1);
  }
}

runBedrockDiagnostic();
