// LLM Token Counter & 2026 Frontier Cost Matrix

const MODEL_PRICING = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'Google',
    inputPerM: 0.10,
    outputPerM: 0.40,
    contextWindow: 1000000,
    badge: '极速质价比'
  },
  {
    id: 'kimi-k3',
    name: 'Kimi K3 (2.8T)',
    provider: 'Moonshot AI',
    inputPerM: 0.20,
    outputPerM: 0.80,
    contextWindow: 262144,
    badge: '国产旗舰'
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek-V4-Pro',
    provider: 'DeepSeek',
    inputPerM: 0.25,
    outputPerM: 0.50,
    contextWindow: 131072,
    badge: '开源领军'
  },
  {
    id: 'glm-5.3',
    name: 'GLM-5.3',
    provider: 'Zhipu AI',
    inputPerM: 0.30,
    outputPerM: 0.60,
    contextWindow: 131072,
    badge: 'Agent 标杆'
  },
  {
    id: 'qwen-3.8-max',
    name: 'Qwen3.8-Max',
    provider: 'Alibaba Cloud',
    inputPerM: 0.40,
    outputPerM: 1.20,
    contextWindow: 131072,
    badge: '全维均衡'
  },
  {
    id: 'claude-fable-5.1',
    name: 'Claude Fable 5.1',
    provider: 'Anthropic',
    inputPerM: 1.80,
    outputPerM: 7.50,
    contextWindow: 200000,
    badge: '顶级编码'
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    provider: 'OpenAI',
    inputPerM: 3.50,
    outputPerM: 14.00,
    contextWindow: 524288,
    badge: '深度推理'
  }
];

export function initTokenCalculator() {
  const container = document.getElementById('token-tool-app');
  if (!container) return;

  const isEn = container.dataset.lang === 'en';

  const inputEl = document.getElementById('token-input');
  const outTokensSlider = document.getElementById('token-out-slider');
  const outTokensVal = document.getElementById('token-out-val');
  const batchSlider = document.getElementById('token-batch-slider');
  const batchVal = document.getElementById('token-batch-val');

  // Stats
  const statInputTokens = document.getElementById('token-stat-input');
  const statChars = document.getElementById('token-stat-chars');
  const statWords = document.getElementById('token-stat-words');

  const priceTableBody = document.getElementById('token-table-body');
  const btnSample = document.getElementById('token-btn-sample');
  const btnClear = document.getElementById('token-btn-clear');

  // Helper: Estimate tokens via BPE heuristic
  function estimateTokens(text) {
    if (!text) return 0;
    const cjkMatches = text.match(/[\u4e00-\u9fa5]/g) || [];
    const cjkCount = cjkMatches.length;

    // Filter out CJK characters for western tokenization
    const nonCjk = text.replace(/[\u4e00-\u9fa5]/g, ' ');
    const westernTokens = (nonCjk.match(/[a-zA-Z0-9_\-]+|[^\s\w]/g) || []).length;

    // CJK characters average ~0.65 tokens in 2026 modern tokenizers (like o200k / Kimi BPE)
    const total = Math.ceil(cjkCount * 0.65 + westernTokens * 1.05);
    return Math.max(1, total);
  }

  function calculate() {
    const rawText = inputEl.value;
    const inTokens = rawText.trim() ? estimateTokens(rawText) : 0;
    const outTokens = parseInt(outTokensSlider.value, 10) || 500;
    const batchCalls = parseInt(batchSlider.value, 10) || 1000;

    if (outTokensVal) outTokensVal.textContent = `${outTokens.toLocaleString()} tokens`;
    if (batchVal) batchVal.textContent = `${batchCalls.toLocaleString()} ${isEn ? 'Calls' : '次调用'}`;

    if (statInputTokens) statInputTokens.textContent = inTokens.toLocaleString();
    if (statChars) statChars.textContent = rawText.length.toLocaleString();

    const cjkCount = (rawText.match(/[\u4e00-\u9fa5]/g) || []).length;
    const westernCount = (rawText.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9_\-]+/g) || []).length;
    if (statWords) statWords.textContent = (cjkCount + westernCount).toLocaleString();

    if (priceTableBody) {
      priceTableBody.innerHTML = MODEL_PRICING.map(m => {
        // Single call cost in USD
        const singleInCost = (inTokens / 1000000) * m.inputPerM;
        const singleOutCost = (outTokens / 1000000) * m.outputPerM;
        const singleTotalCost = singleInCost + singleOutCost;

        // Batch cost in USD
        const batchTotalCost = singleTotalCost * batchCalls;

        // Context window usage percent
        const ctxPct = Math.min(100, ((inTokens + outTokens) / m.contextWindow) * 100);

        return `
          <tr>
            <td>
              <div class="model-name-cell">
                <span class="model-name-title">${m.name}</span>
                <span class="model-provider-sub">${m.provider} · <span class="model-chip">${m.badge}</span></span>
              </div>
            </td>
            <td>
              <div class="pricing-rate-cell">
                <span>In: $${m.inputPerM.toFixed(2)}/M</span>
                <span class="sub-rate">Out: $${m.outputPerM.toFixed(2)}/M</span>
              </div>
            </td>
            <td><strong class="cost-val">$${singleTotalCost.toFixed(6)}</strong></td>
            <td><strong class="cost-val highlight">$${batchTotalCost.toFixed(3)}</strong></td>
            <td>
              <div class="ctx-bar-wrap">
                <div class="ctx-bar-fill" style="width: ${Math.max(1, ctxPct)}%;"></div>
                <span class="ctx-bar-text">${ctxPct.toFixed(2)}% (${((inTokens + outTokens) / 1024).toFixed(1)}K)</span>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  inputEl.addEventListener('input', calculate);
  outTokensSlider.addEventListener('input', calculate);
  batchSlider.addEventListener('input', calculate);

  if (btnSample) {
    btnSample.addEventListener('click', () => {
      inputEl.value = isEn
        ? `You are an expert distributed systems architect specializing in high-throughput LLM inference engines. Explain how speculative decoding with prefix caching mitigates memory bandwidth bottlenecks in multi-tenant vLLM serving environments. Include mathematical formulations and pseudocode.`
        : `你是一名深耕前沿大模型与自主智能体（AI Agent）的高级系统架构师。请详细阐述在生产环境中如何结合状态机调度、Model Context Protocol (MCP 2026) 工具调用规范与长程工作记忆衰减机制，解决大模型在复杂多步骤任务下的幻觉与非确定性漂移问题。给出核心控制循环代码与压测基准。`;
      calculate();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      inputEl.value = '';
      calculate();
    });
  }

  calculate();
}
