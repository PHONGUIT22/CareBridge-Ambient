import './config/env.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Cấu hình nạp biến môi trường chuẩn xác đa tầng cho ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}

// Khởi tạo Database và Seeder
import { initDB } from './database/db.js';
import { seedDemoData } from './database/seedDemoData.js';
import { MedicineRepo } from './database/medicineRepo.js';
import { LogRepo } from './database/logRepo.js';
import { VitalsRepo } from './database/vitalsRepo.js';
import { CaregiverRepo } from './database/caregiverRepo.js';

// Nạp 4 MCP Tools cốt lõi
import { getTodayScheduleTool } from './tools/getTodaySchedule.js';
import { logDoseStatusTool } from './tools/logDoseStatus.js';
import { recordVitalsTool } from './tools/recordVitals.js';
import { clinicalAdvisorTool } from './tools/clinicalAdvisor.js';
import { synthesizeSpeech } from './aws/pollyClient.js';

const app = express();
const PORT = Number(process.env.MCP_PORT || process.env.PORT) || 3001;

// Cho phép Web Next.js (port 3000) gọi API
app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. KHỞI TẠO CƠ SỞ DỮ LIỆU & SEED DEMO NẾU MỚI BẮT ĐẦU
initDB();
seedDemoData(false);

// ==========================================
// 2. THIẾT LẬP MCP SERVER (Chuẩn spec 2025-11-25)
// ==========================================
const mcpServer = new Server(
  {
    name: 'carebridge-ambient-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Danh sách tất cả các tools sẵn sàng phục vụ Alexa+
const registeredTools = [
  getTodayScheduleTool,
  logDoseStatusTool,
  recordVitalsTool,
  clinicalAdvisorTool,
];

// Định nghĩa handler khi Alexa/Agent hỏi danh sách Tool
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: registeredTools.map((t) => t.definition),
  };
});

