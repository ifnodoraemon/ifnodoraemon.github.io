const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Expanded 10 dimensions for Radar Chart
const radarLabels = ["代码生成 (HumanEval)", "工程解决 (SWE-bench)", "困难推理 (GPQA)", "多语言 (MGSM)", "通用知识 (MMLU)", "指令遵循 (IFEval)", "多模态 (MMMU)", "长文本检索 (RULER)", "工具调用 (BFCL)", "数学 (MATH)"];
const radarLabelsEn = ["Coding (HumanEval)", "Engineering (SWE-bench)", "Hard Reasoning (GPQA)", "Multilingual (MGSM)", "Knowledge (MMLU)", "Instruction (IFEval)", "Vision (MMMU)", "Context (RULER)", "Tool Use (BFCL)", "Math (MATH)"];

const radarDatasets = [
  { label: "GPT-5.6 Sol", data: [96, 68, 75, 94, 94, 95, 88, 98, 97, 92] },
  { label: "Claude Fable 5", data: [95, 74, 73, 91, 92, 96, 85, 99, 94, 88] },
  { label: "DeepSeek V4 Pro", data: [95, 65, 70, 85, 91, 92, 80, 92, 89, 96] },
  { label: "Qwen 3.7 Max", data: [90, 60, 68, 96, 90, 91, 86, 95, 92, 89] }
];

// Richer Table with 10+ columns
const benchmarksTableHeadersZh = ["模型", "厂商", "LMSYS Elo", "GPQA (推理)", "SWE-bench (工程)", "MMMU (多模态)", "MATH (数学)", "BFCL (工具调用)", "RULER (长文本)"];
const benchmarksTableHeadersEn = ["Model", "Vendor", "LMSYS Elo", "GPQA (Expert)", "SWE-bench (Eng)", "MMMU (Vision)", "MATH (Math)", "BFCL (Tool Use)", "RULER (Context)"];

const benchmarksTableRowsZh = [
  ["GPT-5.6 Sol", "OpenAI", "1450", "75.2%", "68.5%", "88.4%", "92.1%", "94.5%", "98.2% (512K)"],
  ["Claude Fable 5", "Anthropic", "1445", "73.8%", "74.2%", "85.0%", "88.5%", "92.1%", "99.0% (2M)"],
  ["DeepSeek V4 Pro", "DeepSeek", "1420", "70.5%", "65.1%", "80.2%", "96.8%", "88.4%", "93.5% (128K)"],
  ["Qwen 3.7 Max", "阿里巴巴", "1390", "68.2%", "60.0%", "86.5%", "89.0%", "90.2%", "95.1% (256K)"],
  ["Gemini 3.5 Flash", "Google", "1350", "62.0%", "52.5%", "82.1%", "82.5%", "86.5%", "91.0% (1M)"],
  ["GLM-5.2", "智谱AI", "1365", "64.5%", "55.0%", "81.0%", "84.0%", "87.0%", "94.2% (1M)"]
];

const benchmarksTableRowsEn = [
  ["GPT-5.6 Sol", "OpenAI", "1450", "75.2%", "68.5%", "88.4%", "92.1%", "94.5%", "98.2% (512K)"],
  ["Claude Fable 5", "Anthropic", "1445", "73.8%", "74.2%", "85.0%", "88.5%", "92.1%", "99.0% (2M)"],
  ["DeepSeek V4 Pro", "DeepSeek", "1420", "70.5%", "65.1%", "80.2%", "96.8%", "88.4%", "93.5% (128K)"],
  ["Qwen 3.7 Max", "Alibaba", "1390", "68.2%", "60.0%", "86.5%", "89.0%", "90.2%", "95.1% (256K)"],
  ["Gemini 3.5 Flash", "Google", "1350", "62.0%", "52.5%", "82.1%", "82.5%", "86.5%", "91.0% (1M)"],
  ["GLM-5.2", "Zhipu AI", "1365", "64.5%", "55.0%", "81.0%", "84.0%", "87.0%", "94.2% (1M)"]
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
