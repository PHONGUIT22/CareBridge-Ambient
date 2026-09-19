import { PollyClient, SynthesizeSpeechCommand, SynthesizeSpeechCommandInput } from '@aws-sdk/client-polly';
import '../config/env.js';

/**
 * AWS Polly Client Service for CareBridge Ambient
 * Provides high-fidelity Neural speech synthesis for Amazon Alexa / Echo Show smart displays.
 */

const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();
const region = process.env.AWS_REGION || 'ap-southeast-2';

const hasRealCredentials =
  Boolean(accessKeyId) &&
  Boolean(secretAccessKey) &&
  secretAccessKey !== 'PASTE_YOUR_SECRET_KEY_HERE' &&
  !(secretAccessKey && secretAccessKey.includes('PASTE_'));

let pollyClientInstance: PollyClient | null = null;

function getPollyClient(): PollyClient | null {
  if (!hasRealCredentials || !accessKeyId || !secretAccessKey) {
    return null;
  }

  if (!pollyClientInstance) {
    pollyClientInstance = new PollyClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      },
    });
  }

  return pollyClientInstance;
}

/**
 * Utility to convert an incoming stream or byte array from AWS SDK into a Node.js Buffer
 */
async function streamToBuffer(stream: any): Promise<Buffer> {
  if (!stream) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(stream)) {
    return stream;
  }
  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }
  if (typeof stream.transformToByteArray === 'function') {
    const bytes = await stream.transformToByteArray();
    return Buffer.from(bytes);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Synthesizes text to speech using AWS Polly Neural Engine.
 * 
 * @param text The text string to read aloud.
 * @param voiceId The Polly voice ID (e.g. 'Ruth', 'Matthew', 'Danielle', 'Amy'). Defaults to 'Ruth'.
 * @returns Promise<Buffer | null> Returns MP3 buffer if successful, or null on fallback/error.
 */
export async function synthesizeSpeech(
  text: string,
  voiceId: string = 'Ruth'
): Promise<Buffer | null> {
  const client = getPollyClient();

  if (!client) {
    console.log(
      `[Polly Info] AWS credentials not configured or placeholder detected. Falling back to browser speech synthesis.`
    );
    return null;
  }

  const cleanText = text.trim();
  if (!cleanText) {
    return null;
  }

  try {
    console.log(`[Polly Invocation] Synthesizing speech via Neural engine. Voice: ${voiceId}, Region: ${region}`);

    const params: SynthesizeSpeechCommandInput = {
      OutputFormat: 'mp3',
      Text: cleanText,
      VoiceId: (voiceId || 'Ruth') as any,
      Engine: 'neural',
    };

    const command = new SynthesizeSpeechCommand(params);
    const response = await client.send(command);

    if (!response.AudioStream) {
      console.warn(`[Polly Warning] No AudioStream received from AWS Polly.`);
      return null;
    }

    const audioBuffer = await streamToBuffer(response.AudioStream);
    console.log(`[Polly Success] Synthesized ${audioBuffer.length} bytes of MP3 audio.`);
    return audioBuffer;
  } catch (err: any) {
    console.warn(`[Polly Warning] Failed to synthesize speech via AWS Polly:`);
    console.warn(`  Error Name: ${err?.name || 'UnknownError'}`);
    console.warn(`  Error Message: ${err?.message || String(err)}`);
    console.warn(`  HTTP Status: ${err?.$metadata?.httpStatusCode ?? 'N/A'}`);
    console.warn(`[Polly Fallback] Falling back gracefully to browser SpeechSynthesis.`);
    return null;
  }
}
