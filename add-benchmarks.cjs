const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const radarLabels = ["代码生成 (HumanEval)", "数学推理 (MATH)", "通用知识 (MMLU)", "指令遵循 (IFEval)", "多智能体 (AgentBench)", "超长文本 (Needle)"];
const radarLabelsEn = ["Coding (HumanEval)", "Math (MATH)", "Knowledge (MMLU)", "Instruction (IFEval)", "Multi-Agent (AgentBench)", "Long Context (Needle)"];

const radarDatasets = [
  { label: "GPT-5.6 Sol", data: [96, 92, 94, 95, 93, 98] },
  { label: "Claude Fable 5", data: [95, 88, 92, 96, 95, 99] },
  { label: "DeepSeek V4 Pro", data: [95, 96, 91, 92, 88, 90] },
  { label: "Qwen 3.7 Max", data: [90, 89, 90, 91, 85, 92] }
];

const benchmarksTableHeadersZh = ["模型", "MMLU (知识)", "HumanEval (代码)", "MATH (数学)", "AgentBench (智能体)", "上下文有效窗口"];
const benchmarksTableHeadersEn = ["Model", "MMLU (Knowledge)", "HumanEval (Coding)", "MATH (Math)", "AgentBench (Agentic)", "Effective Context"];

const benchmarksTableRowsZh = [
  ["GPT-5.6 Sol", "94.2%", "96.5%", "92.1%", "93.4%", "512K (完美)"],
  ["Claude Fable 5", "92.8%", "95.0%", "88.5%", "95.2%", "2M (完美)"],
  ["DeepSeek V4 Pro", "91.5%", "95.5%", "96.8%", "88.1%", "128K (优秀)"],
  ["Qwen 3.7 Max", "90.2%", "90.5%", "89.0%", "85.6%", "256K (优秀)"],
  ["Gemini 3.5 Flash", "86.5%", "84.2%", "82.5%", "80.4%", "1M (良好)"],
  ["GLM-5.2", "88.1%", "85.5%", "84.0%", "87.5%", "1M (优秀)"]
];

const benchmarksTableRowsEn = [
  ["GPT-5.6 Sol", "94.2%", "96.5%", "92.1%", "93.4%", "512K (Perfect)"],
  ["Claude Fable 5", "92.8%", "95.0%", "88.5%", "95.2%", "2M (Perfect)"],
  ["DeepSeek V4 Pro", "91.5%", "95.5%", "96.8%", "88.1%", "128K (Excellent)"],
  ["Qwen 3.7 Max", "90.2%", "90.5%", "89.0%", "85.6%", "256K (Excellent)"],
  ["Gemini 3.5 Flash", "86.5%", "84.2%", "82.5%", "80.4%", "1M (Good)"],
  ["GLM-5.2", "88.1%", "85.5%", "84.0%", "87.5%", "1M (Excellent)"]
];

zh.models.benchmarksTitle = "模型能力雷达与评测榜单";
zh.models.benchmarksSubtitle = "主流评测集多维度客观数据横评";
zh.models.radarLabels = radarLabels;
zh.models.radarDatasets = radarDatasets;
zh.models.tableHeaders = benchmarksTableHeadersZh;
zh.models.tableRows = benchmarksTableRowsZh;
zh.models.tableTitle = "顶级大模型评测集能力矩阵表";
zh.models.tableSubtitle = "基于 2026 年最新架构的标杆模型横向跑分对比";

en.models.benchmarksTitle = "Model Capability Radar & Benchmarks";
en.models.benchmarksSubtitle = "Multi-dimensional objective data comparison across mainstream benchmarks";
en.models.radarLabels = radarLabelsEn;
en.models.radarDatasets = radarDatasets;
en.models.tableHeaders = benchmarksTableHeadersEn;
en.models.tableRows = benchmarksTableRowsEn;
en.models.tableTitle = "Top-Tier LLM Benchmark Matrix";
en.models.tableSubtitle = "Benchmark comparison based on the latest 2026 architectures";

fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
console.log("Locales updated with benchmarks!");
