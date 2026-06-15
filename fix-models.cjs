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
  ["Release Date", "2026.06.02", "2026.06.09", "2026.05.20", "2026.05.10", "2026.06.10", "2026.04.15"],
  ["Context", "512K", "2M", "1M", "128K", "256K", "10M"],
  ["Multimodal", "Omnimodal", "Text/Image", "Omnimodal", "Text/Image", "Text/Image", "Text/Image"],
  ["Coding", "★★★★★", "★★★★★", "★★★★☆", "★★★★★", "★★★★★", "★★★★☆"],
  ["Reasoning", "★★★★★", "★★★★★", "★★★★☆", "★★★★★", "★★★★★", "★★★★☆"]
];

const tableRowsZh = [
  ["厂商", "OpenAI", "Anthropic", "Google", "DeepSeek", "阿里巴巴", "Meta"],
  ["发布日期", "2026.06.02", "2026.06.09", "2026.05.20", "2026.05.10", "2026.06.10", "2026.04.15"],
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
    "meta": "OpenAI · Released 2026.06.02",
    "desc": "GPT-5.5 is OpenAI's latest flagship, integrating state-of-the-art reasoning and full native omnimodality.",
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
    "meta": "Google · Released 2026.05.20",
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
    "meta": "DeepSeek · Released 2026.05.10",
    "desc": "DeepSeek V4 Pro is the new 2026 standard for open-weight reasoning and coding, completely outperforming its predecessors.",
    "specs": [
      { "label": "Context", "value": "128K tokens" },
      { "label": "Strengths", "value": "Deep Reasoning · Coding Expert" }
    ]
  },
  {
    "id": "qwen",
    "icon": "🌐",
    "name": "Qwen 3.7 Max",
    "meta": "Alibaba · Released 2026.06.10",
    "desc": "Qwen 3.7 Max stands at the absolute frontier of open-source models in 2026, delivering top-tier performance.",
    "specs": [
      { "label": "Context", "value": "256K tokens" },
      { "label": "Strengths", "value": "All-Around Performance · Multi-Lingual" }
    ]
  },
  {
    "id": "llama",
    "icon": "🦙",
    "name": "Llama 4 Scout",
    "meta": "Meta · Released 2026.04.15",
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
    "meta": "OpenAI · 2026.06.02 发布",
    "desc": "GPT-5.5 是 OpenAI 的 2026 旗舰，融合了顶尖的深度推理能力与全原生多模态支持。",
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
    "meta": "Google · 2026.05.20 发布",
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
    "meta": "DeepSeek · 2026.05.10 发布",
    "desc": "DeepSeek V4 Pro 奠定了 2026 年开源代码与推理模型的新标准，彻底超越了此前的 R1 等老旧版本。",
    "specs": [
      { "label": "上下文", "value": "128K tokens" },
      { "label": "优势", "value": "深度推理 · 代码生成专家" }
    ]
  },
  {
    "id": "qwen",
    "icon": "🌐",
    "name": "Qwen 3.7 Max",
    "meta": "阿里巴巴 · 2026.06.10 发布",
    "desc": "Qwen 3.7 Max 稳居 2026 年开源生态最前沿，提供全面且顶尖的各领域能力。",
    "specs": [
      { "label": "上下文", "value": "256K tokens" },
      { "label": "优势", "value": "全能表现 · 多语言支持" }
    ]
  },
  {
    "id": "llama",
    "icon": "🦙",
    "name": "Llama 4 Scout",
    "meta": "Meta · 2026.04.15 发布",
    "desc": "Meta 的 Llama 4 Scout 为开源生态带来了史无前例的 1000 万 Token 超长上下文能力。",
    "specs": [
      { "label": "上下文", "value": "10M tokens" },
      { "label": "优势", "value": "无限上下文 · 本地部署友好" }
    ]
  }
];

en.models.tableHeaders = tableHeadersEn;
en.models.tableRows = tableRowsEn;
en.models.details = detailsEn;

zh.models.tableHeaders = tableHeadersZh;
zh.models.tableRows = tableRowsZh;
zh.models.details = detailsZh;

const timelineEnUpdate = [
  { "date": "2026.04.15", "name": "Llama 4 Scout", "desc": "Meta releases 10M context window open model", "latest": false },
  { "date": "2026.05.10", "name": "DeepSeek V4 Pro", "desc": "Next generation reasoning model released", "latest": false },
  { "date": "2026.05.20", "name": "Gemini 3.5 Flash", "desc": "Google's 1M context native omnimodal efficiency upgrade", "latest": false },
  { "date": "2026.06.02", "name": "GPT-5.5", "desc": "OpenAI flagship with built-in advanced agentic features", "latest": false },
  { "date": "2026.06.09", "name": "Claude Fable 5", "desc": "Anthropic's latest restricted tier model", "latest": false },
  { "date": "2026.06.10", "name": "Qwen 3.7 Max", "desc": "The most powerful open-source foundation model released", "latest": true }
];

const timelineZhUpdate = [
  { "date": "2026.04.15", "name": "Llama 4 Scout", "desc": "Meta 发布支持 10M 超长上下文的开源模型", "latest": false },
  { "date": "2026.05.10", "name": "DeepSeek V4 Pro", "desc": "DeepSeek 发布新一代代码与推理之王", "latest": false },
  { "date": "2026.05.20", "name": "Gemini 3.5 Flash", "desc": "Google 1M 上下文效率之王发布", "latest": false },
  { "date": "2026.06.02", "name": "GPT-5.5", "desc": "OpenAI 旗舰模型发布，内置高级 Agent 功能", "latest": false },
  { "date": "2026.06.09", "name": "Claude Fable 5", "desc": "Anthropic 最新神话级模型发布", "latest": false },
  { "date": "2026.06.10", "name": "Qwen 3.7 Max", "desc": "目前最强开源基座模型发布", "latest": true }
];

// keep everything before 2026.04
en.models.timeline = en.models.timeline.filter(item => item.date < "2026").concat(timelineEnUpdate);
zh.models.timeline = zh.models.timeline.filter(item => item.date < "2026").concat(timelineZhUpdate);

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
console.log('Fixed models locales');
