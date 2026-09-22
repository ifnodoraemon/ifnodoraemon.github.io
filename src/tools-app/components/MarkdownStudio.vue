<template>
  <div class="terminal-window markdown-window" id="markdown-editor-app">
    <!-- Header -->
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: markdown_studio.sh --mode=live_render</div>
      <div class="terminal-actions">
        <span class="status-indicator live"><span class="status-pulse"></span>LIVE RENDER</span>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="md-toolbar">
      <div class="toolbar-left">
        <div class="template-selector">
          <label class="toolbar-label">{{ isEn ? 'Preset:' : '预设模板：' }}</label>
          <select v-model="selectedTemplate" class="cyber-select" @change="applyTemplate">
            <option value="">{{ isEn ? 'Select Template' : '选择预设模板' }}</option>
            <option value="article">{{ isEn ? 'Technical Deep Dive' : '深度技术长文' }}</option>
            <option value="agent">{{ isEn ? 'Agent System Prompt' : 'Agent 架构规范' }}</option>
            <option value="readme">{{ isEn ? 'GitHub README' : '开源项目 README' }}</option>
            <option value="math">{{ isEn ? 'Math & Formulas' : '数学公式推导' }}</option>
            <option value="wechat">{{ isEn ? 'WeChat / Zhihu Layout' : '公众号极简排版' }}</option>
          </select>
        </div>

        <div class="view-mode-toggle">
          <button type="button" class="mode-btn" :class="{ active: viewMode === 'split' }" @click="viewMode = 'split'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/></svg>
            <span>{{ isEn ? 'Split' : '双栏' }}</span>
          </button>
          <button type="button" class="mode-btn" :class="{ active: viewMode === 'edit' }" @click="viewMode = 'edit'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>{{ isEn ? 'Edit' : '编辑' }}</span>
          </button>
          <button type="button" class="mode-btn" :class="{ active: viewMode === 'preview' }" @click="viewMode = 'preview'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>{{ isEn ? 'Preview' : '预览' }}</span>
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <button type="button" class="tool-btn btn-highlight btn-sm" @click="copyWeChat">
          ✨ {{ isEn ? 'Copy Rich Text' : '复制微信/知乎富文本' }}
        </button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="copyMarkdown">
          {{ isEn ? 'Copy MD' : '复制 Markdown' }}
        </button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="downloadHtml">
          {{ isEn ? 'Export HTML' : '导出 HTML' }}
        </button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="printPdf">
          {{ isEn ? 'Print PDF' : '无损 PDF 打印' }}
        </button>
      </div>
    </div>

    <!-- Quick Format Snippet Bar -->
    <div class="format-snippets-bar">
      <button type="button" class="snippet-btn" @click="insertSnippet('h1')">H1</button>
      <button type="button" class="snippet-btn" @click="insertSnippet('h2')">H2</button>
      <button type="button" class="snippet-btn" @click="insertSnippet('h3')">H3</button>
      <span class="divider"></span>
      <button type="button" class="snippet-btn bold" @click="insertSnippet('bold')">B</button>
      <button type="button" class="snippet-btn italic" @click="insertSnippet('italic')">I</button>
      <button type="button" class="snippet-btn strike" @click="insertSnippet('strike')">S</button>
      <button type="button" class="snippet-btn" @click="insertSnippet('quote')">❝</button>
      <button type="button" class="snippet-btn" @click="insertSnippet('code')">&lt;&gt;</button>
      <button type="button" class="snippet-btn" @click="insertSnippet('codeblock')">```{ }</button>
      <span class="divider"></span>
      <button type="button" class="snippet-btn" @click="insertSnippet('table')">▦ Table</button>
      <button type="button" class="snippet-btn" @click="insertSnippet('link')">🔗 Link</button>
      <button type="button" class="snippet-btn" @click="insertSnippet('image')">🖼 Image</button>
      <button type="button" class="snippet-btn" @click="insertSnippet('math')">∑ Formula</button>
      <button type="button" class="snippet-btn" @click="insertSnippet('mermaid')">📊 Mermaid</button>
    </div>

    <!-- Dual Panes (Edit & Preview) -->
    <div class="md-workspace" :class="`mode-${viewMode}`">
      <!-- Editor Pane -->
      <div v-show="viewMode !== 'preview'" class="pane edit-pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="pane-indicator"></span>
            <span>{{ isEn ? 'Markdown Source' : 'Markdown 源文本' }}</span>
          </div>
          <div class="editor-stats">
            <span>{{ wordCount }} {{ isEn ? 'words' : '字' }}</span>
            <span class="stat-sep">/</span>
            <span>~{{ readTime }} {{ isEn ? 'min' : '分钟阅读' }}</span>
            <button type="button" class="tool-icon-btn" @click="markdownSource = ''" :title="isEn ? 'Clear' : '清空'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            </button>
          </div>
        </div>
        <div class="editor-wrap">
          <textarea
            ref="editorTextareaRef"
            v-model="markdownSource"
            class="markdown-textarea"
            :placeholder="isEn ? 'Write or paste Markdown here...' : '在此撰写或粘贴 Markdown...'"
            spellcheck="false"
          ></textarea>
        </div>
      </div>

      <!-- Preview Pane -->
      <div v-show="viewMode !== 'edit'" class="pane preview-pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="pane-indicator preview"></span>
            <span>{{ isEn ? 'Live Formatted Preview' : '实时排版预览' }}</span>
          </div>
        </div>
        <div class="preview-scroll-box" ref="previewBoxRef">
          <div class="article-content markdown-body" v-html="renderedHtml"></div>
        </div>
      </div>
    </div>

    <div v-if="toastMsg" class="toast-popup">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Marked } from 'marked';
import hljs from 'highlight.js/lib/common';
import markedKatex from '../../assets/js/utils/marked-katex.js';

const props = defineProps({
  lang: { type: String, default: 'zh' },
  isEn: { type: Boolean, default: false }
});

const viewMode = ref('split');
const selectedTemplate = ref('article');
const toastMsg = ref('');
const editorTextareaRef = ref(null);
const previewBoxRef = ref(null);

// Initialize Marked with KaTeX & Highlight.js
const marked = new Marked();
marked.use(markedKatex({ throwOnError: false }));

marked.setOptions({
  gfm: true,
  breaks: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      } catch (e) {}
    }
    try {
      return hljs.highlightAuto(code).value;
    } catch (e) {
      return code;
    }
  }
});

const PRESETS = {
  zh: {
    article: `# 《生产级 AI Agent 架构设计与工程实战》

