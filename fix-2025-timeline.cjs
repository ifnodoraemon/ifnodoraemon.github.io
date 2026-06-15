const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const new2025En = [
  { "date": "2025.12.17", "name": "Gemini 3 Flash", "desc": "Google releases the third generation of its efficient Flash model", "latest": false },
  { "date": "2025.08.07", "name": "GPT-5", "desc": "OpenAI officially releases the long-awaited GPT-5 foundation model", "latest": false },
  { "date": "2025.05.22", "name": "Claude 4 Opus & Sonnet", "desc": "Anthropic introduces the powerful Claude 4 model family", "latest": false },
  { "date": "2025.02.20", "name": "Claude 3.7 & Grok 3", "desc": "Major reasoning models released emphasizing test-time compute", "latest": false },
  { "date": "2025.02.05", "name": "Gemini 2.0 Flash", "desc": "Google officially releases Gemini 2.0 Flash and Flash-Lite", "latest": false }
];

const new2025Zh = [
  { "date": "2025.12.17", "name": "Gemini 3 Flash", "desc": "Google 发布第三代高效全模态模型 Gemini 3 Flash", "latest": false },
  { "date": "2025.08.07", "name": "GPT-5", "desc": "OpenAI 正式发布备受瞩目的跨时代基座大模型 GPT-5", "latest": false },
  { "date": "2025.05.22", "name": "Claude 4 Opus & Sonnet", "desc": "Anthropic 推出性能飞跃的 Claude 4 系列大模型", "latest": false },
  { "date": "2025.02.20", "name": "Claude 3.7 & Grok 3", "desc": "强化推理能力（Test-time Compute）的大模型密集发布", "latest": false },
  { "date": "2025.02.05", "name": "Gemini 2.0 Flash", "desc": "Google 正式向全球推送 Gemini 2.0 Flash 系列", "latest": false }
];

function mergeTimeline(existing, additions) {
  // Add new items, removing any existing ones with the same exact name to avoid duplicates
  const filtered = existing.filter(e => !additions.some(a => a.name === e.name));
  const combined = filtered.concat(additions);
  // Sort descending
  return combined.sort((a, b) => b.date.localeCompare(a.date));
}

en.models.timeline = mergeTimeline(en.models.timeline, new2025En);
zh.models.timeline = mergeTimeline(zh.models.timeline, new2025Zh);

// Also fix Llama 4 Scout timeline text in english to match closed source
const llamaEnIndex = en.models.timeline.findIndex(x => x.name === "Llama 4 Scout");
if (llamaEnIndex !== -1) {
    en.models.timeline[llamaEnIndex].desc = "Meta introduces an unprecedented 10M context window via its closed-source API";
}

const llamaZhIndex = zh.models.timeline.findIndex(x => x.name === "Llama 4 Scout");
if (llamaZhIndex !== -1) {
    zh.models.timeline[llamaZhIndex].desc = "Meta 发布支持 1000 万 Token 的闭源 API 模型";
}

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
console.log('2025 models successfully integrated into timelines.');
