import { Marked } from 'marked';
import hljs from 'highlight.js/lib/common';
import markedKatex from '../utils/marked-katex.js';

// Predefined Markdown Templates
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

<tools_declaration>
- \`probe_cluster_health(namespace: string)\`: 巡检指定命名空间内的 Pod 与 Node 指标
- \`query_trace_logs(trace_id: string, limit: number)\`: 提取微服务全链路追踪快照
- \`apply_canary_rollback(service_name: string)\`: 自动化金丝雀发布回滚指令
</tools_declaration>
\`\`\`

---

## 3. 约束与检查清单

- [x] 实现了客户端沙箱隔离
- [x] 配置了超时中断机制（默认 30s）
- [x] 接入了 OpenTelemetry 语义化 Tracing
- [ ] 开启多智能体多数表决（Consensus Verification）
`,

    readme: `# 🚀 High-Throughput Markdown Engine

[![Version](https://img.shields.io/badge/version-2.4.0-blue.svg)](https://blog.llmgo.top)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)
[![KaTeX](https://img.shields.io/badge/math-KaTeX--0.18-orange.svg)](https://katex.org)

基于轻量级 Vite、Marked 与 KaTeX 定制的超高速在线 Markdown 渲染排版器与跨平台多格式导出中心。

---

## ✨ 核心特性

- ⚡ **零延迟即时预览**：极速响应，实时解析语法与公式。
- 📱 **一键富文本直出**：深度兼容微信公众号、知乎专栏、语雀与飞书排版。
- 🧮 **全功能 KaTeX 数学渲染**：支持单行行内公式与跨行复杂数学矩阵。
- 📄 **离线自包含导出**：一键生成免外部依赖的纯静态 HTML 或出版级 PDF。
- 🔒 **隐私第一沙箱**：全流程纯前端浏览器运行，零服务器内容上传。

---

## 🛠️ 快速上手

\`\`\`bash
# 安装依赖
npm install

# 启动本地实时热重载开发环境
npm run dev

# 静态生产构建与自动化 Technical SEO 冒烟校验
npm run build && npm run test:smoke
\`\`\`

---

## 📊 技术栈

| 核心组件 | 版本 | 职责 |
| :--- | :--- | :--- |
| **Marked** | \`^17.0.4\` | Markdown 词法分析与 AST 构建 |
| **Highlight.js** | \`^11.12.0\` | 多语言语义语法高亮与 Token 渲染 |
| **KaTeX** | \`^0.18.7\` | 零延迟 LaTeX 数学排版引擎 |
| **Vite** | \`^7.3.1\` | 现代化打包与代码分块优化 |

---

## 📜 开源协议

本项目基于 [ISC License](LICENSE) 开源。欢迎贡献 PR 与 Issue！
`,

    math: `# 🧮 深度学习与统计推导数学公式集

## 1. 深度强化学习 GRPO 优化目标

Group Relative Policy Optimization (GRPO) 抛弃了传统 Critic 价值网络，直接在候选回复组内进行优势归一化：

$$\\mathcal{L}_{\\text{GRPO}}(\\theta) = \\mathbb{E}_{q \\sim P, \\{o_i\\}_{i=1}^G \\sim \\pi_{\\theta_{\\text{old}}}} \\left[ \\frac{1}{G} \\sum_{i=1}^G \\min \\left( r_i(\\theta) \\hat{A}_i, \\text{clip}(r_i(\\theta), 1-\\epsilon, 1+\\epsilon) \\hat{A}_i \\right) - \\beta D_{\\text{KL}}(\\pi_\\theta \\parallel \\pi_{\\text{ref}}) \\right]$$

其中优势估计 $\\hat{A}_i$ 仅依赖同批次组奖励分布的均值与方差：

$$\\hat{A}_i = \\frac{R_i - \\text{mean}(\\{R_1, \\dots, R_G\\})}{\\text{std}(\\{R_1, \\dots, R_G\\}) + 10^{-8}}$$

---

## 2. Transformer 缩放点积注意力与 Softmax

标准注意力矩阵计算：

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left( \\frac{QK^T}{\\sqrt{d_k}} \\right) V$$

行内变量如输入维度 $d_{\\text{model}} = 4096$、头数 $h = 32$，则单头注意力维度为 $d_k = 128$。

---

## 3. 信息论 KL 散度与熵

连续概率分布 $P$ 与 $Q$ 之间的 Kullback-Leibler 散度定义为：

$$D_{\\text{KL}}(P \\parallel Q) = \\int_{-\\infty}^{+\\infty} p(x) \\log \\left( \\frac{p(x)}{q(x)} \\right) dx$$

根据吉布斯不等式，显然满足 $D_{\\text{KL}}(P \\parallel Q) \\ge 0$，当且仅当 $P = Q$ 几乎处处成立时等号成立。
`,

    wechat: `# ⚡ 2026 大模型推理加速实战：从 vLLM 到投机采样

> **核心观点**：在 2026 年的推理服务生产架构中，单纯堆砌 GPU 算力已无法打破成本瓶颈。**投机采样 (Speculative Decoding)** 与 **前缀缓存 (Prefix Caching)** 的结合可将 TTFT 降低 65% 以上。

---

## 💡 为什么传统自回归解码慢？

传统大模型自回归解码（Autoregressive Decoding）是典型的 **内存带宽瓶颈（Memory Bandwidth Bound）** 场景：

1. 每生成一个 Token，都需要从显存（HBM）中读取数十 GB 的模型参数矩阵。
2. 计算算力（TFLOPS）的实际利用率甚至不足 15%。
3. 批处理尺寸（Batch Size）越大，KV Cache 挤占显存越严重。

---

## 🛠️ 投机采样加速核心原理

投机采样引入一个轻量级的 Draft Model（例如 1.5B 参数），它快速前向预测生成 $K$ 个推测候选 Token，随后主模型仅需进行**单次前向并行验证**：

\`\`\`python
def speculative_step(draft_model, target_model, prompt_tokens, K=5):
    # 1. 辅助模型极速自回归推测 K 个 Token
    draft_tokens = draft_model.generate_speculative(prompt_tokens, steps=K)
    
    # 2. 目标主模型单次前向计算全部候选概率
    target_logits = target_model.forward_parallel(prompt_tokens + draft_tokens)
    
    # 3. 接受/拒绝采样循环
    accepted = []
    for i, token in enumerate(draft_tokens):
        prob_target = softmax(target_logits[i])[token]
        prob_draft = draft_model.get_prob(token)
        if random.random() < min(1.0, prob_target / prob_draft):
            accepted.append(token)
        else:
            break
            
    return accepted
\`\`\`

---

## 📈 压测效果对比

| 优化策略 | 首字延迟 (TTFT) | 吞吐量 (tokens/s) | 显存节省率 | 综合性价比 |
| :--- | :--- | :--- | :--- | :--- |
| **原生 FP16 推理** | 450ms | 32.5 | 0% | 1.0x (基准) |
| **PagedAttention** | 280ms | 68.0 | 38% | 2.1x |
| **投机采样 (1.5B+70B)** | 140ms | 115.2 | 45% | **3.5x** |

---

> 💡 **作者提示**：本文代码已在本站博客生产验证。欢迎在微信公众号后台直接阅读并交流大模型工程落地经验！
`
  },

  en: {
    article: `# Architectural Patterns for Production AI Agents in 2026

> **Abstract**: An empirical deep dive into state machine control flow, the Model Context Protocol (MCP), and durable memory subsystems for production AI agents.

---

## 1. Execution Loop & State Topology

For resilient agentic workflows, prompt-only loops fail due to non-deterministic drift. We employ an explicit state machine:

\`\`\`mermaid
flowchart TD
  Init([Trigger Received]) --> Plan[Planning & Intent]
  Plan --> ToolExec{Invoke Tool?}
  ToolExec -- Yes --> MCP[MCP Dispatcher]
  MCP --> Observe[Observation Ingestion]
  Observe --> Reflect{Reflection & Self-Correct}
  Reflect -- Retry Needed --> Plan
  Reflect -- Pass --> Gen[Synthesize Final Response]
  ToolExec -- No --> Gen
  Gen --> Complete([Task Finalized])
\`\`\`

---

## 2. Core State Machine Implementation

TypeScript implementation of the robust agent execution loop:

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
    
    const decision = await llmReason(state.memory);
    if (decision.isTerminal) {
      state.status = 'DONE';
      return decision.finalAnswer;
    }
  }
  return "Budget exceeded.";
}
\`\`\`

---

## 3. Mathematical Foundations: Relevance Decay

Temporal relevance decay for long-term associative memory retrieval:

$$S(q, k) = \\frac{q \\cdot k^T}{\\sqrt{d_k}} \\cdot \\exp\\left( -\\lambda \\cdot \\Delta t \\right)$$

where $\\lambda = 0.05$ represents the decay coefficient and $\\Delta t$ measures elapsed interaction steps.

---

## 4. Benchmark Matrix Across 2026 Frontier Models

| Model Architecture | Context Window | SWE-bench Verified | TTFT Latency | Cost / 1M Tokens |
| :--- | :--- | :--- | :--- | :--- |
| **DeepSeek-V4-Pro** | 128K | 84.5% | 180ms | $0.25 |
| **Kimi K3 (2.8T)** | 256K | 83.2% | 210ms | $0.20 |
| **Claude Fable 5.1** | 200K | 86.1% | 240ms | $1.80 |
| **GPT-6 Astra** | 512K | 88.0% | 310ms | $3.50 |

---

## Frequently Asked Questions (FAQ)

### Q: How do you guarantee tool execution determinism?
By enforcing strict JSON Schema validation coupled with exponential backoff retries. Execution errors are fed back into observation context for real-time model self-correction.
`,

    agent: `# AI Agent System Prompt & Architecture Specification

## 1. Metadata

- **Agent Name**: DevOps-AutoPilot-Agent
- **Version**: 2.4.0 (2026 Production)
- **Protocol**: Model Context Protocol (MCP 2026.1)
- **Primary LLM**: DeepSeek-V4-Pro / GLM-5.3

---

## 2. Core System Prompt Specification

\`\`\`markdown
<identity>
You are an autonomous Cloud Infrastructure & SRE Diagnostic Agent.
Your duty is to inspect anomalies, query telemetry via read-only tools, and suggest verified remediation plans.
</identity>

<guidelines>
1. Any destructive action requires explicit human confirmation.
2. Cross-verify every tool output before drawing operational conclusions.
3. Maintain immutable audit logs for every command execution.
</guidelines>

<tools_declaration>
- \`probe_cluster_health(namespace: string)\`: Inspect Pod and Node health metrics
- \`query_trace_logs(trace_id: string, limit: number)\`: Retrieve distributed tracing snapshot
- \`apply_canary_rollback(service_name: string)\`: Trigger automated canary rollback
</tools_declaration>
\`\`\`

---

## 3. Checklist

- [x] Client sandbox isolation active
- [x] Execution deadline configured (30s default)
- [x] OpenTelemetry semantic conventions mapped
- [ ] Multi-agent consensus verification enabled
`,

    readme: `# 🚀 High-Throughput Markdown Engine

[![Version](https://img.shields.io/badge/version-2.4.0-blue.svg)](https://blog.llmgo.top)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)
[![KaTeX](https://img.shields.io/badge/math-KaTeX--0.18-orange.svg)](https://katex.org)

Modern high-performance online Markdown studio and multi-format exporter engineered with Vite, Marked, and native KaTeX.

---

## ✨ Features

- ⚡ **Zero-Latency Live Preview**: Instant tokenization, formatting, and syntax rendering.
- 📱 **One-Click Rich-Text Export**: Formatted specifically for WeChat, Zhihu, and rich-text platforms.
- 🧮 **KaTeX Mathematical Typography**: Inline and display LaTeX equations with robust syntax guards.
- 📄 **Offline Standalone HTML**: Download portable, CSS-embedded HTML documents without remote script dependencies.
- 🔒 **Zero-Data-Upload Privacy**: Pure browser-side execution in a secure client sandbox.

---

## 🛠️ Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start local hot-reload dev server
npm run dev

# Production build and Technical SEO smoke audit
npm run build && npm run test:smoke
\`\`\`

---

## 📜 License

Distributed under the [ISC License](LICENSE). Contributions welcome!
`,

    math: `# 🧮 Theoretical Machine Learning & Mathematical Proofs

## 1. Group Relative Policy Optimization (GRPO)

GRPO eliminates the traditional value critic network, normalizing advantages across an ensemble of generated candidate outputs:

$$\\mathcal{L}_{\\text{GRPO}}(\\theta) = \\mathbb{E}_{q \\sim P, \\{o_i\\}_{i=1}^G \\sim \\pi_{\\theta_{\\text{old}}}} \\left[ \\frac{1}{G} \\sum_{i=1}^G \\min \\left( r_i(\\theta) \\hat{A}_i, \\text{clip}(r_i(\\theta), 1-\\epsilon, 1+\\epsilon) \\hat{A}_i \\right) - \\beta D_{\\text{KL}}(\\pi_\\theta \\parallel \\pi_{\\text{ref}}) \\right]$$

Group advantage estimation $\\hat{A}_i$:

$$\\hat{A}_i = \\frac{R_i - \\text{mean}(\\{R_1, \\dots, R_G\\})}{\\text{std}(\\{R_1, \\dots, R_G\\}) + 10^{-8}}$$

---

## 2. Scaled Dot-Product Attention

Standard Transformer attention formulation:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left( \\frac{QK^T}{\\sqrt{d_k}} \\right) V$$

With input dimension $d_{\\text{model}} = 4096$ and $h = 32$ attention heads, head dimension yields $d_k = 128$.
`,

    wechat: `# ⚡ Accelerating LLM Serving in 2026: Speculative Decoding Guide

> **Key Takeaway**: Pure GPU compute scaling hit a plateau. Combining **Speculative Decoding** with **Radix Prefix Caching** drops TTFT by over 65% in production.

---

## 💡 Why Is Autoregressive Decoding Memory-Bound?

Standard autoregressive token generation spends ~85% of execution time streaming model weights from high-bandwidth memory (HBM) into compute cores:

1. Every single generated token requires reading dozens of gigabytes of weights.
2. Tensor core utilization frequently stagnates below 15%.
3. Concurrent requests rapidly saturate KV Cache capacity.

---

## 🛠️ Speculative Decoding Architecture

A small draft model predicts $K$ speculative tokens, and the primary model verifies all candidates in a single parallel forward pass:

\`\`\`python
def speculative_step(draft_model, target_model, prompt_tokens, K=5):
    draft_tokens = draft_model.generate_speculative(prompt_tokens, steps=K)
    target_logits = target_model.forward_parallel(prompt_tokens + draft_tokens)
    
    accepted = []
    for i, token in enumerate(draft_tokens):
        prob_target = softmax(target_logits[i])[token]
        prob_draft = draft_model.get_prob(token)
        if random.random() < min(1.0, prob_target / prob_draft):
            accepted.append(token)
        else:
            break
            
    return accepted
\`\`\`

---

## 📈 Empirical Benchmarks

| Configuration | First Token Latency (TTFT) | Throughput (tok/s) | KV Cache Savings | Overall Speedup |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline FP16** | 450ms | 32.5 | 0% | 1.0x |
| **PagedAttention** | 280ms | 68.0 | 38% | 2.1x |
| **Speculative (1.5B+70B)** | 140ms | 115.2 | 45% | **3.5x** |
`
  }
};

