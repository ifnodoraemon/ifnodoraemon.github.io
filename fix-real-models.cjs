const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const tableHeadersEn = ["Dimension", "GPT-4o", "Claude 3.5 Sonnet", "Gemini 1.5 Pro", "DeepSeek R1", "Qwen 2.5", "Llama 3.1 405B"];
const tableHeadersZh = ["维度", "GPT-4o", "Claude 3.5 Sonnet", "Gemini 1.5 Pro", "DeepSeek R1", "Qwen 2.5", "Llama 3.1 405B"];

const tableRowsEn = [
  ["Vendor", "OpenAI", "Anthropic", "Google", "DeepSeek", "Alibaba", "Meta"],
  ["Release Date", "2024.05.13", "2024.06.20", "2024.02.15", "2025.01.20", "2024.09.19", "2024.07.23"],
  ["Context", "128K", "200K", "2M", "128K", "128K", "128K"],
  ["Multimodal", "Omnimodal", "Text/Image", "Omnimodal", "Text", "Text", "Text"],
  ["Coding", "★★★★★", "★★★★★", "★★★★☆", "★★★★★", "★★★★☆", "★★★★☆"],
  ["Reasoning", "★★★★☆", "★★★★☆", "★★★★☆", "★★★★★", "★★★★☆", "★★★★☆"]
];

const tableRowsZh = [
  ["厂商", "OpenAI", "Anthropic", "Google", "DeepSeek", "阿里巴巴", "Meta"],
  ["发布日期", "2024.05.13", "2024.06.20", "2024.02.15", "2025.01.20", "2024.09.19", "2024.07.23"],
  ["上下文", "128K", "200K", "2M", "128K", "128K", "128K"],
  ["多模态", "全模态", "文本/图像", "全模态", "文本", "文本", "文本"],
  ["代码能力", "★★★★★", "★★★★★", "★★★★☆", "★★★★★", "★★★★☆", "★★★★☆"],
  ["推理深度", "★★★★☆", "★★★★☆", "★★★★☆", "★★★★★", "★★★★☆", "★★★★☆"]
];

const detailsEn = [
  {
    "id": "gpt",
    "icon": "🧠",
    "name": "GPT-4o",
    "meta": "OpenAI · Released 2024.05.13",
    "desc": "GPT-4o ('o' for 'omni') is a step towards much more natural human-computer interaction, accepting any combination of text, audio, image, and video.",
    "specs": [
      { "label": "Context", "value": "128K tokens" },
      { "label": "Strengths", "value": "Real-time Voice · Vision · Speed" }
    ]
  },
  {
    "id": "claude",
    "icon": "🎭",
    "name": "Claude 3.5 Sonnet",
    "meta": "Anthropic · Released 2024.06.20",
    "desc": "Claude 3.5 Sonnet sets the industry benchmark for graduate-level reasoning and coding proficiency.",
    "specs": [
      { "label": "Context", "value": "200K tokens" },
      { "label": "Strengths", "value": "Coding · Artifacts · Nuanced Writing" }
    ]
  },
  {
    "id": "gemini",
    "icon": "✨",
    "name": "Gemini 1.5 Pro",
    "meta": "Google · Released 2024.02.15",
    "desc": "Gemini 1.5 Pro delivers dramatically enhanced performance, with a breakthrough experimental 2 million token context window.",
    "specs": [
      { "label": "Context", "value": "2M tokens" },
      { "label": "Strengths", "value": "Massive Context · Deep Research" }
    ]
  },
  {
    "id": "deepseek",
    "icon": "🐳",
    "name": "DeepSeek R1",
    "meta": "DeepSeek · Released 2025.01.20",
    "desc": "DeepSeek-R1 is a first-generation reasoning model that achieves performance comparable to OpenAI-o1 across math, code, and reasoning tasks.",
    "specs": [
      { "label": "Context", "value": "128K tokens" },
      { "label": "Strengths", "value": "Chain of Thought · Complex Math" }
    ]
  },
  {
    "id": "qwen",
    "icon": "🌐",
    "name": "Qwen 2.5",
    "meta": "Alibaba · Released 2024.09.19",
    "desc": "Qwen 2.5 represents a major upgrade, offering excellent capabilities in coding, mathematics, and multilingual instruction following.",
    "specs": [
      { "label": "Context", "value": "128K tokens" },
      { "label": "Strengths", "value": "Open Weights · Multilingual" }
    ]
  },
  {
    "id": "llama",
    "icon": "🦙",
    "name": "Llama 3.1 405B",
    "meta": "Meta · Released 2024.07.23",
    "desc": "Llama 3.1 405B is the first frontier-level open-source AI model, pushing the limits of what open weights can achieve.",
    "specs": [
      { "label": "Context", "value": "128K tokens" },
      { "label": "Strengths", "value": "Open Source Ecosystem Leader" }
    ]
  }
];

