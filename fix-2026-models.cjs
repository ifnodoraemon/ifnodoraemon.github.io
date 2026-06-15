const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const tableHeadersEn = ["Dimension", "GPT-5.5", "Claude Fable 5", "Gemini 3.5 Flash", "DeepSeek V4 Pro", "Qwen 3.7 Max", "Llama 4 Scout"];
const tableHeadersZh = ["维度", "GPT-5.5", "Claude Fable 5", "Gemini 3.5 Flash", "DeepSeek V4 Pro", "Qwen 3.7 Max", "Llama 4 Scout"];

const tableRowsEn = [
  ["Vendor", "OpenAI", "Anthropic", "Google", "DeepSeek", "Alibaba", "Meta"],
  ["Release Date", "2026.04.23", "2026.06.09", "2026.05.19", "2026.04.24", "2026.05.20", "2025.04.05"],
  ["Context", "512K", "2M", "1M", "128K", "256K", "10M"],
  ["Multimodal", "Omnimodal", "Text/Image", "Omnimodal", "Text/Image", "Text/Image", "Text/Image"],
  ["Coding", "★★★★★", "★★★★★", "★★★★☆", "★★★★★", "★★★★★", "★★★★☆"],
  ["Reasoning", "★★★★★", "★★★★★", "★★★★☆", "★★★★★", "★★★★★", "★★★★☆"]
];

const tableRowsZh = [
  ["厂商", "OpenAI", "Anthropic", "Google", "DeepSeek", "阿里巴巴", "Meta"],
  ["发布日期", "2026.04.23", "2026.06.09", "2026.05.19", "2026.04.24", "2026.05.20", "2025.04.05"],
  ["上下文", "512K", "2M", "1M", "128K", "256K", "10M"],
  ["多模态", "全模态", "文本/图像", "全模态", "文本/图像", "文本/图像", "文本/图像"],
  ["代码能力", "★★★★★", "★★★★★", "★★★★☆", "★★★★★", "★★★★★", "★★★★☆"],
  ["推理深度", "★★★★★", "★★★★★", "★★★★☆", "★★★★★", "★★★★★", "★★★★☆"]
];

const detailsEn = [
  {
    "id": "gpt",
    "icon": "🧠",
    "name": "GPT-5.5",
    "meta": "OpenAI · Released 2026.04.23",
    "desc": "GPT-5.5 ('Spud') is OpenAI's latest flagship, integrating state-of-the-art reasoning and full native omnimodality for complex agentic workflows.",
    "specs": [
      { "label": "Context", "value": "512K tokens" },
      { "label": "Strengths", "value": "Reasoning · Agentic Workflows · Omni" }
    ]
  },
  {
    "id": "claude",
    "icon": "🎭",
    "name": "Claude Fable 5",
    "meta": "Anthropic · Released 2026.06.09",
    "desc": "Claude Fable 5 leads in software engineering and safety, featuring a massive 2M context window.",
    "specs": [
      { "label": "Context", "value": "2M tokens" },
      { "label": "Strengths", "value": "Computer Use · Agentic Logic" }
    ]
  },
  {
    "id": "gemini",
    "icon": "✨",
    "name": "Gemini 3.5 Flash",
    "meta": "Google · Released 2026.05.19",
    "desc": "Google's 2026 speed champion, offering a 1M context window and unmatched efficiency for large-scale operations.",
    "specs": [
      { "label": "Context", "value": "1M tokens" },
      { "label": "Strengths", "value": "High Speed · Cost-Effective · Omnimodal" }
    ]
  },
  {
    "id": "deepseek",
    "icon": "🐳",
    "name": "DeepSeek V4 Pro",
    "meta": "DeepSeek · Released 2026.04.24",
    "desc": "DeepSeek V4 Pro is the new standard for open-weight reasoning and coding, completely outperforming its predecessors.",
    "specs": [
      { "label": "Context", "value": "128K tokens" },
      { "label": "Strengths", "value": "Deep Reasoning · Coding Expert" }
    ]
  },
  {
    "id": "qwen",
    "icon": "🌐",
    "name": "Qwen 3.7 Max",
    "meta": "Alibaba · Released 2026.05.20",
    "desc": "Qwen 3.7 Max stands at the absolute frontier of open-source models, delivering top-tier performance.",
    "specs": [
      { "label": "Context", "value": "256K tokens" },
      { "label": "Strengths", "value": "All-Around Performance · Multi-Lingual" }
    ]
  },
  {
    "id": "llama",
    "icon": "🦙",
    "name": "Llama 4 Scout",
    "meta": "Meta · Released 2025.04.05",
    "desc": "Meta's Llama 4 Scout introduces an unprecedented 10M token context window to the open-weight ecosystem.",
    "specs": [
      { "label": "Context", "value": "10M tokens" },
      { "label": "Strengths", "value": "Infinite Context · Local Deploy" }
    ]
  }
];