const STORAGE_KEY = 'llmgo_markdown_studio_content';

export function initMarkdownStudio() {
  const app = document.getElementById('markdown-editor-app');
  if (!app) return;

  const isEn = app.dataset.lang === 'en';
  const currentPresets = isEn ? PRESETS.en : PRESETS.zh;

  const textarea = document.getElementById('markdown-input');
  const preview = document.getElementById('markdown-preview');
  const templateSelect = document.getElementById('template-select');
  const workspace = document.getElementById('markdown-workspace');

  // Stats elements
  const statWords = document.getElementById('stat-words');
  const statChars = document.getElementById('stat-chars');
  const statLines = document.getElementById('stat-lines');
  const statReadTime = document.getElementById('stat-readtime');

  // Action buttons
  const btnCopyWechat = document.getElementById('btn-copy-wechat');
  const btnExportHtml = document.getElementById('btn-export-html');
  const btnDownloadMd = document.getElementById('btn-download-md');
  const btnPrintPdf = document.getElementById('btn-print-pdf');
  const btnCopyHtml = document.getElementById('btn-copy-html');
  const btnClear = document.getElementById('btn-clear');
  const btnReset = document.getElementById('btn-reset');

  // Dropdown menu
  const dropdownTrigger = document.getElementById('export-dropdown-trigger');
  const dropdownMenu = document.getElementById('export-dropdown-menu');

  // View mode buttons
  const modeButtons = document.querySelectorAll('.mode-btn');

  // Initialize Marked instance
  const markedInstance = new Marked();
  markedInstance.setOptions({
    gfm: true,
    breaks: false,
  });

  const renderer = {
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return `<pre class="mermaid">${text}</pre>\n`;
      }
      const validLang = hljs.getLanguage(lang) ? lang : 'plaintext';
      let highlighted = text;
      try {
        highlighted = hljs.highlight(text, { language: validLang }).value;
      } catch (e) {
        highlighted = escapeHtml(text);
      }
      return `<div class="code-block-wrapper">
  <button class="copy-code-btn copy-btn" aria-label="Copy code">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
  </button>
  <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
</div>\n`;
    },
    image({ href, title, text }) {
      let out = `<img src="${href}" alt="${escapeHtml(text || '')}" loading="lazy" decoding="async"`;
      if (title) out += ` title="${escapeHtml(title)}"`;
      out += '>';
      return out;
    }
  };

  markedInstance.use({ renderer });
  markedInstance.use(markedKatex({ throwOnError: false }));

  // Helper: Escape HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Update Stats
  function updateStats(text) {
    const chars = text.length;
    const lines = text ? text.split('\n').length : 0;
    
    // Word count supporting both CJK characters and Western words
    const cjkChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const westernWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9_\-]+/g) || []).length;
    const totalWords = cjkChars + westernWords;
    
    // Reading speed: ~350 chars/min
    const minutes = Math.max(1, Math.ceil(chars / 350));

    if (statWords) statWords.textContent = totalWords.toLocaleString();
    if (statChars) statChars.textContent = chars.toLocaleString();
    if (statLines) statLines.textContent = lines.toLocaleString();
    if (statReadTime) statReadTime.textContent = `${minutes}m`;
  }

  // Render markdown to preview
  function renderMarkdown() {
    const raw = textarea.value;
    updateStats(raw);

    try {
      const html = markedInstance.parse(raw);
      preview.innerHTML = html;
      bindCopyButtons(preview);
    } catch (e) {
      console.error('Markdown parse error:', e);
      preview.innerHTML = `<div class="render-error">Error rendering markdown: ${escapeHtml(e.message)}</div>`;
    }

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, raw);
    } catch (e) {
      // Ignore quota errors
    }
  }

  // Bind code block copy buttons inside the rendered preview
  function bindCopyButtons(container) {
    container.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const codeBlock = btn.nextElementSibling?.querySelector('code') || btn.nextElementSibling;
        if (!codeBlock) return;
        const code = codeBlock.innerText || codeBlock.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
          showToast(isEn ? 'Code copied to clipboard!' : '代码已复制到剪贴板！');
        });
      });
    });
  }

  // Toast notification system
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `cyber-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="toast-message">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Debounced input handler
  let debounceTimer;
  textarea.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderMarkdown, 120);
  });

  // Tab key indentation support (2 spaces)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      textarea.value = val.substring(0, start) + '  ' + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      renderMarkdown();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      showToast(isEn ? 'Draft saved locally.' : '草稿已自动保存至本地缓存。');
    }
  });

  // Preset Selector
  if (templateSelect) {
    templateSelect.addEventListener('change', () => {
      const key = templateSelect.value;
      if (key && currentPresets[key]) {
        textarea.value = currentPresets[key];
        renderMarkdown();
        showToast(isEn ? `Loaded ${key} template!` : `已载入「${templateSelect.options[templateSelect.selectedIndex].text}」模板！`);
      }
    });
  }

  // View Mode Switcher
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.dataset.mode;
      workspace.classList.remove('mode-split', 'mode-edit', 'mode-preview');
      workspace.classList.add(`mode-${mode}`);
    });
  });

  // Dropdown Menu Toggle
  if (dropdownTrigger && dropdownMenu) {
    dropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdownMenu.classList.contains('open');
      dropdownMenu.classList.toggle('open', !isOpen);
      dropdownTrigger.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('open');
        dropdownTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --- Export 1: Copy Rich Text for WeChat / Zhihu ---
  async function copyWeChatRichText() {
    const rawHtml = preview.innerHTML;
    if (!rawHtml.trim()) {
      showToast(isEn ? 'Editor is empty.' : '当前内容为空，无法复制。', 'error');
      return;
    }

    // Build standalone inlined styled HTML container tailored for WeChat / Zhihu
    const styledContainer = document.createElement('div');
    styledContainer.innerHTML = rawHtml;

    // Remove client-only copy buttons from code blocks
    styledContainer.querySelectorAll('.copy-code-btn').forEach(b => b.remove());

    // Inline styling for common elements so WeChat editor preserves styling
    styledContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    styledContainer.style.fontSize = '15px';
    styledContainer.style.lineHeight = '1.8';
    styledContainer.style.color = '#22272e';
    styledContainer.style.wordBreak = 'break-word';

    styledContainer.querySelectorAll('h1').forEach(el => {
      el.style.fontSize = '22px';
      el.style.fontWeight = 'bold';
      el.style.color = '#0f172a';
      el.style.borderBottom = '2px solid #6366f1';
      el.style.paddingBottom = '6px';
      el.style.marginTop = '24px';
      el.style.marginBottom = '14px';
    });

    styledContainer.querySelectorAll('h2').forEach(el => {
      el.style.fontSize = '18px';
      el.style.fontWeight = 'bold';
      el.style.color = '#0f172a';
      el.style.borderLeft = '4px solid #6366f1';
      el.style.paddingLeft = '10px';
      el.style.marginTop = '22px';
      el.style.marginBottom = '12px';
      el.style.background = 'rgba(99, 102, 241, 0.06)';
      el.style.paddingTop = '4px';
      el.style.paddingBottom = '4px';
      el.style.borderRadius = '0 4px 4px 0';
    });

    styledContainer.querySelectorAll('h3').forEach(el => {
      el.style.fontSize = '16px';
      el.style.fontWeight = '600';
      el.style.color = '#1e293b';
      el.style.marginTop = '18px';
      el.style.marginBottom = '10px';
    });

    styledContainer.querySelectorAll('p').forEach(el => {
      el.style.margin = '14px 0';
    });

    styledContainer.querySelectorAll('blockquote').forEach(el => {
      el.style.borderLeft = '4px solid #818cf8';
      el.style.background = '#f8fafc';
      el.style.padding = '12px 16px';
      el.style.margin = '16px 0';
      el.style.color = '#475569';
      el.style.borderRadius = '4px';
    });

    styledContainer.querySelectorAll('pre').forEach(el => {
      el.style.background = '#1e1e2e';
      el.style.color = '#cdd6f4';
      el.style.padding = '14px 16px';
      el.style.borderRadius = '8px';
      el.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
      el.style.fontSize = '13px';
      el.style.lineHeight = '1.6';
      el.style.overflowX = 'auto';
      el.style.margin = '16px 0';
    });

    styledContainer.querySelectorAll(':not(pre) > code').forEach(el => {
      el.style.background = '#f1f5f9';
      el.style.color = '#e11d48';
      el.style.padding = '2px 6px';
      el.style.borderRadius = '4px';
      el.style.fontSize = '13px';
      el.style.fontFamily = 'Consolas, Monaco, monospace';
    });

    styledContainer.querySelectorAll('table').forEach(el => {
      el.style.width = '100%';
      el.style.borderCollapse = 'collapse';
      el.style.margin = '18px 0';
      el.style.fontSize = '14px';
    });

    styledContainer.querySelectorAll('th').forEach(el => {
      el.style.background = '#f1f5f9';
      el.style.fontWeight = '600';
      el.style.border = '1px solid #cbd5e1';
      el.style.padding = '8px 12px';
      el.style.textAlign = 'left';
    });

    styledContainer.querySelectorAll('td').forEach(el => {
      el.style.border = '1px solid #cbd5e1';
      el.style.padding = '8px 12px';
    });

    const inlinedHtml = styledContainer.outerHTML;
    const plainText = textarea.value;

    const doFallbackCopy = () => {
      const tempDiv = document.createElement('div');
      tempDiv.contentEditable = 'true';
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      tempDiv.innerHTML = inlinedHtml;
      document.body.appendChild(tempDiv);
      tempDiv.focus();
      window.getSelection().selectAllChildren(tempDiv);
      const success = document.execCommand('copy');
      document.body.removeChild(tempDiv);
      if (success) {
        showToast(isEn ? 'Rich text copied! Ready to paste into WeChat/Zhihu.' : '已成功复制公众号/知乎排版！直接去后台粘贴即可 (Ctrl+V)。');
      } else {
        throw new Error('execCommand copy returned false');
      }
    };

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const htmlBlob = new Blob([inlinedHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]);
        showToast(isEn ? 'Rich text copied! Ready to paste into WeChat/Zhihu.' : '已成功复制公众号/知乎排版！直接去后台粘贴即可 (Ctrl+V)。');
      } catch (writeErr) {
        try {
          doFallbackCopy();
        } catch (fallbackErr) {
          console.error('Copy rich text error:', writeErr, fallbackErr);
          showToast(isEn ? 'Failed to copy rich text.' : '复制富文本失败，请检查浏览器剪贴板权限。', 'error');
        }
      }
    } else {
      try {
        doFallbackCopy();
      } catch (err) {
        console.error('Fallback copy error:', err);
        showToast(isEn ? 'Failed to copy rich text.' : '复制富文本失败，请检查浏览器剪贴板权限。', 'error');
      }
    }
  }

  // --- Export 2: Standalone HTML File ---
  function exportStandaloneHtml() {
    const raw = textarea.value;
    const parsedContent = preview.innerHTML;
    const firstH1 = preview.querySelector('h1')?.textContent || 'Markdown Document';

    const fullHtml = `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'zh-CN'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(firstH1)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.7/dist/katex.min.css">
  <style>
    :root {
      --bg: #090a0f;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.12);
      --accent: #6366f1;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff;
        --text: #1e293b;
        --text-muted: #64748b;
        --border: #e2e8f0;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      line-height: 1.8;
      color: var(--text);
      background: var(--bg);
      max-width: 900px;
      margin: 0 auto;
      padding: 3rem 1.5rem;
    }
    h1, h2, h3, h4 { color: var(--text); line-height: 1.3; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
    h1 { font-size: 2.2rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
    h2 { font-size: 1.6rem; border-left: 4px solid var(--accent); padding-left: 0.75rem; }
    h3 { font-size: 1.3rem; }
    p { margin: 1.25rem 0; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    blockquote {
      border-left: 4px solid var(--accent);
      background: rgba(99, 102, 241, 0.08);
      margin: 1.5rem 0;
      padding: 1rem 1.25rem;
      border-radius: 4px;
      color: var(--text-muted);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td { border: 1px solid var(--border); padding: 0.75rem 1rem; text-align: left; }
    th { background: rgba(255, 255, 255, 0.06); font-weight: 600; }
    pre {
      background: #11131a;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      overflow-x: auto;
      margin: 1.5rem 0;
    }
    code { font-family: "JetBrains Mono", Consolas, monospace; font-size: 0.9em; }
    :not(pre) > code {
      background: rgba(255, 255, 255, 0.08);
      color: #f43f5e;
      padding: 0.2em 0.4em;
      border-radius: 4px;
    }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    .footer-note { margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--text-muted); text-align: center; }
  </style>
</head>
<body>
  <article>
    ${parsedContent}
  </article>
  <div class="footer-note">Exported from <a href="https://blog.llmgo.top" target="_blank">Nobita Talks AI (大雄话AI)</a> Markdown Studio</div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, `${slugify(firstH1)}.html`);
    showToast(isEn ? 'Standalone HTML downloaded!' : '独立 HTML 文件已成功导出并开始下载！');
  }

  // --- Export 3: Download Markdown (.md) ---
  function downloadMarkdown() {
    const raw = textarea.value;
    const firstH1 = preview.querySelector('h1')?.textContent || 'document';
    const blob = new Blob([raw], { type: 'text/markdown;charset=utf-8' });
    triggerDownload(blob, `${slugify(firstH1)}.md`);
    showToast(isEn ? 'Markdown file downloaded!' : 'Markdown 源文件已成功下载！');
  }

  // --- Export 4: Print / Export PDF ---
  function printPdf() {
    window.print();
  }

  // --- Export 5: Copy Clean HTML ---
  function copyCleanHtml() {
    const rawHtml = preview.innerHTML;
    navigator.clipboard.writeText(rawHtml).then(() => {
      showToast(isEn ? 'Rendered HTML copied to clipboard!' : '已复制渲染后的 HTML 源码！');
    });
  }

  // Clear Editor
  function clearEditor() {
    if (confirm(isEn ? 'Clear all contents in the editor?' : '确认清空编辑器内的全部文本？')) {
      textarea.value = '';
      renderMarkdown();
      showToast(isEn ? 'Editor cleared.' : '编辑器已清空。');
    }
  }

  // Reset to Default Sample
  function resetSample() {
    textarea.value = currentPresets.article;
    renderMarkdown();
    showToast(isEn ? 'Reset to default sample.' : '已重置为默认示例文档。');
  }

  // Helper: Trigger file download
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Helper: Convert string to filename-safe slug
  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'document';
  }

  // Attach button listeners
  if (btnCopyWechat) btnCopyWechat.addEventListener('click', copyWeChatRichText);
  if (btnExportHtml) btnExportHtml.addEventListener('click', exportStandaloneHtml);
  if (btnDownloadMd) btnDownloadMd.addEventListener('click', downloadMarkdown);
  if (btnPrintPdf) btnPrintPdf.addEventListener('click', printPdf);
  if (btnCopyHtml) btnCopyHtml.addEventListener('click', copyCleanHtml);
  if (btnClear) btnClear.addEventListener('click', clearEditor);
  if (btnReset) btnReset.addEventListener('click', resetSample);

  // Initial Content Load: Check localStorage, fallback to default preset
  const savedContent = localStorage.getItem(STORAGE_KEY);
  if (savedContent && savedContent.trim().length > 0) {
    textarea.value = savedContent;
  } else {
    textarea.value = currentPresets.article;
  }

  renderMarkdown();
}
