const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Common table data
const tableHeadersEn = ["Dimension", "GPT-5.5", "Claude Fable 5", "Qwen 3 235B", "Gemini 3.5 Pro"];
const tableHeadersZh = ["维度", "GPT-5.5", "Claude Fable 5", "Qwen 3 235B", "Gemini 3.5 Pro"];

const tableRowsEn = [
  ["Vendor", "OpenAI", "Anthropic", "Qwen Team", "Google"],
  ["Release Date", "2026.06.02", "2026.06.09", "2026.06.10", "2026.06.05"],
  ["Context", "512K", "2M", "128K", "2M"],
  ["Native Multimodal", "Omnimodal", "Text/Image/Visual", "Text/Image", "Omnimodal"],
  ["Coding", "★★★★★", "★★★★★", "★★★★☆", "★★★★★"],
  ["Reasoning Depth", "★★★★★", "★★★★★", "★★★★★", "★★★★☆"],
  ["Agentic Logic", "★★★★★", "★★★★★", "★★★★☆", "★★★★☆"],
  ["Speed", "★★★★☆", "★★★★☆", "★★★★★", "★★★★★"]
];

const tableRowsZh = [
  ["厂商", "OpenAI", "Anthropic", "Qwen Team", "Google"],
  ["发布日期", "2026.06.02", "2026.06.09", "2026.06.10", "2026.06.05"],
  ["上下文", "512K", "2M", "128K", "2M"],
  ["原生多模态", "全模态", "文本/图像/视觉推理", "文本/图像", "全模态"],
  ["代码能力", "★★★★★", "★★★★★", "★★★★☆", "★★★★★"],
  ["推理深度", "★★★★★", "★★★★★", "★★★★★", "★★★★☆"],
  ["Agentic", "★★★★★", "★★★★★", "★★★★☆", "★★★★☆"],
  ["响应速度", "★★★★☆", "★★★★☆", "★★★★★", "★★★★★"]
];

const detailsEn = [
  {
    "id": "gpt",
    "icon": "🧠",
    "name": "GPT-5.5",
    "meta": "OpenAI · Released 2026.06.02",
    "desc": "GPT-5.5 is OpenAI's latest flagship, integrating state-of-the-art reasoning and full native omnimodality.",
    "specs": [
      { "label": "Context Window", "value": "512K tokens" },
      { "label": "Multimodal Support", "value": "Text / Image / Audio / Video" },
      { "label": "Core Strengths", "value": "Reasoning · Agentic Workflows · Omni" },
      { "label": "Use Cases", "value": "Complex Reasoning · Code Gen · Planning Tasks" }
    ]
  },
  {
    "id": "claude",
    "icon": "🎭",
    "name": "Claude Fable 5",
    "meta": "Anthropic · Released 2026.06.09",
    "desc": "Claude Fable 5 leads in software engineering and safety, featuring a massive 2M context window.",
    "specs": [
      { "label": "Context Window", "value": "2M tokens" },
      { "label": "Multimodal Support", "value": "Text / Image / Visual Reasoning" },
      { "label": "Core Strengths", "value": "Computer Use · Agentic Logic · Code Precision" },
      { "label": "Use Cases", "value": "Agentic Workflows · Large Codebases" }
    ]
  },
  {
    "id": "qwen",
    "icon": "🌐",
    "name": "Qwen 3 235B",
    "meta": "Qwen Team · Released 2026.06.10",
    "desc": "Qwen 3 235B is the reigning champion of open-source models, offering incredible reasoning and coding performance under the Apache 2.0 license.",
    "specs": [
      { "label": "Context Window", "value": "128K tokens" },
      { "label": "Multimodal Support", "value": "Text / Image" },
      { "label": "Core Strengths", "value": "Open Weights · Top Reasoning · Cost-Effective" },
      { "label": "Use Cases", "value": "Enterprise Deployment · Advanced Reasoning" }
    ]
  }
];