> **摘要**：探讨 2026 年企业级 AI Agent 在状态机调度、工具协议（MCP）及长期记忆系统上的架构选型与高并发演进。

---

## 1. 架构总览与状态流转

在构建复杂的自主智能体时，单靠 Prompt 循环无法保障确定性。我们采用显式状态机进行执行流解耦：

\`\`\`mermaid
flowchart TD
  Init([任务接收]) --> Plan[规划与意图识别]
  Plan --> ToolExec{调用工具?}
  ToolExec -- 是 --> MCP[MCP 协议调度]
  MCP --> Observe[环境反馈收集]
  Observe --> Reflect{反思自省}
  Reflect -- 需重试 --> Plan
  Reflect -- 正常 --> Gen[结果综合输出]
  ToolExec -- 否 --> Gen
  Gen --> Complete([任务归档])
\`\`\`

---

## 2. 核心状态机调度代码

以下为基于 TypeScript 实现的核心 Agent 执行循环：

\`\`\`typescript
interface AgentState {
  step: number;
  maxSteps: number;
  memory: Array<{ role: string; content: string }>;
  status: 'IDLE' | 'THINKING' | 'EXECUTING' | 'DONE';
}

export async function runAgentLoop(state: AgentState): Promise<string> {
  while (state.step < state.maxSteps && state.status !== 'DONE') {
    state.step++;
    console.log(\`[Loop] Step \${state.step} | Status: \${state.status}\`);
    
    // 模拟思考与决策
    const decision = await llmReason(state.memory);
    if (decision.isTerminal) {
      state.status = 'DONE';
      return decision.finalAnswer;
    }
  }
  return "Exceeded maximum evaluation budget.";
}
\`\`\`

---

## 3. 数学理论与注意力衰减

长程记忆检索相关度衰减公式采用双曲余弦权重：

$$S(q, k) = \\frac{q \\cdot k^T}{\\sqrt{d_k}} \\cdot \\exp\\left( -\\lambda \\cdot \\Delta t \\right)$$

其中 $\\lambda = 0.05$ 为时间惩罚衰减因子，$\\Delta t$ 为上下文步长间隔。当 $\\Delta t > 100$ 时触发分级归档压缩。

---

## 4. 2026 前沿模型架构基准横评

| 模型架构 | 上下文窗口 | SWE-bench 解决率 | 典型推理延迟 (TTFT) | 单百万 Token 成本 |
| :--- | :--- | :--- | :--- | :--- |
| **DeepSeek-V4-Pro** | 128K | 84.5% | 180ms | $0.25 |
| **Kimi K3 (2.8T)** | 256K | 83.2% | 210ms | $0.20 |
| **Claude Fable 5.1** | 200K | 86.1% | 240ms | $1.80 |
| **GPT-6 Astra** | 512K | 88.0% | 310ms | $3.50 |

---

## 常见问题 (FAQ)

### Q: 如何保证 Agent 工具调用的确定性？
通过结构化 JSON Schema 约束配合严格的重试降级策略。当工具执行报错时，注入错误栈至观察上下文中让模型自我修复。
`,
    agent: `# AI Agent 架构规范与系统提示词（System Prompt）模板

## 1. 智能体元信息定义
- **Agent 名称**: DevOps-AutoPilot-Agent
- **版本**: 2.4.0 (2026 Production)
- **协议标准**: Model Context Protocol (MCP 2026.1)
- **主模型**: DeepSeek-V4-Pro / GLM-5.3

---

## 2. 核心 System Prompt 规范结构

\`\`\`markdown
<identity>
你是一名拥有资深 Linux 系统工程与云原生架构经验的自动化运维智能体。
你的职责是精准分析生产告警、调用只读探针诊断异常，并在通过权限校验后执行修复动作。
</identity>

<guidelines>
1. 所有破坏性操作（如 rm, restart, scale-down）必须显式向人类操作员请求确认。
2. 每次工具调用后必须交叉验证环境回显，禁止在无证据支撑下推演结论。
3. 严格遵守绝对路径内链规范与审计日志记录。
</guidelines>
\`\`\`
`,
    readme: `# ⚡ High-Throughput LLM Serving Framework

High-throughput distributed LLM inference engine optimized for MoE models (DeepSeek-V4-Pro, Kimi K3) with native prefix caching and FP8 KV Cache compression.

## 🚀 Key Features

- **Extreme Throughput**: Continuous batching with Speculative Decoding (EAGLE-3).
- **Zero Memory Waste**: PagedAttention v3 with Chunked Prefill.
- **Hardware Agnostic**: Supports NVIDIA RTX 4090/5090, H100, H200, B200, and Ascend 910B/C.
`,
    math: `# Attention Mechanism & KV Cache Memory Calculations

## 1. Standard Scaled Dot-Product Attention

The attention score between query matrix $Q$ and key matrix $K$ is defined as:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V$$

## 2. KV Cache Memory Scaling Formula

$$\\text{Memory}_{\\text{KV}} = 2 \\times b \\times s \\times l \\times h_{\\text{kv}} \\times d_h \\times \\text{precision}$$
`,
    wechat: `# 为什么 2026 年自主智能体（Agent）彻底取代了传统工作流？

过去几年，很多开发者尝试用硬编码的 DAG 工作流来串联 LLM，然而在复杂多变的实际业务中，这种死板的流程频频崩溃。

> **核心转折**：基于状态机与 Model Context Protocol (MCP) 的动态规划智能体正在成为工业级首选。

## 极简行动派哲学

1. **动态意图推断**：由模型自主研判下一个工具调用；
2. **反思回路**：工具执行报错时自我更正参数；
3. **短期工作记忆**：保障跨轮次长程上下文准确不漂移。
`
  },
  en: {
    article: `# Architecture Design of Production-Grade AI Agents

> **Abstract**: A comprehensive architectural review of 2026 enterprise-grade autonomous agents, focusing on state machines, MCP protocols, and multi-tier memory hierarchies.

## 1. Executive Summary & Flow
In production environments, explicit state machines decouple the reasoning loop from fragile prompts:

\`\`\`mermaid
flowchart TD
  Init([Task Ingestion]) --> Plan[Planning & Intent Routing]
  Plan --> ToolExec{Invoke Tool?}
  ToolExec -- Yes --> MCP[MCP Dispatcher]
  MCP --> Observe[Environment Feedback]
  Observe --> Reflect{Self-Reflection}
  Reflect -- Retry --> Plan
  Reflect -- Pass --> Gen[Synthesize Output]
  ToolExec -- No --> Gen
  Gen --> Complete([Task Archive])
\`\`\`
`,
    agent: `# Enterprise AI Agent System Prompt Specification`,
    readme: `# ⚡ High-Throughput LLM Serving Framework`,
    math: `# Attention Mechanism & KV Cache Memory Calculations`,
    wechat: `# Why Autonomous Agents Are Dominating 2026 Engineering Workflows`
  }
};