const detailsZh = [
  {
    "id": "gpt",
    "icon": "🧠",
    "name": "GPT-5.5",
    "meta": "OpenAI · 2026.04.23 发布",
    "desc": "GPT-5.5 是 OpenAI 的旗舰模型，专为复杂 Agent 工作流设计，提供最前沿的推理和全模态能力。",
    "specs": [
      { "label": "上下文", "value": "512K tokens" },
      { "label": "优势", "value": "深度推理 · Agent 工作流" }
    ]
  },
  {
    "id": "claude",
    "icon": "🎭",
    "name": "Claude Fable 5",
    "meta": "Anthropic · 2026.06.09 发布",
    "desc": "Claude Fable 5 在软件工程和安全性方面遥遥领先，并配备了高达 2M 的超长上下文。",
    "specs": [
      { "label": "上下文", "value": "2M tokens" },
      { "label": "优势", "value": "Computer Use · 代码精度" }
    ]
  },
  {
    "id": "gemini",
    "icon": "✨",
    "name": "Gemini 3.5 Flash",
    "meta": "Google · 2026.05.19 发布",
    "desc": "Google 最新的速度王者，提供 1M 上下文，在大规模高频任务中效率无敌。",
    "specs": [
      { "label": "上下文", "value": "1M tokens" },
      { "label": "优势", "value": "极速响应 · 高性价比 · 全模态" }
    ]
  },
  {
    "id": "deepseek",
    "icon": "🐳",
    "name": "DeepSeek V4 Pro",
    "meta": "DeepSeek · 2026.04.24 发布",
    "desc": "DeepSeek V4 Pro 奠定了开源代码与推理模型的新标准，提供顶级推理逻辑。",
    "specs": [
      { "label": "上下文", "value": "128K tokens" },
      { "label": "优势", "value": "深度推理 · 代码生成专家" }
    ]
  },
  {
    "id": "qwen",
    "icon": "🌐",
    "name": "Qwen 3.7 Max",
    "meta": "阿里巴巴 · 2026.05.20 发布",
    "desc": "Qwen 3.7 Max 稳居开源生态最前沿，提供全面且顶尖的各领域能力。",
    "specs": [
      { "label": "上下文", "value": "256K tokens" },
      { "label": "优势", "value": "全能表现 · 多语言支持" }
    ]
  },
  {
    "id": "llama",
    "icon": "🦙",
    "name": "Llama 4 Scout",
    "meta": "Meta · 2025.04.05 发布",
    "desc": "Meta 的 Llama 4 Scout 为开源生态带来了史无前例的 1000 万 Token 超长上下文能力。",
    "specs": [
      { "label": "上下文", "value": "10M tokens" },
      { "label": "优势", "value": "无限上下文 · 本地部署友好" }
    ]
  }
];

const scenesEn = [
  {
    "title": "Coding & Dev",
    "desc": "Require code generation, refactoring, debugging, or dev assistance",
    "badge": "Top Pick",
    "reason": "DeepSeek V4 Pro and Claude Fable 5 lead in complex coding accuracy and refactoring."
  },
  {
    "title": "Agent Workflows",
    "desc": "Build autonomous, multi-step intelligent agent systems",
    "badge": "Strongest",
    "reason": "GPT-5.5 and Claude Fable 5 offer industry-leading agentic capabilities and robust Computer Use."
  },
  {
    "title": "Long Context",
    "desc": "Need to process ultra-long texts, full codebases, or massive data",
    "badge": "Recommended",
    "reason": "Claude Fable 5 offers a 2M window; Gemini 3.5 Flash brings unmatched 1M efficiency."
  },
  {
    "title": "Open Source Leader",
    "desc": "Enterprise deployment needing high-end open-weight capability",
    "badge": "All-Rounder",
    "reason": "Qwen 3.7 Max is the absolute top-tier open-weight model for versatile tasks."
  },
  {
    "title": "Complex Reasoning",
    "desc": "Math proofs, logic analysis, complex planning tasks",
    "badge": "Extreme",
    "reason": "DeepSeek V4 Pro and GPT-5.5 provide state-of-the-art deep reasoning logic."
  },
  {
    "title": "Infinite Context",
    "desc": "Processing entire massive libraries or video datasets locally",
    "badge": "Limitless",
    "reason": "Llama 4 Scout introduces an unprecedented 10M context window to the open ecosystem."
  }
];