const detailsZh = [
  {
    "id": "gpt",
    "icon": "🧠",
    "name": "GPT-5.5",
    "meta": "OpenAI · 2026.06.02 发布",
    "desc": "GPT-5.5 是 OpenAI 最新旗舰模型，融合了顶尖的深度推理能力与全原生多模态支持。",
    "specs": [
      { "label": "上下文窗口", "value": "512K tokens" },
      { "label": "多模态支持", "value": "文本 / 图像 / 音频 / 视频" },
      { "label": "核心优势", "value": "深度推理 · Agent 工作流 · 全模态融合" },
      { "label": "适用场景", "value": "复杂推理 · 代码生成 · 规划任务" }
    ]
  },
  {
    "id": "claude",
    "icon": "🎭",
    "name": "Claude Fable 5",
    "meta": "Anthropic · 2026.06.09 发布",
    "desc": "Claude Fable 5 在软件工程和安全性方面遥遥领先，并配备了高达 2M 的超长上下文窗口。",
    "specs": [
      { "label": "上下文窗口", "value": "2M tokens" },
      { "label": "多模态支持", "value": "文本 / 图像 / 视觉推理" },
      { "label": "核心优势", "value": "Computer Use · Agent 逻辑 · 代码精度" },
      { "label": "适用场景", "value": "Agentic 工作流 · 超大代码库重构" }
    ]
  },
  {
    "id": "qwen",
    "icon": "🌐",
    "name": "Qwen 3 235B",
    "meta": "Qwen Team · 2026.06.10 发布",
    "desc": "Qwen 3 235B 是目前开源领域的绝对霸主，基于 Apache 2.0 协议提供极具竞争力的推理和代码性能。",
    "specs": [
      { "label": "上下文窗口", "value": "128K tokens" },
      { "label": "多模态支持", "value": "文本 / 图像" },
      { "label": "核心优势", "value": "开源权重 · 顶级推理 · 高性价比" },
      { "label": "适用场景", "value": "企业私有化部署 · 高阶推理场景" }
    ]
  }
];

const timelineEn = [
  { "date": "2026.04.15", "name": "Llama 4 Scout", "desc": "Meta's 10M context window open model", "latest": false },
  { "date": "2026.05.10", "name": "DeepSeek R1", "desc": "MIT licensed model dominating complex reasoning benchmarks", "latest": false },
  { "date": "2026.05.20", "name": "Gemini 3.5 Pro", "desc": "Google's 2M context native omnimodal upgrade", "latest": false },
  { "date": "2026.06.02", "name": "GPT-5.5", "desc": "OpenAI flagship with built-in advanced agentic features", "latest": false },
  { "date": "2026.06.09", "name": "Claude Fable 5", "desc": "Anthropic's latest restricted tier model", "latest": false },
  { "date": "2026.06.10", "name": "Qwen 3 235B", "desc": "The most powerful open-source foundation model released", "latest": true }
];

const timelineZh = [
  { "date": "2026.04.15", "name": "Llama 4 Scout", "desc": "Meta 发布支持 10M 超长上下文的开源模型", "latest": false },
  { "date": "2026.05.10", "name": "DeepSeek R1", "desc": "MIT 协议开源，横扫复杂推理榜单", "latest": false },
  { "date": "2026.05.20", "name": "Gemini 3.5 Pro", "desc": "Google 2M 上下文原生全模态升级版", "latest": false },
  { "date": "2026.06.02", "name": "GPT-5.5", "desc": "OpenAI 旗舰模型发布，内置高级 Agent 功能", "latest": false },
  { "date": "2026.06.09", "name": "Claude Fable 5", "desc": "Anthropic 最新神话级受限模型", "latest": false },
  { "date": "2026.06.10", "name": "Qwen 3 235B", "desc": "史上最强开源基座模型发布", "latest": true }
];

en.models.tableHeaders = tableHeadersEn;
en.models.tableRows = tableRowsEn;
en.models.details = detailsEn;
en.models.timeline = timelineEn;
en.models.pageDesc = "Deep dive into the capability boundaries of the cutting-edge 2026 models";

zh.models.tableHeaders = tableHeadersZh;
zh.models.tableRows = tableRowsZh;
zh.models.details = detailsZh;
zh.models.timeline = timelineZh;
zh.models.pageDesc = "深度解析2026年最新顶尖大模型（GPT-5.5, Claude 5, Qwen 3）的能力边界";

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
console.log('Locales updated successfully');
