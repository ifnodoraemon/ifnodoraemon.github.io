const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

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

en.models.scenes = scenesEn;
zh.models.scenes = scenesZh;

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
console.log('Scenes updated successfully');