// Định nghĩa handler khi Alexa/Agent thực thi 1 Tool
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: toolArgs } = request.params;

  try {
    switch (name) {
      case 'getTodaySchedule': {
        const result = await getTodayScheduleTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'logDoseStatus': {
        const result = await logDoseStatusTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'recordVitals': {
        const result = await recordVitalsTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'clinicalAdvisor': {
        const result = await clinicalAdvisorTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`MCP Tool '${name}' không tồn tại.`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Lỗi thực thi tool '${name}': ${error.message}` }],
    };
  }
});

// ==========================================
// 3. STREAMABLE HTTP TRANSPORT (SSE cho Alexa+)
// ==========================================
const sseTransports = new Map<string, SSEServerTransport>();

// Endpoint bắt đầu stream Server-Sent Events
app.get('/sse', async (req: Request, res: Response) => {
  console.log('[MCP] Kết nối client mới qua SSE Stream...');
  const transport = new SSEServerTransport('/message', res);
  sseTransports.set(transport.sessionId, transport);

  req.on('close', () => {
    console.log(`[MCP] Đóng kết nối SSE session: ${transport.sessionId}`);
    sseTransports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

// Endpoint nhận message POST từ Alexa+ Client
app.post('/message', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: 'Session MCP không tồn tại hoặc đã hết hạn.' });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// ==========================================
// 4. CÁC REST API PHỤC VỤ WEB NEXT.JS FRONTEND
// ==========================================

// Lấy toàn bộ dữ liệu trang chính (Lịch hôm nay + Chỉ số sinh tồn + Người chăm sóc)
app.get('/api/today', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [schedule, vitals, caregiver] = await Promise.all([
      LogRepo.getLogsByDate(today),
      VitalsRepo.getVitalsByDate(today),
      CaregiverRepo.getCaregiver(),
    ]);

    const total = schedule.length;
    const taken = schedule.filter((s) => s.status === 'taken').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    res.json({
      success: true,
      date: today,
      adherenceRate,
      schedule,
      vitals,
      caregiver,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bấm nút "I Took My Pill" đổi trạng thái trực tiếp
app.post('/api/toggle', async (req: Request, res: Response) => {
  try {
    const { logId, currentStatus } = req.body;
    if (!logId) {
      res.status(400).json({ success: false, error: 'Thiếu logId.' });
      return;
    }

    await LogRepo.toggleLogStatus(logId, currentStatus);
    res.json({ success: true, message: 'Cập nhật trạng thái uống thuốc thành công.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ghi nhận hoặc cập nhật cữ thuốc (phục vụ Alexa, voice, hoặc direct update)
app.post('/api/dose', async (req: Request, res: Response) => {
  try {
    const result = await logDoseStatusTool.handler(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cập nhật ghi chú lâm sàng cho một cữ thuốc
app.post('/api/note', async (req: Request, res: Response) => {
  try {
    const { logId, notes } = req.body;
    if (!logId) {
      res.status(400).json({ success: false, error: 'Thiếu logId.' });
      return;
    }
    await LogRepo.updateLogNotes(logId, notes || '');
    res.json({ success: true, message: 'Đã lưu ghi chú lâm sàng thành công.', logId, notes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ghi nhanh chỉ số sinh tồn từ thanh QuickVitalsBar
app.post('/api/vitals', async (req: Request, res: Response) => {
  try {
    const result = await recordVitalsTool.handler(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lấy toàn bộ lịch sử 30 ngày cho ma trận punch-card & báo cáo bác sĩ
app.get('/api/history', async (req: Request, res: Response) => {
  try {
    const [logs, vitals] = await Promise.all([
      LogRepo.getAllLogs(),
      VitalsRepo.getAllVitals(),
    ]);
    res.json({ success: true, logs, vitals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Danh mục tất cả thuốc và tồn kho
app.get('/api/medicines', async (req: Request, res: Response) => {
  try {
    const medicines = await MedicineRepo.getAllMedicines();
    res.json({ success: true, medicines });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Thêm thuốc mới vào danh mục
app.post('/api/medicines', async (req: Request, res: Response) => {
  try {
    const { name, dosage, reminderTimes, daysOfWeek, stockCount, imageUri, type } = req.body;
    if (!name || !dosage) {
      res.status(400).json({ success: false, error: 'Tên thuốc và liều dùng là bắt buộc.' });
      return;
    }
    const id = await MedicineRepo.addMedicine({
      name,
      dosage,
      reminderTimes: reminderTimes || ['08:00'],
      daysOfWeek: daysOfWeek || ['ALL'],
      stockCount: stockCount !== undefined ? Number(stockCount) : 30,
      imageUri,
      type: type || 'medication',
    });
    const todayStr = new Date().toISOString().split('T')[0];
    await LogRepo.generateLogsForDate(todayStr);
    res.json({ success: true, id, message: 'Đã thêm thuốc mới thành công.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Xóa thuốc khỏi danh mục
app.delete('/api/medicines/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, error: 'Thiếu id thuốc.' });
      return;
    }
    await MedicineRepo.deleteMedicine(id);
    res.json({ success: true, message: 'Đã xóa thuốc thành công.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint cho khung AlexaAgentConsole gửi giọng nói/text kiểm tra Bedrock
app.post('/api/advisor', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ success: false, error: 'Thiếu câu hỏi (query).' });
      return;
    }
    const result = await clinicalAdvisorTool.handler({ query });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint tổng hợp giọng nói AWS Polly Neural TTS cho Alexa & Echo Show Smart Displays
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Thiếu nội dung văn bản (text).' });
      return;
    }

    const audioBuffer = await synthesizeSpeech(text, voiceId);
    if (!audioBuffer) {
      res.status(200).json({
        success: false,
        fallback: true,
        message: 'AWS Polly không khả dụng hoặc chưa cấu hình credentials. Chuyển sang Web Speech API fallback.',
      });
      return;
    }

    if (req.headers.accept === 'audio/mpeg' || req.query.format === 'binary') {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.end(audioBuffer);
    } else {
      res.json({
        success: true,
        fallback: false,
        mimeType: 'audio/mpeg',
        audioBase64: audioBuffer.toString('base64'),
      });
    }
  } catch (error: any) {
    console.error('[Server TTS Error]:', error);
    res.status(200).json({
      success: false,
      fallback: true,
      error: error.message,
    });
  }
});

// Reset và tạo lại 30 ngày dữ liệu mẫu
app.post('/api/seed', async (req: Request, res: Response) => {
  try {
    await seedDemoData(true);
    res.json({ success: true, message: 'Đã tạo mới toàn bộ dữ liệu lâm sàng 30 ngày thành công!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. KHỞI ĐỘNG SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`
=====================================================
  CAREBRIDGE AMBIENT MCP SERVER ĐÃ SẴN SÀNG!
  • Port:               ${PORT}
  • REST API:           http://localhost:${PORT}/api/today
  • MCP SSE Endpoint:   http://localhost:${PORT}/sse
  • MCP Message Post:   http://localhost:${PORT}/message
=====================================================
  `);
  console.log(`[AWS Config] Region: ${process.env.AWS_REGION || 'chưa có'}, Key ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Đã nhận' : 'Trống'}`);
});