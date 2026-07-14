const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Expanded 12 dimensions for Radar Chart (2026 Pro Versions)
const radarLabels = ["代码 (HumanEval-Plus)", "工程 (SWE-bench Pro)", "困难推理 (GPQA Diamond)", "实时评测 (LiveBench)", "硬核知识 (MMLU-Pro)", "视觉 (MMMU-Pro)", "视觉数学 (MathVista)", "长文本 (RULER)", "多智能体 (WebArena)", "工具 (BFCL V2)", "纯数学 (MATH 500)", "多语言 (MGSM)"];
const radarLabelsEn = ["Coding (HE-Plus)", "Eng (SWE-bench Pro)", "Reasoning (GPQA Diamond)", "Real-time (LiveBench)", "Knowledge (MMLU-Pro)", "Vision (MMMU-Pro)", "Visual Math (MathVista)", "Context (RULER)", "Agentic (WebArena)", "Tool Use (BFCL V2)", "Math (MATH 500)", "Multilingual (MGSM)"];

const radarDatasets = [
  { label: "GPT-5.6 Sol", data: [94, 65, 78, 88, 85, 82, 80, 98, 85, 95, 90, 94] },
  { label: "Claude Fable 5", data: [92, 70, 75, 85, 84, 80, 75, 99, 90, 92, 86, 91] },
  { label: "DeepSeek V4 Pro", data: [95, 60, 70, 80, 82, 72, 78, 92, 75, 85, 95, 85] },
  { label: "Qwen 3.7 Max", data: [88, 55, 65, 78, 80, 78, 70, 95, 70, 90, 85, 96] },
  { label: "Gemini 3.5 Flash", data: [82, 45, 60, 75, 78, 76, 72, 91, 65, 84, 78, 86] },
  { label: "GLM-5.2", data: [84, 50, 62, 72, 76, 70, 68, 94, 80, 85, 80, 88] }
];

// Richer Table with Pro Benchmarks
const benchmarksTableHeadersZh = ["模型", "厂商", "LMSYS Elo", "GPQA Diamond", "SWE-bench Pro", "MMLU-Pro", "LiveBench", "MathVista", "WebArena", "RULER (窗口)"];
const benchmarksTableHeadersEn = ["Model", "Vendor", "LMSYS Elo", "GPQA Diamond", "SWE-bench Pro", "MMLU-Pro", "LiveBench", "MathVista", "WebArena", "RULER (Context)"];

const benchmarksTableRowsZh = [
  ["GPT-5.6 Sol", "OpenAI", "1450", "78.2%", "65.5%", "85.4%", "88.1%", "80.4%", "85.2%", "98.2% (512K)"],
  ["Claude Fable 5", "Anthropic", "1445", "75.8%", "70.2%", "84.0%", "85.5%", "75.5%", "90.0%", "99.0% (2M)"],
  ["DeepSeek V4 Pro", "DeepSeek", "1420", "70.5%", "60.1%", "82.2%", "80.8%", "78.1%", "75.4%", "93.5% (1M)"],
  ["Qwen 3.7 Max", "阿里巴巴", "1390", "65.2%", "55.0%", "80.5%", "78.0%", "70.6%", "70.2%", "95.1% (1M)"],
  ["Gemini 3.5 Flash", "Google", "1350", "60.0%", "45.5%", "78.1%", "75.5%", "72.4%", "65.5%", "91.0% (1M)"],
  ["GLM-5.2", "智谱AI", "1365", "62.5%", "50.0%", "76.0%", "72.0%", "68.0%", "80.0%", "94.2% (1M)"]
];

const benchmarksTableRowsEn = [
  ["GPT-5.6 Sol", "OpenAI", "1450", "78.2%", "65.5%", "85.4%", "88.1%", "80.4%", "85.2%", "98.2% (512K)"],
  ["Claude Fable 5", "Anthropic", "1445", "75.8%", "70.2%", "84.0%", "85.5%", "75.5%", "90.0%", "99.0% (2M)"],
  ["DeepSeek V4 Pro", "DeepSeek", "1420", "70.5%", "60.1%", "82.2%", "80.8%", "78.1%", "75.4%", "93.5% (1M)"],
  ["Qwen 3.7 Max", "Alibaba", "1390", "65.2%", "55.0%", "80.5%", "78.0%", "70.6%", "70.2%", "95.1% (1M)"],
  ["Gemini 3.5 Flash", "Google", "1350", "60.0%", "45.5%", "78.1%", "75.5%", "72.4%", "65.5%", "91.0% (1M)"],
  ["GLM-5.2", "Zhipu AI", "1365", "62.5%", "50.0%", "76.0%", "72.0%", "68.0%", "80.0%", "94.2% (1M)"]
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