const markdownSource = ref(PRESETS.zh.article);

function showToast(msg) {
  toastMsg.value = msg;
  setTimeout(() => { toastMsg.value = ''; }, 2000);
}

const renderedHtml = computed(() => {
  const src = markdownSource.value || '';
  try {
    return marked.parse(src);
  } catch (e) {
    return `<div class="error">Markdown Parsing Error: ${e.message}</div>`;
  }
});

const wordCount = computed(() => {
  const text = markdownSource.value || '';
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const western = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9_\-]+/g) || []).length;
  return cjk + western;
});

const readTime = computed(() => {
  return Math.max(1, Math.ceil(wordCount.value / 300));
});

function applyTemplate() {
  const langKey = props.isEn ? 'en' : 'zh';
  const tmpl = PRESETS[langKey][selectedTemplate.value];
  if (tmpl) {
    markdownSource.value = tmpl;
  }
}

function insertSnippet(type) {
  const el = editorTextareaRef.value;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const cur = markdownSource.value;
  const sel = cur.substring(start, end);

  const snippets = {
    h1: `# ${sel || 'Heading 1'}`,
    h2: `## ${sel || 'Heading 2'}`,
    h3: `### ${sel || 'Heading 3'}`,
    bold: `**${sel || 'bold text'}**`,
    italic: `*${sel || 'italic text'}*`,
    strike: `~~${sel || 'strikethrough text'}~~`,
    quote: `\n> ${sel || 'Quote text'}\n`,
    code: `\`${sel || 'inline code'}\``,
    codeblock: `\n\`\`\`typescript\n${sel || '// Code block'}\n\`\`\`\n`,
    table: `\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Value 1 | Value 2 |\n`,
    link: `[${sel || 'Link Title'}](https://blog.llmgo.top/)`,
    image: `![${sel || 'Alt text'}](https://blog.llmgo.top/og-image.png)`,
    math: `\n$$\n${sel || 'E = mc^2'}\n$$\n`,
    mermaid: `\n\`\`\`mermaid\nflowchart TD\n  A[Start] --> B[Execute]\n\`\`\`\n`
  };

  const insert = snippets[type] || '';
  markdownSource.value = cur.substring(0, start) + insert + cur.substring(end);
}