const detailsZh = [
  {
    "id": "gpt",
    "icon": "🧠",
    "name": "GPT-4o",
    "meta": "OpenAI · 2024.05.13 发布",
    "desc": "GPT-4o 是能够实时处理音频、视觉和文本的真正全模态模型，交互速度极快。",
    "specs": [
      { "label": "上下文", "value": "128K tokens" },
      { "label": "优势", "value": "极速语音 · 全模态融合" }
    ]
  },
  {
    "id": "claude",
    "icon": "🎭",
    "name": "Claude 3.5 Sonnet",
    "meta": "Anthropic · 2024.06.20 发布",
    "desc": "Claude 3.5 Sonnet 树立了代码生成和高级推理的行业新标杆，内置 Artifacts 创新交互。",
    "specs": [
      { "label": "上下文", "value": "200K tokens" },
      { "label": "优势", "value": "顶级代码能力 · 细腻文笔" }
    ]
  },
  {
    "id": "gemini",
    "icon": "✨",
    "name": "Gemini 1.5 Pro",
    "meta": "Google · 2024.02.15 发布",
    "desc": "Gemini 1.5 Pro 带来了突破性的最高 200 万 Token 超大上下文窗口。",
    "specs": [
      { "label": "上下文", "value": "2M tokens" },
      { "label": "优势", "value": "超大上下文检索 · 视频理解" }
    ]
  },
  {
    "id": "deepseek",
    "icon": "🐳",
    "name": "DeepSeek R1",
    "meta": "DeepSeek · 2025.01.20 发布",
    "desc": "DeepSeek-R1 是一款在数学、代码和推理任务上性能媲美 OpenAI-o1 的第一代开源推理模型。",
    "specs": [
      { "label": "上下文", "value": "128K tokens" },
      { "label": "优势", "value": "深度思考 (CoT) · 复杂数学" }
    ]
  },
  {
    "id": "qwen",
    "icon": "🌐",
    "name": "Qwen 2.5",
    "meta": "阿里巴巴 · 2024.09.19 发布",
    "desc": "Qwen 2.5 系列在代码、数学能力上大幅提升，是当今最具竞争力的开源基座之一。",
    "specs": [
      { "label": "上下文", "value": "128K tokens" },
      { "label": "优势", "value": "开源权重 · 多语言指令遵循" }
    ]
  },
  {
    "id": "llama",
    "icon": "🦙",
    "name": "Llama 3.1 405B",
    "meta": "Meta · 2024.07.23 发布",
    "desc": "Llama 3.1 405B 是业界首个达到前沿闭源模型水平的超大规模开源模型。",
    "specs": [
      { "label": "上下文", "value": "128K tokens" },
      { "label": "优势", "value": "最强开源基座 · 社区生态好" }
    ]
  }
];

const scenesEn = [
  {
    "title": "Coding & Dev",
    "desc": "Require code generation, refactoring, debugging, or dev assistance",
    "badge": "Top Pick",
    "reason": "Claude 3.5 Sonnet and DeepSeek R1 are currently the top choices for complex coding."
  },
  {
    "title": "Agent Workflows",
    "desc": "Build autonomous, multi-step intelligent agent systems",
    "badge": "Strongest",
    "reason": "GPT-4o and Claude 3.5 Sonnet excel in precise tool-calling and API interactions."
  },
  {
    "title": "Long Context",
    "desc": "Need to process ultra-long texts, full codebases, or massive data",
    "badge": "Recommended",
    "reason": "Gemini 1.5 Pro is the undisputed leader here with up to 2 million tokens."
  },
  {
    "title": "Open Source Leader",
    "desc": "Enterprise deployment needing high-end open-weight capability",
    "badge": "All-Rounder",
    "reason": "Llama 3.1 405B and Qwen 2.5 72B offer flagship-level open-source performance."
  },
  {
    "title": "Complex Reasoning",
    "desc": "Math proofs, logic analysis, complex planning tasks",
    "badge": "Extreme",
    "reason": "DeepSeek R1 provides state-of-the-art open reasoning via Chain-of-Thought."
  },
  {
    "title": "Multimodal & Voice",
    "desc": "Processing images, or requiring real-time low-latency voice",
    "badge": "Omni",
    "reason": "GPT-4o natively processes audio and video streams with incredible speed."
  }
];

