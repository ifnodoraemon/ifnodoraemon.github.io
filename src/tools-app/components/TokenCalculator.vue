<template>
  <div class="terminal-window token-window fade-in" id="token-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: token_pricing_matrix.sh --models=2026_frontier</div>
      <div class="terminal-actions">
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="loadSample">{{ isEn ? 'Sample Text' : '加载示例' }}</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="clearPrompt">{{ isEn ? 'Clear' : '清空' }}</button>
      </div>
    </div>

    <div class="tool-app-body token-layout">
      <!-- Input Text & Metrics Header -->
      <div class="token-input-section">
        <div class="token-input-header">
          <label class="field-label">{{ isEn ? 'Prompt Text (Input):' : '输入 Prompt 文本：' }}</label>
          <div class="token-stats-bar">
            <span class="stat-item">{{ isEn ? 'Tokens:' : 'Tokens：' }} <strong class="text-accent">{{ inputTokens.toLocaleString() }}</strong></span>
            <span class="stat-sep">/</span>
            <span class="stat-item">{{ isEn ? 'Chars:' : '字符数：' }} <span>{{ promptText.length.toLocaleString() }}</span></span>
            <span class="stat-sep">/</span>
            <span class="stat-item">{{ isEn ? 'Words:' : '词数：' }} <span>{{ wordCount.toLocaleString() }}</span></span>
          </div>
        </div>

        <textarea
          v-model="promptText"
          class="markdown-textarea token-textarea"
          :placeholder="isEn ? 'Paste your prompt, document, or code here to benchmark API costs...' : '在此粘贴 Prompt、技术文档或代码片段，实时测算 Token 消耗并对比 2026 前沿大模型 API 账单...'"
          spellcheck="false"
        ></textarea>

        <!-- Sliders -->
        <div class="token-sim-controls">
          <div class="token-sim-row">
            <div class="slider-header">
              <label class="field-label">{{ isEn ? 'Simulated Output Generation:' : '预估生成输出 Tokens：' }}</label>
              <span class="slider-val-badge">{{ outputTokens.toLocaleString() }} tokens</span>
            </div>
            <input v-model.number="outputTokens" type="range" min="100" max="8192" step="100" class="cyber-range">
          </div>

          <div class="token-sim-row">
            <div class="slider-header">
              <label class="field-label">{{ isEn ? 'Batch Invocation Volume:' : '批量调用并发总量：' }}</label>
              <span class="slider-val-badge">{{ batchCalls.toLocaleString() }} {{ isEn ? 'Calls' : '次调用' }}</span>
            </div>
            <input v-model.number="batchCalls" type="range" min="100" max="50000" step="100" class="cyber-range">
          </div>
        </div>
      </div>

      <!-- Comparison Pricing Table -->
      <div class="table-responsive">
        <table class="cyber-table">
          <thead>
            <tr>
              <th>{{ isEn ? 'Frontier Model' : '前沿大模型' }}</th>
              <th>{{ isEn ? 'API Rates (/1M)' : '官方费率 (/1M Tokens)' }}</th>
              <th>{{ isEn ? 'Single Call Cost' : '单次调用费用' }}</th>
              <th>{{ isEn ? 'Batch Volume Cost' : '批量总成本' }}</th>
              <th>{{ isEn ? 'Context Utilization' : '上下文占用率' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in pricingMatrix" :key="m.id">
              <td>
                <div class="model-name-cell">
                  <span class="model-name-title">{{ m.name }}</span>
                  <span class="model-provider-sub">{{ m.provider }} · <span class="model-chip">{{ m.badge }}</span></span>
                </div>
              </td>
              <td>
                <div class="pricing-rate-cell">
                  <span>In: ${{ m.inputPerM.toFixed(2) }}/M</span>
                  <span class="sub-rate">Out: ${{ m.outputPerM.toFixed(2) }}/M</span>
                </div>
              </td>
              <td><strong class="cost-val">${{ m.singleTotalCost.toFixed(6) }}</strong></td>
              <td><strong class="cost-val highlight">${{ m.batchTotalCost.toFixed(3) }}</strong></td>
              <td>
                <div class="ctx-bar-wrap">
                  <div class="ctx-bar-fill" :style="{ width: `${Math.max(1, m.ctxPct)}%` }"></div>
                  <span class="ctx-bar-text">{{ m.ctxPct.toFixed(2) }}% ({{ ((inputTokens + outputTokens) / 1024).toFixed(1) }}K)</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  lang: { type: String, default: 'zh' },
  isEn: { type: Boolean, default: false }
});

const promptText = ref(`你是一名深耕前沿大模型与自主智能体（AI Agent）的高级系统架构师。请详细阐述在生产环境中如何结合状态机调度、Model Context Protocol (MCP 2026) 工具调用规范与长程工作记忆衰减机制，解决大模型在复杂多步骤任务下的幻觉与非确定性漂移问题。给出核心控制循环代码与压测基准。`);
const outputTokens = ref(800);
const batchCalls = ref(1000);

