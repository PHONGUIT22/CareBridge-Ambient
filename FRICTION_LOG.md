# CareBridge Ambient — Developer Friction Log & Tooling Feedback

> This friction log documents real integration hurdles, developer experience (DX) gaps, and workarounds encountered while building **CareBridge Ambient** using the Amazon Devices / Alexa+ MCP architecture, AWS Bedrock Runtime SDK, and Streamable HTTP Transports.

---

## 📑 Table of Contents
1. [Friction Entry #1: AWS Bedrock Cross-Region Inference Profile Validation (ap-southeast-2)](#friction-entry-1-aws-bedrock-cross-region-inference-profile-validation-ap-southeast-2)
2. [Friction Entry #2: Streamable HTTP Transport (SSEServerTransport) Multi-Turn Session Persistence](#friction-entry-2-streamable-http-transport-sseservertransport-multi-turn-session-persistence)
3. [Friction Entry #3: Audio Feedback & Echo Loop in Smart Display Environments](#friction-entry-3-audio-feedback--echo-loop-in-smart-display-environments)
4. [Friction Entry #4: SpeechRecognition Multi-Triggering on Interim Voice Fragments](#friction-entry-4-speechrecognition-multi-triggering-on-interim-voice-fragments)
5. [Friction Entry #5: MCP Streamable HTTP DTO & Contract Alignment](#friction-entry-5-mcp-streamable-http-dto--contract-alignment)
6. [Friction Entry #6: Screen Real-Estate & Double Scrollbars on Smart Display Consoles](#friction-entry-6-screen-real-estate--double-scrollbars-on-smart-display-consoles)

---

### Friction Entry #1: AWS Bedrock Cross-Region Inference Profile Validation (ap-southeast-2)

- **Task Attempted:** Invoking the Claude Haiku 4.5 model on AWS Bedrock from Sydney region (`ap-southeast-2`) using `@aws-sdk/client-bedrock-runtime`.
- **Steps Taken:**
  1. Configured AWS SDK credentials and region `ap-southeast-2` in environment variables.
  2. Attempted to dispatch `InvokeModelCommand` using standard direct foundation model IDs (e.g., `anthropic.claude-3-haiku-20240307-v1:0`).
  3. Executed diagnostic script `scripts/test-bedrock.ts` via CLI.
- **Expected vs. Actual Result:**
  - *Expected:* Model invocation succeeds directly using standard foundation model ARN or shorthand ID.
  - *Actual:* AWS Bedrock rejected the request with `ValidationException: The provided model ID is not supported in region ap-southeast-2; cross-region system profile required.`
- **Severity Rating:** **High** (Blocks core LLM triage runtime if unhandled).
- **Workaround Used:** Updated configuration to use the explicit Australia Cross-Region Inference Profile ID: `au.anthropic.claude-haiku-4-5-20251001-v1:0`. Added automated pre-flight diagnostics in `scripts/test-bedrock.ts` to inspect IAM permissions, STS token states, and suggest valid inference profile prefixes based on region.
- **Actionable Suggestion for AWS/Amazon:** Improve Bedrock documentation and SDK exception messages. When a developer attempts to call a model in a region requiring inference profiles, the error payload should return the exact valid Regional / Cross-Region profile ID string for that region rather than a generic validation error.

---

### Friction Entry #2: Streamable HTTP Transport (SSEServerTransport) Multi-Turn Session Persistence

- **Task Attempted:** Hosting an MCP Server over Streamable HTTP (SSE) to handle Alexa+ Agent Skills tool-calling via `/sse` and `/message` endpoints.
- **Steps Taken:**
  1. Initialized `@modelcontextprotocol/sdk/server/index.js` and `SSEServerTransport`.
  2. Attached `SSEServerTransport` to Express `/sse` stream and mapped incoming POST requests to `/message?sessionId=...`.
  3. Executed simultaneous test calls from web client and agentic simulator.
- **Expected vs. Actual Result:**
  - *Expected:* SDK maintains active session states or provides built-in multi-session reconnect pooling without external session mapping.
  - *Actual:* If client drops connection or fires concurrent tool invocations without waiting for SSE stream acknowledgment, sessionId lookups fail with `404 Session not found or expired`.
- **Severity Rating:** **Medium** (Degrades voice conversational continuity if connections drop).
- **Workaround Used:** Implemented a dual-transport architecture in `backend-mcp/src/server.ts`:
  - Maintained an explicit server-side memory map `sseTransports = new Map<string, SSEServerTransport>()` to clean up stale socket references upon connection close.
  - Exposed fallback REST endpoints (`/api/dose`, `/api/today`, `/api/vitals`, `/api/advisor`) mirroring each MCP tool, allowing the web client to maintain optimistic UI state updates even during SSE transport reconnections.
- **Actionable Suggestion for Amazon MCP Team:** Provide an official, turn-key Express/FastAPI adapter in `@modelcontextprotocol/sdk` with built-in heartbeat/keep-alive management and reconnect recovery tokens for streaming HTTP transports.

---

### Friction Entry #3: Audio Feedback & Echo Loop in Smart Display Environments

- **Task Attempted:** Enabling continuous ambient voice interaction where an elderly patient speaks to Alexa and receives verbal feedback via Text-to-Speech (`speechService.speak()`).
- **Steps Taken:**
  1. Initialized Web Speech API `SpeechRecognition` listener alongside `window.speechSynthesis`.
  2. Spoke a voice query: *"Alexa, what's my medicine schedule today?"*.
- **Expected vs. Actual Result:**
  - *Expected:* Assistant answers verbally; speech recognition remains idle until the user speaks again.
  - *Actual:* The microphone immediately picked up the synthesized voice output emitted from the device speakers, re-interpreting Alexa's own speech as a new patient voice query. This launched an infinite recursive feedback loop of Bedrock LLM queries.
- **Severity Rating:** **High** (Causes runaway API token consumption, excessive audio stuttering, and confusing user experience).
- **Workaround Used:**
  - Introduced an `isBusyRef` state lock in `useAlexaAgent.ts` that flips to `true` the moment query processing starts.
  - Explicitly aborted and muted the microphone (`recognition.abort()`, `setIsListening(false)`) before invoking TTS.
  - Bound `speechSynthesisUtterance.onend` and `onerror` to release `isBusyRef = false` only after voice playback terminates, backed by a 12-second safety timeout.
- **Actionable Suggestion for AWS/Amazon:** Provide native acoustic echo-cancellation (AEC) awareness or an `onAssistantSpeechStart` / `onAssistantSpeechEnd` event hook in the ambient SDK to automatically suppress microphone intake while the device is generating audio output.

---

### Friction Entry #4: SpeechRecognition Multi-Triggering on Interim Voice Fragments

- **Task Attempted:** Capturing patient voice queries reliably without stuttering or duplicate execution.
- **Steps Taken:** Attached `recognition.onresult = (event) => processVoiceQuery(event.results[0][0].transcript)`.
- **Expected vs. Actual Result:**
  - *Expected:* Exactly one finalized voice query dispatched when the user stops speaking.
  - *Actual:* Web Speech API fired `onresult` 3 to 4 times within a single second for interim recognition chunks, creating duplicate simultaneous calls to AWS Bedrock and redundant SQLite writes.
- **Severity Rating:** **Medium-High** (Redundant network latency and race conditions in optimistic UI updates).
- **Workaround Used:** Added strict `event.results[i].isFinal` verification loop:
  ```typescript
  let finalTranscript = '';
  for (let i = event.resultIndex; i < event.results.length; ++i) {
    if (event.results[i].isFinal) {
      finalTranscript += event.results[i][0].transcript;
    }
  }
  const trimmed = finalTranscript.trim();
  if (!trimmed || isBusyRef.current) return;
  ```
- **Actionable Suggestion for Browser & SDK Vendors:** Provide a built-in `finalOnly: true` configuration option or debounced turn-end callback to eliminate the need for manual array iteration and state guards.

---

### Friction Entry #5: MCP Streamable HTTP DTO & Contract Alignment

- **Task Attempted:** Transmitting structured medical triage recommendations from backend Model Context Protocol (MCP) server to the Next.js frontend.
- **Steps Taken:** Implemented `clinicalAdvisorTool` returning JSON objects with `actionAdvice`, `clinicalExplanation`, and `urgencyLevel`.
- **Expected vs. Actual Result:**
  - *Expected:* Frontend renders rich clinical cards containing immediate action advice and rationale.
  - *Actual:* Backend response mapped properties nested under `analysis`, while the frontend TypeScript interface expected them at the root or within `richCard`. The mismatch caused the frontend to silently fall back to hardcoded mock text.
- **Severity Rating:** **Medium** (Silent degradation masked model output without surfacing clear schema validation errors).
- **Workaround Used:** Unified TypeScript interfaces across workspaces (`types/index.ts`) and implemented dual-mapping in `clinicalAdvisor.ts` supporting both root-level fields and `richCard` objects. Added automated schema verification tests.
- **Actionable Suggestion for Model Context Protocol (MCP):** Introduce end-to-end schema validation tools (e.g., Zod / JSON Schema code generation) for MCP tools to detect breaking contract mismatches between tools and client callers at build time.

---

### Friction Entry #6: Screen Real-Estate & Double Scrollbars on Smart Display Consoles

- **Task Attempted:** Presenting both a senior-facing ambient display and an agentic copilot tool stream simultaneously for hackathon judge inspection (Echo Show 10 dual-view).
- **Steps Taken:** Nested a monospace tool log container inside the secondary panel.
- **Expected vs. Actual Result:**
  - *Expected:* Clean, readable developer audit feed.
  - *Actual:* The microphone orb consumed excessive vertical space, pushing the tool stream into a 170px box with clunky nested scrollbars and overflowing JSON strings.
- **Severity Rating:** **Medium** (Degraded developer experience and visual polish during technical reviews).
- **Workaround Used:** Redesigned `AlexaAgentConsole.tsx` into a full-height Copilot chat timeline inspired by Claude & ChatGPT. Converted judge simulation buttons into horizontal scrolling chips and collapsed raw JSON payloads into inline `⚡ toolName [</> JSON]` pills with `break-all` styling.
- **Actionable Suggestion for Amazon Smart Display Developer Tools:** Release official React/Tailwind design presets for ambient multi-modal devices that include ready-to-use developer inspection sidebars and responsive split-screen containers.
