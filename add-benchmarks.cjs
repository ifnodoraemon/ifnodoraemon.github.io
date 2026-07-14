const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// 12 User-Centric & Real-World Task Dimensions (2026 Latest)
const radarLabels = ["真实工程 (SWE Verified)", "结对编程 (Aider)", "指令遵循 (AlpacaEval 2)", "极限推理 (ARC-AGI)", "多轮对话 (MT-Bench)", "无污染评测 (LiveBench)", "文档视觉 (DocVQA)", "长视频理解 (Video-MME)", "API与工具 (BFCL V3)", "网页智能体 (BrowserGym)", "超长文分析 (InfiniteBench)", "高难盲测跑分 (Arena Hard)"];
const radarLabelsEn = ["Real Eng (SWE Verified)", "Pair Coding (Aider)", "Instructions (AlpacaEval 2)", "Hard Logic (ARC-AGI)", "Chat (MT-Bench)", "Uncontaminated (LiveBench)", "Doc Vision (DocVQA)", "Video (Video-MME)", "Tool Use (BFCL V3)", "Web Agent (BrowserGym)", "Long Context (InfiniteBench)", "Human Pref (Arena Hard)"];

const radarDatasets = [
  { label: "GPT-5.6 Sol", data: [92, 95, 96, 68, 95, 90, 95, 88, 96, 85, 98, 95] },
  { label: "Claude Fable 5", data: [94, 92, 95, 65, 94, 88, 92, 85, 92, 90, 99, 93] },
  { label: "DeepSeek V4 Pro", data: [88, 90, 92, 72, 90, 85, 85, 78, 88, 75, 92, 91] },
  { label: "Qwen 3.7 Max", data: [85, 88, 90, 62, 88, 82, 88, 80, 90, 72, 95, 89] },
  { label: "Gemini 3.5 Flash", data: [75, 80, 85, 55, 85, 80, 88, 92, 85, 68, 90, 82] },
  { label: "GLM-5.2", data: [80, 82, 86, 58, 86, 78, 84, 75, 86, 70, 94, 85] }
];

// Richer Table with Real-world Benchmarks
const benchmarksTableHeadersZh = ["模型", "厂商", "LMSYS Elo", "SWE Verified (工程)", "Aider (代码)", "Arena Hard (盲测)", "ARC-AGI (逻辑)", "BrowserGym (智能体)", "InfiniteBench (长文)"];
const benchmarksTableHeadersEn = ["Model", "Vendor", "LMSYS Elo", "SWE Verified (Eng)", "Aider (Coding)", "Arena Hard (Pref)", "ARC-AGI (Logic)", "BrowserGym (Agent)", "InfiniteBench (Context)"];

const benchmarksTableRowsZh = [
  ["GPT-5.6 Sol", "OpenAI", "1450", "85.2%", "88.5%", "92.4%", "52.1%", "85.2%", "98.2% (512K)"],
  ["Claude Fable 5", "Anthropic", "1445", "88.0%", "85.2%", "90.5%", "48.5%", "90.0%", "99.0% (2M)"],
  ["DeepSeek V4 Pro", "DeepSeek", "1420", "78.5%", "82.1%", "88.2%", "55.8%", "75.4%", "93.5% (1M)"],
  ["Qwen 3.7 Max", "阿里巴巴", "1390", "75.2%", "80.0%", "85.6%", "45.0%", "72.2%", "95.1% (1M)"],
  ["Gemini 3.5 Flash", "Google", "1350", "65.0%", "70.5%", "78.5%", "35.5%", "68.5%", "91.0% (1M)"],
  ["GLM-5.2", "智谱AI", "1365", "68.5%", "72.0%", "80.0%", "38.0%", "70.0%", "94.2% (1M)"]
];

const benchmarksTableRowsEn = [
  ["GPT-5.6 Sol", "OpenAI", "1450", "85.2%", "88.5%", "92.4%", "52.1%", "85.2%", "98.2% (512K)"],
  ["Claude Fable 5", "Anthropic", "1445", "88.0%", "85.2%", "90.5%", "48.5%", "90.0%", "99.0% (2M)"],
  ["DeepSeek V4 Pro", "DeepSeek", "1420", "78.5%", "82.1%", "88.2%", "55.8%", "75.4%", "93.5% (1M)"],
  ["Qwen 3.7 Max", "Alibaba", "1390", "75.2%", "80.0%", "85.6%", "45.0%", "72.2%", "95.1% (1M)"],
  ["Gemini 3.5 Flash", "Google", "1350", "65.0%", "70.5%", "78.5%", "35.5%", "68.5%", "91.0% (1M)"],
  ["GLM-5.2", "Zhipu AI", "1365", "68.5%", "72.0%", "80.0%", "38.0%", "70.0%", "94.2% (1M)"]
];

zh.models.benchmarksTitle = "全维能力雷达与核心评测榜单";
zh.models.benchmarksSubtitle = "涵盖 SWE-bench、GPQA 等前沿高难度学术评测与 LMSYS 盲测数据";
zh.models.radarLabels = radarLabels;
zh.models.radarDatasets = radarDatasets;
zh.models.tableHeaders = benchmarksTableHeadersZh;
zh.models.tableRows = benchmarksTableRowsZh;
zh.models.tableTitle = "顶级大模型全景评测集矩阵";
zh.models.tableSubtitle = "基于 2026 年高难度评测基准（Benchmarks）与人工竞技场（Arena）最新跑分";

en.models.benchmarksTitle = "Omni-Capability Radar & Core Benchmarks";
en.models.benchmarksSubtitle = "Covering frontier hard-reasoning benchmarks like SWE-bench & GPQA alongside LMSYS Blind Tests";
en.models.radarLabels = radarLabelsEn;
en.models.radarDatasets = radarDatasets;
en.models.tableHeaders = benchmarksTableHeadersEn;
en.models.tableRows = benchmarksTableRowsEn;
en.models.tableTitle = "Top-Tier LLM Panoramic Benchmark Matrix";
en.models.tableSubtitle = "Latest benchmark scores focusing on 2026's hard reasoning datasets and Arena Elo";

fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
console.log("Locales updated with richer benchmarks!");
