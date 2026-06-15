const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const timelineEn = [
  { "date": "2017.06.12", "name": "Transformer", "desc": "Google publishes 'Attention Is All You Need', defining the modern AI era", "latest": false },
  { "date": "2018.10.11", "name": "BERT", "desc": "Google's breakthrough in bidirectional encoder representations", "latest": false },
  { "date": "2020.05.28", "name": "GPT-3", "desc": "OpenAI introduces few-shot learning with 175B parameters", "latest": false },
  { "date": "2022.11.30", "name": "ChatGPT", "desc": "OpenAI releases ChatGPT based on GPT-3.5, igniting the generative AI boom", "latest": false },
  { "date": "2023.03.14", "name": "GPT-4", "desc": "A major leap in reasoning and multimodal capabilities", "latest": false },
  { "date": "2023.07.18", "name": "Llama 2", "desc": "Meta releases open-source weights, accelerating the open AI ecosystem", "latest": false },
  { "date": "2024.03.04", "name": "Claude 3 Family", "desc": "Anthropic's Opus briefly surpasses GPT-4 in benchmarks", "latest": false },
  { "date": "2024.05.13", "name": "GPT-4o", "desc": "OpenAI's natively omnimodal model enabling real-time voice and vision", "latest": false },
  { "date": "2025.10.15", "name": "GPT-5 & Claude 4", "desc": "The transition to agentic workflows and computer use becomes mainstream", "latest": false },
  { "date": "2026.04.15", "name": "Llama 4 Scout", "desc": "Meta's 10M context window open model", "latest": false },
  { "date": "2026.05.10", "name": "DeepSeek R1", "desc": "MIT licensed model dominating complex reasoning benchmarks", "latest": false },
  { "date": "2026.05.20", "name": "Gemini 3.5 Pro", "desc": "Google's 2M context native omnimodal upgrade", "latest": false },
  { "date": "2026.06.02", "name": "GPT-5.5", "desc": "OpenAI flagship with built-in advanced agentic features", "latest": false },
  { "date": "2026.06.09", "name": "Claude Fable 5", "desc": "Anthropic's latest restricted tier model", "latest": false },
  { "date": "2026.06.10", "name": "Qwen 3 235B", "desc": "The most powerful open-source foundation model released", "latest": true }
];

const timelineZh = [
  { "date": "2017.06.12", "name": "Transformer", "desc": "Google 发布 Attention Is All You Need，奠定大模型时代基础", "latest": false },
  { "date": "2018.10.11", "name": "BERT", "desc": "Google 提出双向编码器表示，横扫多项 NLP 任务记录", "latest": false },
  { "date": "2020.05.28", "name": "GPT-3", "desc": "OpenAI 发布 1750亿 参数模型，展示 Few-shot 惊人能力", "latest": false },
  { "date": "2022.11.30", "name": "ChatGPT", "desc": "基于 GPT-3.5 的 ChatGPT 问世，彻底引爆生成式 AI 浪潮", "latest": false },
  { "date": "2023.03.14", "name": "GPT-4", "desc": "推理能力和多模态理解的划时代飞跃", "latest": false },
  { "date": "2023.07.18", "name": "Llama 2", "desc": "Meta 宣布开源，极大地推动了开源生态的繁荣", "latest": false },
  { "date": "2024.03.04", "name": "Claude 3 家族", "desc": "Anthropic 的 Opus 模型在多项基准测试中超越 GPT-4", "latest": false },
  { "date": "2024.05.13", "name": "GPT-4o", "desc": "OpenAI 发布原生全模态模型，实现超低延迟的实时语音交互", "latest": false },
  { "date": "2025.10.15", "name": "GPT-5 与 Claude 4", "desc": "大模型正式进入 Agentic 时代，Computer Use 成为标配", "latest": false },
  { "date": "2026.04.15", "name": "Llama 4 Scout", "desc": "Meta 发布支持 10M 超长上下文的开源模型", "latest": false },
  { "date": "2026.05.10", "name": "DeepSeek R1", "desc": "MIT 协议开源，横扫复杂推理榜单", "latest": false },
  { "date": "2026.05.20", "name": "Gemini 3.5 Pro", "desc": "Google 2M 上下文原生全模态升级版", "latest": false },
  { "date": "2026.06.02", "name": "GPT-5.5", "desc": "OpenAI 旗舰模型发布，内置高级 Agent 功能", "latest": false },
  { "date": "2026.06.09", "name": "Claude Fable 5", "desc": "Anthropic 最新神话级受限模型", "latest": false },
  { "date": "2026.06.10", "name": "Qwen 3 235B", "desc": "史上最强开源基座模型发布", "latest": true }
];

en.models.timeline = timelineEn;
zh.models.timeline = timelineZh;

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
console.log('Timeline updated successfully');