const scenesZh = [
  {
    "title": "代码开发",
    "desc": "需要代码生成、重构、调试或开发辅助",
    "badge": "首选",
    "reason": "DeepSeek V4 Pro 和 Claude Fable 5 在复杂代码精度和重构上领先。"
  },
  {
    "title": "Agent 工作流",
    "desc": "构建自主决策、多步执行的智能代理系统",
    "badge": "最强",
    "reason": "GPT-5.5 和 Claude Fable 5 提供业界最强的 Agentic 能力与 Computer Use。"
  },
  {
    "title": "超长上下文",
    "desc": "需要处理超长文本、完整代码库或大量数据",
    "badge": "推荐",
    "reason": "Claude Fable 5 提供 2M 窗口，Gemini 3.5 Flash 拥有极速的 1M 处理效率。"
  },
  {
    "title": "开源主力",
    "desc": "企业私有化部署，需要顶尖的开源基座能力",
    "badge": "全能",
    "reason": "Qwen 3.7 Max 是目前最全面、最顶尖的开源全能选手。"
  },
  {
    "title": "复杂推理",
    "desc": "数学证明、逻辑分析、复杂规划任务",
    "badge": "极限",
    "reason": "DeepSeek V4 Pro 与 GPT-5.5 提供了当前最强的深度推理逻辑。"
  },
  {
    "title": "无限上下文",
    "desc": "本地分析海量日志库或超大规模视频集",
    "badge": "无界",
    "reason": "Llama 4 Scout 为开源生态带来了史无前例的 1000 万 Token 上下文。"
  }
];

const timelineEnUpdate = [
  { "date": "2026.06.09", "name": "Claude Fable 5", "desc": "Anthropic releases Fable 5 with top tier agentic workflows", "latest": true },
  { "date": "2026.05.20", "name": "Qwen 3.7 Max", "desc": "Alibaba sets the new bar for open-weight models", "latest": false },
  { "date": "2026.05.19", "name": "Gemini 3.5 Flash", "desc": "Google releases incredibly fast omnimodal model", "latest": false },
  { "date": "2026.04.24", "name": "DeepSeek V4 Pro", "desc": "DeepSeek releases their next generation reasoning expert", "latest": false },
  { "date": "2026.04.23", "name": "GPT-5.5", "desc": "OpenAI releases its agent-focused flagship model", "latest": false },
  { "date": "2025.04.05", "name": "Llama 4 Scout", "desc": "Meta releases 10M context window open model", "latest": false }
];

const timelineZhUpdate = [
  { "date": "2026.06.09", "name": "Claude Fable 5", "desc": "Anthropic 推出顶级 Agent 工作流模型 Fable 5", "latest": true },
  { "date": "2026.05.20", "name": "Qwen 3.7 Max", "desc": "阿里巴巴树立新的全能开源基座标杆", "latest": false },
  { "date": "2026.05.19", "name": "Gemini 3.5 Flash", "desc": "Google 发布极速全模态处理模型", "latest": false },
  { "date": "2026.04.24", "name": "DeepSeek V4 Pro", "desc": "DeepSeek 推出新一代顶尖推理专家模型", "latest": false },
  { "date": "2026.04.23", "name": "GPT-5.5", "desc": "OpenAI 正式发布针对 Agent 优化的旗舰模型", "latest": false },
  { "date": "2025.04.05", "name": "Llama 4 Scout", "desc": "Meta 发布支持 10M 超长上下文的开源模型", "latest": false }
];

en.models.tableHeaders = tableHeadersEn;
en.models.tableRows = tableRowsEn;
en.models.details = detailsEn;
en.models.scenes = scenesEn;

zh.models.tableHeaders = tableHeadersZh;
zh.models.tableRows = tableRowsZh;
zh.models.details = detailsZh;
zh.models.scenes = scenesZh;

// Retain pre-2025 timeline events, add the new ones, then sort newest to oldest
en.models.timeline = en.models.timeline.filter(item => item.date < "2025.04.05").concat(timelineEnUpdate).sort((a, b) => b.date.localeCompare(a.date));
zh.models.timeline = zh.models.timeline.filter(item => item.date < "2025.04.05").concat(timelineZhUpdate).sort((a, b) => b.date.localeCompare(a.date));

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
console.log('2026 exact models injected');
