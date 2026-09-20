import { invokeBedrockWithTools } from '../aws/bedrockClient.js';
import { getTodayScheduleTool } from './getTodaySchedule.js';
import { logDoseStatusTool } from './logDoseStatus.js';
import { recordVitalsTool } from './recordVitals.js';
import { clinicalAdvisorTool } from './clinicalAdvisor.js';
import { orderRefillTool } from './orderRefill.js';

export interface AgentTurnRequest {
  query: string;
  context?: {
    currentMeds?: string[];
    recentVitals?: string;
  };
}

export interface AgentTurnResponse {
  success: boolean;
  toolName: string | null;
  toolArgs: Record<string, any> | null;
  toolResult: any | null;
  speechResponse: string;
  offlineFallbackUsed?: boolean;
}

/**
 * Bộ Heuristic Fallback Offline:
 * Tự động phân tích ý định (intent) từ giọng nói/câu hỏi người bệnh
 * khi thiết bị chạy offline hoặc AWS Bedrock không khả dụng.
 */
function resolveOfflineHeuristic(query: string): {
  toolName: string;
  toolArgs: Record<string, any>;
} | null {
  const lower = query.toLowerCase();

  // 1. Ý định Xem lịch uống thuốc trong ngày (getTodaySchedule) - Ưu tiên hàng đầu nếu có từ khóa schedule/lịch
  const isScheduleIntent =
    lower.includes('schedule') ||
    lower.includes('what pill') ||
    lower.includes('what medicine') ||
    lower.includes('upcoming') ||
    lower.includes('next dose') ||
    lower.includes('calendar') ||
    lower.includes('lịch') ||
    lower.includes('kế hoạch') ||
    (lower.includes('today') && !lower.includes('took') && !lower.includes('taken') && !lower.includes('skip'));

  if (isScheduleIntent) {
    return {
      toolName: 'getTodaySchedule',
      toolArgs: {},
    };
  }

  // 2. Ý định Ghi nhận Uống thuốc / Bỏ cữ (logDoseStatus)
  const isDoseIntent =
    lower.includes('took') ||
    lower.includes('taken') ||
    lower.includes('had my') ||
    lower.includes('drank') ||
    lower.includes('swallowed') ||
    lower.includes('uống') ||
    lower.includes('đã uống') ||
    lower.includes('skip') ||
    lower.includes('skipped') ||
    lower.includes('bỏ qua') ||
    lower.includes('morning pills') ||
    lower.includes('morning pill') ||
    lower.includes('evening pills') ||
    ((lower.includes('take') || lower.includes('log') || lower.includes('mark')) &&
      (lower.includes('pill') || lower.includes('dose') || lower.includes('medication') || lower.includes('medicine') || lower.includes('amlodipine') || lower.includes('atorvastatin') || lower.includes('metformin') || lower.includes('aspirin')));

  if (isDoseIntent) {
    const status: 'taken' | 'skipped' =
      lower.includes('skip') || lower.includes('bỏ') ? 'skipped' : 'taken';

    let medicineName: string | undefined = undefined;
    if (lower.includes('amlodipine') || lower.includes('norvasc')) {
      medicineName = 'Amlodipine';
    } else if (lower.includes('atorvastatin') || lower.includes('lipitor')) {
      medicineName = 'Atorvastatin';
    } else if (lower.includes('metformin')) {
      medicineName = 'Metformin';
    } else if (lower.includes('aspirin')) {
      medicineName = 'Aspirin';
    } else if (lower.includes('morning')) {
      medicineName = 'Amlodipine';
    }

    return {
      toolName: 'logDoseStatus',
      toolArgs: {
        medicineName: medicineName || 'Amlodipine',
        status,
      },
    };
  }

  // 2. Ý định Đặt thuốc bổ sung qua Amazon Pharmacy (orderRefill)
  const isRefillIntent =
    lower.includes('refill') ||
    lower.includes('reorder') ||
    lower.includes('re-order') ||
    lower.includes('order') ||
    lower.includes('buy') ||
    lower.includes('out of') ||
    lower.includes('running low') ||
    lower.includes('mua thuốc') ||
    lower.includes('đặt thuốc') ||
    lower.includes('hết thuốc');

  if (isRefillIntent) {
    let medicineName = 'Atorvastatin';
    if (lower.includes('amlodipine')) medicineName = 'Amlodipine';
    else if (lower.includes('metformin')) medicineName = 'Metformin';
    else if (lower.includes('aspirin')) medicineName = 'Aspirin';
    else if (lower.includes('atorvastatin') || lower.includes('lipitor')) medicineName = 'Atorvastatin';

    return {
      toolName: 'orderRefill',
      toolArgs: {
        medicineName,
        quantity: 30,
      },
    };
  }

  // 3. Ý định Ghi nhận Chỉ số Sinh tồn (recordVitals)
  const isVitalsIntent =
    lower.includes('blood pressure') ||
    lower.includes('bp') ||
    lower.includes('systolic') ||
    lower.includes('diastolic') ||
    lower.includes('heart rate') ||
    lower.includes('pulse') ||
    lower.includes('blood sugar') ||
    lower.includes('glucose') ||
    lower.includes('huyết áp') ||
    lower.includes('đường huyết') ||
    lower.includes('nhịp tim');

  if (isVitalsIntent) {
    const args: Record<string, any> = {};

    // Tìm huyết áp (e.g. "120/80" hoặc "120 over 80")
    const bpMatch = query.match(/(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/i);
    if (bpMatch) {
      args.systolic = parseInt(bpMatch[1], 10);
      args.diastolic = parseInt(bpMatch[2], 10);
    }

    // Tìm đường huyết (e.g. "blood sugar 105" hoặc "sugar is 110")
    const sugarMatch = query.match(/(?:sugar|glucose|đường huyết)(?:\s*(?:is|là|:))?\s*(\d{2,3})/i);
    if (sugarMatch) {
      args.bloodSugar = parseInt(sugarMatch[1], 10);
    }

    // Tìm nhịp tim (e.g. "heart rate 72" hoặc "pulse 75")
    const hrMatch = query.match(/(?:pulse|heart rate|nhịp tim)(?:\s*(?:is|là|:))?\s*(\d{2,3})/i);
    if (hrMatch) {
      args.heartRate = parseInt(hrMatch[1], 10);
    }

    // Nếu không trích xuất được số cụ thể, dùng giá trị mặc định ổn định
    if (Object.keys(args).length === 0) {
      args.systolic = 120;
      args.diastolic = 80;
    }

    return {
      toolName: 'recordVitals',
      toolArgs: args,
    };
  }

  // 4. Ý định Triệu chứng lâm sàng hoặc thắc mắc sức khỏe (clinicalAdvisor)
  const isClinicalIntent =
    lower.includes('dizzy') ||
    lower.includes('dizziness') ||
    lower.includes('pain') ||
    lower.includes('hurt') ||
    lower.includes('ache') ||
    lower.includes('chest pain') ||
    lower.includes('shortness of breath') ||
    lower.includes('fall') ||
    lower.includes('headache') ||
    lower.includes('nausea') ||
    lower.includes('chóng mặt') ||
    lower.includes('đau') ||
    lower.includes('mệt') ||
    lower.includes('khó thở') ||
    lower.includes('buồn nôn') ||
    lower.includes('feel');

  if (isClinicalIntent) {
    return {
      toolName: 'clinicalAdvisor',
      toolArgs: { query },
    };
  }


  return null;
}

/**
 * Thực thi MCP Tool được chọn trên SQLite Database
 */
async function executeTool(toolName: string, toolArgs: Record<string, any>): Promise<{
  toolResult: any;
  speechResponse: string;
}> {
  let toolResult: any = null;
  let speechResponse = '';

  switch (toolName) {
    case 'getTodaySchedule': {
      toolResult = await getTodayScheduleTool.handler(toolArgs as any);
      speechResponse = toolResult.speechSummary || 'Here is your daily medication schedule.';
      break;
    }
    case 'logDoseStatus': {
      toolResult = await logDoseStatusTool.handler(toolArgs as any);
      speechResponse =
        toolResult.speechText ||
        `I have recorded your ${toolArgs.medicineName || 'medication'} as ${toolArgs.status || 'taken'}.`;
      break;
    }
    case 'recordVitals': {
      toolResult = await recordVitalsTool.handler(toolArgs as any);
      speechResponse = toolResult.speechText || 'I have recorded your vital signs.';
      break;
    }
    case 'clinicalAdvisor': {
      toolResult = await clinicalAdvisorTool.handler(toolArgs as any);
      speechResponse = toolResult.speechResponse || 'I have noted your symptoms. Please rest and stay hydrated.';
      break;
    }
    case 'orderRefill': {
      toolResult = await orderRefillTool.handler(toolArgs as any);
      speechResponse = toolResult.speechText || 'Your Amazon Pharmacy refill order has been placed.';
      break;
    }
    default:
      throw new Error(`MCP Tool '${toolName}' không được hỗ trợ trong hệ thống.`);
  }

  return { toolResult, speechResponse };
}

/**
 * Điểm vào chính xử lý lượt tương tác thoại (Voice Turn Orchestrator)
 */
export async function handleAgentTurn(req: AgentTurnRequest): Promise<AgentTurnResponse> {
  const { query, context } = req;
  const trimmedQuery = query.trim();

  // 1. Thử gọi Bedrock Claude Haiku 4.5 Native Tool-Use
  let decision = await invokeBedrockWithTools(trimmedQuery, context);

  // 2. Nếu Bedrock trả về stop_reason === 'tool_use' có toolCall
  if (decision && decision.toolCall) {
    const { name: toolName, input: toolArgs } = decision.toolCall;

    try {
      const { toolResult, speechResponse } = await executeTool(toolName, toolArgs);

      return {
        success: true,
        toolName,
        toolArgs,
        toolResult,
        speechResponse: decision.textResponse || speechResponse,
        offlineFallbackUsed: false,
      };
    } catch (toolExecErr: any) {
      console.warn(`[agentTurnHandler] Lỗi thực thi tool '${toolName}':`, toolExecErr.message);
    }
  }

  // 3. Nếu Claude phản hồi bằng văn bản thuần (type: 'text') và không gọi tool nào
  if (decision && decision.textResponse && !decision.toolCall) {
    return {
      success: true,
      toolName: null,
      toolArgs: null,
      toolResult: null,
      speechResponse: decision.textResponse,
      offlineFallbackUsed: false,
    };
  }

  // 4. Nếu không có AWS Credentials, lỗi mạng hoặc Claude không quyết định được -> Kích hoạt Heuristic Fallback
  console.info('[agentTurnHandler] Kích hoạt Offline Heuristic Fallback cho câu lệnh:', trimmedQuery);
  const heuristic = resolveOfflineHeuristic(trimmedQuery);

  if (heuristic) {
    const { toolResult, speechResponse } = await executeTool(
      heuristic.toolName,
      heuristic.toolArgs
    );

    return {
      success: true,
      toolName: heuristic.toolName,
      toolArgs: heuristic.toolArgs,
      toolResult,
      speechResponse,
      offlineFallbackUsed: true,
    };
  }

  // 5. Câu lệnh giao tiếp thông thường khi offline
  return {
    success: true,
    toolName: null,
    toolArgs: null,
    toolResult: null,
    speechResponse: 'I am here with you Eleanor. You can tell me when you take your pills, or check your schedule.',
    offlineFallbackUsed: true,
  };
}