const scenesZh = [
  {
    "title": "代码开发",
    "desc": "需要代码生成、重构、调试或开发辅助",
    "badge": "首选",
    "reason": "Claude 3.5 Sonnet 与 DeepSeek R1 目前在写代码和重构方面体验最佳。"
  },
  {
    "title": "Agent 工作流",
    "desc": "构建自主决策、多步执行的智能代理系统",
    "badge": "最强",
    "reason": "GPT-4o 与 Claude 3.5 Sonnet 在 Tool-Calling 和指令遵循上最为精准。"
  },
  {
    "title": "超长上下文",
    "desc": "需要处理超长文本、完整代码库或大量数据",
    "badge": "推荐",
    "reason": "Gemini 1.5 Pro 支持高达 200 万 Token 的上下文，处理大文件无敌。"
  },
  {
    "title": "开源主力",
    "desc": "企业私有化部署，需要顶尖的开源基座能力",
    "badge": "全能",
    "reason": "Llama 3.1 405B 与 Qwen 2.5 72B 是目前综合能力最强的开源选择。"
  },
  {
    "title": "复杂推理",
    "desc": "数学证明、逻辑分析、复杂规划任务",
    "badge": "极限",
    "reason": "DeepSeek R1 采用强化学习实现了极强的思维链 (CoT) 推理能力。"
  },
  {
    "title": "语音与全模态",
    "desc": "处理视觉任务，或需要极低延迟的实时语音交互",
    "badge": "全模态",
    "reason": "GPT-4o 原生支持音视频流的实时输入输出，响应速度极快。"
  }
];

const timelineEnUpdate = [
  { "date": "2025.01.20", "name": "DeepSeek R1", "desc": "DeepSeek releases their groundbreaking open reasoning model", "latest": true },
  { "date": "2024.10.22", "name": "Claude 3.5 Sonnet (Upd)", "desc": "Anthropic updates Sonnet with Computer Use capabilities", "latest": false },
  { "date": "2024.09.19", "name": "Qwen 2.5", "desc": "Alibaba releases major open source foundation model update", "latest": false },
  { "date": "2024.07.23", "name": "Llama 3.1", "desc": "Meta releases Llama 3.1 including the massive 405B parameter model", "latest": false },
  { "date": "2024.06.20", "name": "Claude 3.5 Sonnet", "desc": "Anthropic sets a new bar for coding and intelligence", "latest": false },
  { "date": "2024.05.13", "name": "GPT-4o", "desc": "OpenAI announces their fast, natively omnimodal flagship model", "latest": false },
  { "date": "2024.02.15", "name": "Gemini 1.5 Pro", "desc": "Google announces breakthrough 1M (later 2M) context window", "latest": false }
];

const timelineZhUpdate = [
  { "date": "2025.01.20", "name": "DeepSeek R1", "desc": "DeepSeek 发布震撼行业的开源推理模型", "latest": true },
  { "date": "2024.10.22", "name": "Claude 3.5 Sonnet (Upd)", "desc": "Anthropic 升级 Sonnet 并引入 Computer Use (计算机使用) 能力", "latest": false },
  { "date": "2024.09.19", "name": "Qwen 2.5", "desc": "阿里巴巴开源 Qwen 2.5 全系列基座模型", "latest": false },
  { "date": "2024.07.23", "name": "Llama 3.1", "desc": "Meta 发布包含 405B 超大参数量的 Llama 3.1 开源模型", "latest": false },
  { "date": "2024.06.20", "name": "Claude 3.5 Sonnet", "desc": "Anthropic 发布新一代模型，树立代码能力新标杆", "latest": false },
  { "date": "2024.05.13", "name": "GPT-4o", "desc": "OpenAI 发布极速、原生全模态的旗舰模型", "latest": false },
  { "date": "2024.02.15", "name": "Gemini 1.5 Pro", "desc": "Google 首次公布支持 100万（后升至200万）上下文的下一代模型", "latest": false }
];

en.models.tableHeaders = tableHeadersEn;
en.models.tableRows = tableRowsEn;
en.models.details = detailsEn;
en.models.scenes = scenesEn;

zh.models.tableHeaders = tableHeadersZh;
zh.models.tableRows = tableRowsZh;
zh.models.details = detailsZh;
zh.models.scenes = scenesZh;

// Filter out old/fake dates and put real dates in descending order
en.models.timeline = en.models.timeline.filter(item => item.date < "2024.02.15").concat(timelineEnUpdate).sort((a, b) => b.date.localeCompare(a.date));
zh.models.timeline = zh.models.timeline.filter(item => item.date < "2024.02.15").concat(timelineZhUpdate).sort((a, b) => b.date.localeCompare(a.date));

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
console.log('Real world models injected');