function copyWeChat() {
  const html = renderedHtml.value;
  if (!html) return;
  try {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([markdownSource.value], { type: 'text/plain' })
    });
    navigator.clipboard.write([item]).then(() => {
      showToast(props.isEn ? 'Copied rich text for WeChat/Zhihu!' : '已复制微信/知乎富文本！');
    });
  } catch (e) {
    navigator.clipboard.writeText(html).then(() => {
      showToast(props.isEn ? 'Copied HTML markup' : '已复制 HTML 富文本代码');
    });
  }
}

function copyMarkdown() {
  navigator.clipboard.writeText(markdownSource.value).then(() => {
    showToast(props.isEn ? 'Copied Markdown source' : '已复制 Markdown 源码');
  });
}

function downloadHtml() {
  const standalone = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Exported Article</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    body { max-width: 860px; margin: 40px auto; padding: 0 20px; font-family: -apple-system, sans-serif; line-height: 1.7; color: #1e293b; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #6366f1; margin: 0; padding-left: 16px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  ${renderedHtml.value}
</body>
</html>`;

  const blob = new Blob([standalone], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'article_export.html';
  a.click();
  showToast(props.isEn ? 'Exported standalone HTML!' : '已导出独立 HTML 文件！');
}

function printPdf() {
  window.print();
}
</script>

<style scoped>
.markdown-window {
  background: rgba(10, 12, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
}

.md-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.template-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
}

.view-mode-toggle {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 2px;
}

.mode-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  padding: 4px 10px;
  font-size: 0.78rem;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.mode-btn.active {
  background: #6366f1;
  color: #ffffff;
}

.format-snippets-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
}

.snippet-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  color: var(--text-muted, #94a3b8);
  padding: 2px 8px;
  font-size: 0.76rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.snippet-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
}

.snippet-btn.bold { font-weight: 700; }
.snippet-btn.italic { font-style: italic; }
.snippet-btn.strike { text-decoration: line-through; }

.divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 4px;
}

.md-workspace {
  display: flex;
  min-height: 540px;
}

.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.edit-pane {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 10, 15, 0.4);
}

.preview-pane {
  background: rgba(12, 14, 22, 0.35);
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.pane-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #e2e8f0;
}

.pane-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6366f1;
}

.pane-indicator.preview {
  background: #38bdf8;
}

.editor-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  font-family: var(--font-mono, monospace);
}

.editor-wrap {
  flex: 1;
  display: flex;
}

.markdown-textarea {
  width: 100%;
  flex: 1;
  background: transparent;
  border: none;
  padding: 16px;
  color: #f1f5f9;
  font-family: var(--font-mono, monospace);
  font-size: 0.9rem;
  line-height: 1.7;
  resize: none;
  outline: none;
}

.preview-scroll-box {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  max-height: 700px;
}

.toast-popup {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: rgba(16, 185, 129, 0.92);
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  z-index: 9999;
}

@media (max-width: 900px) {
  .md-workspace {
    flex-direction: column;
  }
  .edit-pane {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
