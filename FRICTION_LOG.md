# CareBridge Ambient — Developer Friction Log & Tooling Feedback

> This friction log documents real integration hurdles, developer experience (DX) gaps, and workarounds encountered while building **CareBridge Ambient** using the Amazon Devices / Alexa+ MCP architecture, AWS Bedrock Runtime SDK, and Streamable HTTP Transports.

---

## 📑 Table of Contents
1. [Friction Entry #1: AWS Bedrock Cross-Region Inference Profile Validation (ap-southeast-2)](#friction-entry-1-aws-bedrock-cross-region-inference-profile-validation-ap-southeast-2)
2. [Friction Entry #2: Streamable HTTP Transport (SSEServerTransport) Multi-Turn Session Persistence](#friction-entry-2-streamable-http-transport-sseservertransport-multi-turn-session-persistence)
3. [Friction Entry #3: Non-Deterministic Markdown Wrapping in Bedrock Structured Output](#friction-entry-3-non-deterministic-markdown-wrapping-in-bedrock-structured-output)
4. [Friction Entry #4: SQLite WAL Mode Multi-Process Lock Contention with Voice Agent Ingestion](#friction-entry-4-sqlite-wal-mode-multi-process-lock-contention-with-voice-agent-ingestion)
5. [Friction Entry #5: Audio Feedback & Echo Loop in Smart Display Environments](#friction-entry-5-audio-feedback--echo-loop-in-smart-display-environments)
6. [Friction Entry #6: SpeechRecognition Multi-Triggering on Interim Voice Fragments](#friction-entry-6-speechrecognition-multi-triggering-on-interim-voice-fragments)
7. [Friction Entry #7: MCP Streamable HTTP DTO & Contract Alignment](#friction-entry-7-mcp-streamable-http-dto--contract-alignment)
8. [Friction Entry #8: Screen Real-Estate & Double Scrollbars on Smart Display Consoles](#friction-entry-8-screen-real-estate--double-scrollbars-on-smart-display-consoles)
9. [Friction Entry #9: AWS SNS SMS Sandbox Destination Constraints & Transactional Dispatch Routing](#friction-entry-9-aws-sns-sms-sandbox-destination-constraints--transactional-dispatch-routing)
10. [Friction Entry #10: Native Claude Tool-Use Schema Mapping & Zero-Downtime Offline Fallback Resilience](#friction-entry-10-native-claude-tool-use-schema-mapping--zero-downtime-offline-fallback-resilience)
11. [Product Feedback Summary (Devpost Field Answers)](#-product-feedback-summary-devpost-field-answers)

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

### Friction Entry #3: Non-Deterministic Markdown Wrapping in Bedrock Structured Output

- **Task Attempted:** Extracting strict, parseable JSON schema payloads from AWS Bedrock Claude models to drive Alexa display rich cards (`ClinicalAdviceCard`, `PillVisualCard`).
- **Steps Taken:**
  1. Formatted system prompt with strict schema instructions: `"Respond STRICTLY in valid JSON with NO markdown codeblock markers"`.
  2. Invoked Claude Haiku with temperature set to low (0.2).
  3. Attempted `JSON.parse()` on `parsed.content[0].text`.
- **Expected vs. Actual Result:**
  - *Expected:* Bedrock outputs a clean raw JSON string `{"speechResponse": "...", ...}`.
  - *Actual:* Despite system prompts prohibiting markdown, the model occasionally wrapped output in triple backticks (```json ... ```) or prepended brief greeting conversational tokens, causing unhandled `SyntaxError: Unexpected token in JSON`.
- **Severity Rating:** **Medium** (Causes voice fallback or empty UI triage cards if parse fails).
- **Workaround Used:** Built a sanitization pipeline in `backend-mcp/src/aws/bedrockClient.ts`: applied regex to strip markdown code blocks (`cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')`) and extracted substring between first `{` and last `}` before executing `JSON.parse`. Added offline clinical DTO fallbacks to prevent crash during unexpected LLM anomalies.
- **Actionable Suggestion for AWS Bedrock Team:** Introduce native constrained JSON schema enforcement (similar to OpenAI `response_format: { type: "json_object" }` or Anthropic JSON mode) at the AWS Bedrock API level to guarantee schema compliance without developer regex workarounds.

---

### Friction Entry #4: SQLite WAL Mode Multi-Process Lock Contention with Voice Agent Ingestion

- **Task Attempted:** Simultaneous write operations across `medicines`, `intake_logs`, and `daily_vitals` when rapid voice intake and manual touch clicks occur together.
- **Steps Taken:**
  1. Configured `better-sqlite3` in Node.js backend with `journal_mode = WAL`.
  2. Triggered consecutive voice dose updates (`logDoseStatus`) while auto-seeding or updating vitals in parallel.
- **Expected vs. Actual Result:**
  - *Expected:* SQLite WAL mode allows concurrent read/write streams seamlessly without lock latency spikes.
  - *Actual:* Sub-millisecond consecutive writes without pooled transactions intermittently triggered short locking contention spikes during heavy batch logs.
- **Severity Rating:** **Low** (Transient database busy warning).
- **Workaround Used:** Grouped multi-row generation into atomic SQLite transactions (`db.transaction(...)`) in `logRepo.ts` and `seedDemoData.ts`, enabled `PRAGMA synchronous = NORMAL`, and added an optimistic UI rollback pattern on the frontend (`useMedicines.ts`) so users never experience UI freezing.
- **Actionable Suggestion for Amazon App Dev Documentation:** Include clear recommended practices for local state management (WAL configuration, defensive schema column migrations, and transactional batching) in Edge/Device developer guides for appliances running local persistence.

---

### Friction Entry #5: Audio Feedback & Echo Loop in Smart Display Environments

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

### Friction Entry #6: SpeechRecognition Multi-Triggering on Interim Voice Fragments

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

### Friction Entry #7: MCP Streamable HTTP DTO & Contract Alignment

- **Task Attempted:** Transmitting structured medical triage recommendations from backend Model Context Protocol (MCP) server to the Next.js frontend.
- **Steps Taken:** Implemented `clinicalAdvisorTool` returning JSON objects with `actionAdvice`, `clinicalExplanation`, and `urgencyLevel`.
- **Expected vs. Actual Result:**
  - *Expected:* Frontend renders rich clinical cards containing immediate action advice and rationale.
  - *Actual:* Backend response mapped properties nested under `analysis`, while the frontend TypeScript interface expected them at the root or within `richCard`. The mismatch caused the frontend to silently fall back to hardcoded mock text.
- **Severity Rating:** **Medium** (Silent degradation masked model output without surfacing clear schema validation errors).
- **Workaround Used:** Unified TypeScript interfaces across workspaces (`types/index.ts`) and implemented dual-mapping in `clinicalAdvisor.ts` supporting both root-level fields and `richCard` objects. Added automated schema verification tests.
- **Actionable Suggestion for Model Context Protocol (MCP):** Introduce end-to-end schema validation tools (e.g., Zod / JSON Schema code generation) for MCP tools to detect breaking contract mismatches between tools and client callers at build time.

---

### Friction Entry #8: Screen Real-Estate & Double Scrollbars on Smart Display Consoles

- **Task Attempted:** Presenting both a senior-facing ambient display and an agentic copilot tool stream simultaneously for hackathon judge inspection (Echo Show 10 dual-view).
- **Steps Taken:** Nested a monospace tool log container inside the secondary panel.
- **Expected vs. Actual Result:**
  - *Expected:* Clean, readable developer audit feed.
  - *Actual:* The microphone orb consumed excessive vertical space, pushing the tool stream into a 170px box with clunky nested scrollbars and overflowing JSON strings.
- **Severity Rating:** **Medium** (Degraded developer experience and visual polish during technical reviews).
- **Workaround Used:** Redesigned `AlexaAgentConsole.tsx` into a full-height Copilot chat timeline inspired by Claude & ChatGPT. Converted judge simulation buttons into horizontal scrolling chips and collapsed raw JSON payloads into inline `⚡ toolName [</> JSON]` pills with `break-all` styling.
- **Actionable Suggestion for Amazon Smart Display Developer Tools:** Release official React/Tailwind design presets for ambient multi-modal devices that include ready-to-use developer inspection sidebars and responsive split-screen containers.

---

### Friction Entry #9: AWS SNS SMS Sandbox Destination Constraints & Transactional Dispatch Routing

- **Task Attempted:** Dispatching real-time urgent SMS notifications via `@aws-sdk/client-sns` (`PublishCommand`) to a designated caregiver when Claude Bedrock evaluates a patient's symptoms as `HIGH` or `EMERGENCY` (e.g. crushing chest pain).
- **Steps Taken:**
  1. Integrated `@aws-sdk/client-sns` into `backend-mcp`.
  2. Set `MessageAttributes` with `AWS.SNS.SMS.SMSType = 'Transactional'` and sender ID `CareBridge` to ensure immediate SMS delivery.
  3. Tested sending SMS alerts to evaluation phone numbers.
- **Expected vs. Actual Result:**
  - *Expected:* SMS delivered universally to any mobile phone number without prior manual account verification.
  - *Actual:* AWS SNS accounts operate by default in the **SMS Sandbox**, which strictly rejects `PublishCommand` to unverified numbers with `AuthorizationError` or `OptInRequiredException`. Hackathon judges running test accounts would face unhandled SMS failures without warning.
- **Severity Rating:** **High** (Could fail triage demo silently in evaluation environments without verified caller IDs).
- **Workaround Used:**
  - Implemented an intelligent SNS wrapper `sendEmergencySMS()` in `backend-mcp/src/aws/snsClient.ts`:
  - When real AWS credentials and verified phone numbers are present, it sends an authentic `Transactional` SMS with `AWS.SNS.SMS.SenderID: 'CareBridge'`.
  - If AWS credentials fail or phone number is in sandbox mode, it seamlessly traps the exception, switches to `simulated: true` mode, logs telemetry, generates a realistic mock Message ID (`sns-sim-...`), and returns full delivery metadata.
  - On the frontend (`ClinicalAdviceCard.tsx` and `page.tsx`), a status banner distinguishes between `AWS SNS Live` vs `AWS Sandbox` mode, guaranteeing an uninterrupted evaluation flow.
- **Actionable Suggestion for AWS SNS Team:** Provide a zero-config Developer Sandbox API flag or Test Simulator phone number range (similar to Stripe test card numbers or Twilio magic numbers) that enables end-to-end integration testing and hackathon demo verification without submitting telecom regulatory paperwork for phone verification.

---

### Friction Entry #10: Native Claude Tool-Use Schema Mapping & Zero-Downtime Offline Fallback Resilience

- **Task Attempted:** Upgrading CareBridge's agentic loop from hardcoded pattern matching to AWS Bedrock Native Claude 3.5 Sonnet / Haiku 4.5 Tool Use (`anthropic_version: "bedrock-2023-05-31"`, `tools: [...]`, `tool_choice: { type: "auto" }`) to allow the LLM to autonomously select and execute 1 of 5 core MCP tools (`getTodaySchedule`, `logDoseStatus`, `recordVitals`, `clinicalAdvisor`, `orderRefill`).
- **Steps Taken:**
  1. Defined strict JSON schemas conforming to Anthropic's tool format inside `backend-mcp/src/aws/bedrockClient.ts`.
  2. Dispatched payloads with `InvokeModelCommand` passing `tools` array and `tool_choice: { type: "auto" }`.
  3. Tested edge cases: AWS credentials present vs. missing, network latency spikes, tool execution failures, and dual stop reasons (`tool_use` vs `end_turn`).
- **Expected vs. Actual Result:**
  - *Expected:* Bedrock cleanly parses function schemas and returns structured tool calls across all AWS regions with straightforward error handling.
  - *Actual:* Three critical DX hurdles emerged:
    1. **Dual Stop Reason Handling:** Claude may stop with `stop_reason === 'tool_use'` (where tool arguments reside inside a content block of type `tool_use`) or `stop_reason === 'end_turn'` (conversational text block). If an agent loop assumes tool calls are always emitted in a single schema format, runtime parsing errors happen.
    2. **Region-Specific Profile Inconsistencies:** Not all Bedrock regions support Claude 3.5 Sonnet tool-use directly without specific cross-region inference profiles, leading to unhandled `400 ValidationException: The provided model ID is not supported` if static ARNs are hardcoded.
    3. **Ambient Device Reliability & Offline Fragility:** In an ambient healthcare device setting (e.g. Echo Show 10 in a senior's home), cloud connection drops or AWS token expirations must never render the medication schedule unreachable or crash the server process.
- **Severity Rating:** **High** (Vital for production-grade agentic autonomy and life-critical patient safety).
- **Workaround Used:**
  - Architected `backend-mcp/src/tools/agentTurnHandler.ts` with a resilient dual-branch engine:
    - **Cloud Agentic Branch:** Seamlessly handles both `tool_use` blocks (executing the MCP tool on SQLite WAL and synthesizing speech via Polly) and pure `text` conversational replies.
    - **Deterministic Offline Heuristic Branch:** If Bedrock throws any error (`UnrecognizedClientException`, invalid credentials, network timeout), the engine intercepts it gracefully without crashing, falling back to a deterministic regex/keyword heuristic parser (`resolveOfflineHeuristic`), marking `offlineFallbackUsed: true`, and fulfilling the user's intent.
  - Added visual transparency to `AlexaAgentConsole.tsx`: An audit pill displaying `🧠 Claude Reasoned Tool: [toolName] (XXms)` in cloud mode or `⚡ Offline Heuristic Fallback` in offline mode.
- **Actionable Suggestion for AWS Bedrock & Alexa Teams:** Provide an official high-level `@aws-sdk/bedrock-agentic-runtime` wrapper for Node.js / TypeScript that abstracts message formatting, handles automatic fallback retry loops, and standardizes error payloads when tool schemas are rejected.

---

## 🏆 Product Feedback Summary (Devpost Field Answers)

> Direct answers formatted for hackathon submission questionnaires covering SDK evaluations, developer experience, and future architecture.

| Submission Question | Evaluative Feedback |
| :--- | :--- |
| **Tools & SDKs Used** | `@modelcontextprotocol/sdk`, `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-polly`, `@aws-sdk/client-sns`, `better-sqlite3`, `Next.js 15`, `Web Speech API`. |
| **What Worked Well** | The MCP specification provides a clean, language-agnostic interface for AI agents to query device state and trigger operations. AWS Bedrock Claude Haiku 4.5 delivers rapid sub-500ms clinical triage analysis, seamlessly paired with AWS Polly Neural engine (`Ruth`) for warm, natural senior voice synthesis, and AWS SNS Transactional SMS for instantaneous emergency family dispatch. |
| **What Needs Work** | Better tooling for debugging Streamable HTTP SSE connections, cross-region model ID discoverability in Bedrock, and native structured JSON mode on Bedrock runtime endpoints. |
| **Onboarding Experience** | Setup was straightforward, but bridging MCP SSE transport with standard HTTP clients required significant boilerplate session management code. |
| **Would You Build With These Tools Again?** | **Yes.** The combination of ambient voice control, tool-calling agents via MCP, and responsive local state offers the most natural interface model for geriatric healthcare computing. |
