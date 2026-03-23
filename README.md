# Claude Angel Skills MCP

八字命理 MCP Server，让 AI 助手拥有八字排盘和解读能力。

## 安装

```bash
npm install
```

## 配置

在 Claude Code 或 OpenClaw 的 MCP 配置文件 `~/.claude/mcp.json` 或 `~/.openclaw/mcp.json` 中添加：

```json
{
  "mcpServers": {
    "bazi": {
      "command": "node",
      "args": ["/path/to/Claude-Angel-Skills-mcp/src/index.js"]
    }
  }
}
```

## 工具

### bazi_paipan
八字排盘，输入出生时间返回完整八字信息。

参数：
- `year`: 出生年份（公历）
- `month`: 出生月份
- `day`: 出生日期
- `hour`: 出生小时（0-23）
- `gender`: `male` 或 `female`
- `lunar`: 是否农历输入（默认 false）

## 使用前提

- Node.js 18+
- 在 OpenClaw 中使用更完整的八字解读功能

## License

Private - Ian Kwan