const MODEL_PRICING = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'Google', inputPerM: 0.10, outputPerM: 0.40, contextWindow: 1000000, badge: '极速质价比' },
  { id: 'kimi-k3', name: 'Kimi K3 (2.8T)', provider: 'Moonshot AI', inputPerM: 0.20, outputPerM: 0.80, contextWindow: 262144, badge: '国产旗舰' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', provider: 'DeepSeek', inputPerM: 0.25, outputPerM: 0.50, contextWindow: 131072, badge: '开源领军' },
  { id: 'glm-5.3', name: 'GLM-5.3', provider: 'Zhipu AI', inputPerM: 0.30, outputPerM: 0.60, contextWindow: 131072, badge: 'Agent 标杆' },
  { id: 'qwen-3.8-max', name: 'Qwen3.8-Max', provider: 'Alibaba Cloud', inputPerM: 0.40, outputPerM: 1.20, contextWindow: 131072, badge: '全维均衡' },
  { id: 'claude-fable-5.1', name: 'Claude Fable 5.1', provider: 'Anthropic', inputPerM: 1.80, outputPerM: 7.50, contextWindow: 200000, badge: '顶级编码' },
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', provider: 'OpenAI', inputPerM: 3.50, outputPerM: 14.00, contextWindow: 524288, badge: '深度推理' }
];

// Heuristic BPE token estimator
const inputTokens = computed(() => {
  const text = promptText.value;
  if (!text.trim()) return 0;
  const cjkMatches = text.match(/[\u4e00-\u9fa5]/g) || [];
  const cjkCount = cjkMatches.length;

  const nonCjk = text.replace(/[\u4e00-\u9fa5]/g, ' ');
  const westernTokens = (nonCjk.match(/[a-zA-Z0-9_\-]+|[^\s\w]/g) || []).length;

  return Math.max(1, Math.ceil(cjkCount * 0.65 + westernTokens * 1.05));
});

const wordCount = computed(() => {
  const text = promptText.value;
  const cjkCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const westernCount = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9_\-]+/g) || []).length;
  return cjkCount + westernCount;
});

const pricingMatrix = computed(() => {
  const inTok = inputTokens.value;
  const outTok = outputTokens.value;
  const calls = batchCalls.value;

  return MODEL_PRICING.map(m => {
    const singleIn = (inTok / 1000000) * m.inputPerM;
    const singleOut = (outTok / 1000000) * m.outputPerM;
    const singleTotalCost = singleIn + singleOut;
    const batchTotalCost = singleTotalCost * calls;
    const ctxPct = Math.min(100, ((inTok + outTok) / m.contextWindow) * 100);

    return {
      ...m,
      singleTotalCost,
      batchTotalCost,
      ctxPct
    };
  });
});

function loadSample() {
  promptText.value = props.isEn
    ? `You are an expert distributed systems architect specializing in high-throughput LLM inference engines. Explain how speculative decoding with prefix caching mitigates memory bandwidth bottlenecks in multi-tenant vLLM serving environments. Include mathematical formulations and pseudocode.`
    : `你是一名深耕前沿大模型与自主智能体（AI Agent）的高级系统架构师。请详细阐述在生产环境中如何结合状态机调度、Model Context Protocol (MCP 2026) 工具调用规范与长程工作记忆衰减机制，解决大模型在复杂多步骤任务下的幻觉与非确定性漂移问题。给出核心控制循环代码与压测基准。`;
}

function clearPrompt() {
  promptText.value = '';
}
</script>

<style scoped>
.token-window {
  background: rgba(10, 12, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(99, 102, 241, 0.08);
}

.token-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
}

.token-input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.field-label {
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
  font-weight: 500;
}

.token-stats-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
  font-family: var(--font-mono, monospace);
}

.text-accent {
  color: #38bdf8;
}

.token-textarea {
  width: 100%;
  min-height: 120px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 12px;
  color: #f1f5f9;
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.token-textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.25);
}

.token-sim-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1rem;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.token-sim-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-val-badge {
  font-size: 0.8rem;
  font-family: var(--font-mono, monospace);
  color: #818cf8;
  background: rgba(99, 102, 241, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.cyber-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  text-align: left;
}

.cyber-table th {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted, #94a3b8);
  font-family: var(--font-mono, monospace);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.cyber-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.model-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-name-title {
  font-weight: 600;
  color: #f1f5f9;
}

.model-provider-sub {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
}

.model-chip {
  color: #a5b4fc;
}

.pricing-rate-cell {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
  font-family: var(--font-mono, monospace);
}

.sub-rate {
  color: var(--text-muted, #94a3b8);
}

.cost-val {
  font-family: var(--font-mono, monospace);
  font-size: 0.95rem;
}

.cost-val.highlight {
  color: #38bdf8;
}

.ctx-bar-wrap {
  width: 100%;
  height: 18px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 9px;
  overflow: hidden;
  position: relative;
}

.ctx-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #38bdf8);
  border-radius: 9px;
  transition: width 0.25s ease;
}

.ctx-bar-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-family: var(--font-mono, monospace);
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.cyber-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
  margin: 8px 0;
}

.cyber-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6366f1;
  border: 2px solid #ffffff;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);
}

@media (max-width: 900px) {
  .token-sim-controls {
    grid-template-columns: 1fr;
  }
}
</style>
