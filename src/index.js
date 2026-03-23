import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 动态加载八字模块
const loadBaziModules = () => {
  return {
    bazi: import('./bazi.js'),
    baziClasses: import('./bazi_classes.js'),
    paipanCore: import('./paipan_node_core.js'),
    shishenWangshuai: import('./shishen_wangshuai.js'),
    shishenGeshi: import('./shishen_geshi.js'),
    shishenPingke: import('./shishen_pingke.js'),
    baziInterpreter: import('./bazi_interpreter.js'),
  };
};

const tools = [
  {
    name: 'bazi_paipan',
    description: '八字排盘 - 输入出生时间，返回完整八字信息',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: '出生年份（公历）' },
        month: { type: 'number', description: '出生月份（公历）' },
        day: { type: 'number', description: '出生日期（公历）' },
        hour: { type: 'number', description: '出生小时（0-23）' },
        gender: { type: 'string', description: '性别：male 或 female', enum: ['male', 'female'] },
        lunar: { type: 'boolean', description: '是否农历输入', default: false },
      },
      required: ['year', 'month', 'day', 'hour', 'gender'],
    },
  },
  {
    name: 'bazi_interpret',
    description: '八字解读 - 输入八字信息，返回命理分析',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: '出生年份（公历）' },
        month: { type: 'number', description: '出生月份（公历）' },
        day: { type: 'number', description: '出生日期（公历）' },
        hour: { type: 'number', description: '出生小时（0-23）' },
        gender: { type: 'string', description: '性别：male 或 female', enum: ['male', 'female'] },
        topic: { type: 'string', description: '解读话题：事业/财运/婚姻/子女/学业/健康/性格', default: '事业' },
      },
      required: ['year', 'month', 'day', 'hour', 'gender', 'topic'],
    },
  },
];

const server = new Server(
  { name: 'claude-angel-skills-mcp', version: '1.0.0' },
  { capabilities: { tools } }
);

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'bazi_paipan') {
      // 加载并调用排盘模块
      const modules = loadBaziModules();
      const bazi = await modules.bazi;
      const result = bazi.paipan(args.year, args.month, args.day, args.hour, args.gender, args.lunar);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'bazi_interpret') {
      return { content: [{ type: 'text', text: '八字解读需要调用完整的解读流程，请在 OpenClaw 中使用 bazi skill 获取完整解读。' }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
