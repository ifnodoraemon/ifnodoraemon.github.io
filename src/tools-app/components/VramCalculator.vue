<template>
  <div class="terminal-window vram-window" id="vram-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: vram_estimator.sh --platform={{ modelSource.toUpperCase() }} --model={{ activeModelId }}</div>
      <div class="terminal-actions">
        <span class="status-indicator live"><span class="status-pulse"></span>VUE REACTIVE SANDBOX</span>
      </div>
    </div>

    <div class="tool-app-body vram-layout">
      <!-- Left Config Controls -->
      <div class="vram-config-panel">
        <!-- 1. Model Platform Source (Hugging Face / ModelScope Only) -->
        <div class="form-group">
          <label class="field-label">{{ isEn ? "Model Platform Source:" : "模型平台来源：" }}</label>
          <div class="source-mode-tabs">
            <button
              type="button"
              class="source-tab-btn"
              :class="{ active: modelSource === 'hf' }"
              @click="switchSource('hf')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px; vertical-align: -2px;"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
              Hugging Face (HF)
            </button>
            <button
              type="button"
              class="source-tab-btn"
              :class="{ active: modelSource === 'ms' }"
              @click="switchSource('ms')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px; vertical-align: -2px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              ModelScope 魔搭社区
            </button>
          </div>
        </div>

        <!-- 2. Model Search & Selection -->
        <div class="form-group model-search-form-group">
          <label class="field-label">
            {{ modelSource === 'hf' ? (isEn ? "Search or Enter Hugging Face Model ID:" : "搜索或输入 Hugging Face 模型：") : (isEn ? "Search or Enter ModelScope Model ID:" : "搜索或输入魔搭社区模型：") }}
          </label>
          <div class="search-input-container" ref="searchContainerRef">
            <div class="search-input-box">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                v-model="modelSearchQuery"
                type="text"
                class="cyber-input search-text-input"
                :placeholder="modelSource === 'hf' ? (isEn ? 'Search HF models (e.g. Qwen2.5, DeepSeek-V3, Llama-3.3)...' : '搜索 Hugging Face 模型 (如 Qwen2.5, DeepSeek, Llama-3.3)...') : (isEn ? 'Search ModelScope models (e.g. qwen, glm-4, deepseek)...' : '搜索魔搭社区模型 (如 qwen, deepseek, glm-4, baichuan)...')"
                @focus="onSearchFocus"
                @input="onSearchInput"
                @keydown.enter="triggerManualSync"
              >
              <button
                v-if="modelSearchQuery"
                type="button"
                class="clear-search-btn"
                :title="isEn ? 'Clear' : '清空'"
                @click="clearSearch"
              >
                ✕
              </button>
              <span v-if="isSearching" class="searching-spinner" aria-label="Searching..."></span>
            </div>
            <button
              type="button"
              class="tool-btn btn-highlight sync-btn"
              :disabled="isSyncing"
              @click="triggerManualSync"
            >
              {{ isSyncing ? (isEn ? "Syncing..." : "推导中...") : (isEn ? "🔄 Sync Config" : "🔄 同步配置") }}
            </button>

            <!-- Search Results Dropdown -->
            <div
              v-show="isDropdownOpen"
              class="search-dropdown-menu"
              @mousedown.prevent
            >
              <div class="dropdown-header">
                <span class="dropdown-title">
                  {{ modelSource === 'hf' ? (isEn ? "Hugging Face Results / Popular" : "Hugging Face 检索 / 推荐模型") : (isEn ? "ModelScope Results / Popular" : "魔搭社区 检索 / 推荐模型") }}
                </span>
                <span class="dropdown-count">{{ filteredModelResults.length }} {{ isEn ? "models" : "个模型" }}</span>
              </div>
              <div v-if="filteredModelResults.length === 0" class="dropdown-empty">
                {{ isEn ? "No direct matches found. You can enter the full Model ID directly and click 'Sync Config'." : "未找到匹配模型，可直接输入完整 Model ID 后点击“同步配置”。" }}
              </div>
              <ul v-else class="dropdown-list">
                <li
                  v-for="item in filteredModelResults"
                  :key="item.id"
                  class="dropdown-item"
                  :class="{ active: item.id === activeModelId }"
                  @click="selectModel(item)"
                >
                  <div class="item-main">
                    <span class="item-id">{{ item.id }}</span>
                    <span v-if="item.nameZh || item.name" class="item-name">{{ isEn ? (item.name || item.id) : (item.nameZh || item.name || item.id) }}</span>
                  </div>
                  <div class="item-badges">
                    <span v-if="item.params" class="badge params-badge">{{ item.params }}</span>
                    <span v-if="item.downloads" class="badge downloads-badge">↓ {{ item.downloads }}</span>
                    <span v-if="item.likes" class="badge likes-badge">♥ {{ item.likes }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Quick Recommendation Chips -->
          <div class="quick-chips-row">
            <span class="chips-label">{{ isEn ? "Popular Picks:" : "精选直达：" }}</span>
            <button
              v-for="chip in currentQuickChips"
              :key="chip.id"
              type="button"
              class="quick-chip-btn"
              :class="{ active: activeModelId === chip.id }"
              @click="selectModel(chip)"
            >
              {{ chip.label }}
            </button>
          </div>

          <!-- Sync Error Banner -->
          <div v-if="syncError" class="sync-error-banner">
            ⚠️ {{ syncError }}
          </div>

          <!-- Synced Model Meta Card (Automatically Derived from config.json) -->
          <div v-if="syncedModelMeta" class="synced-meta-card">
            <div class="synced-meta-header">
              <span class="meta-tag">AUTOMATICALLY DERIVED</span>
              <strong class="meta-title">{{ syncedModelMeta.id }}</strong>
              <span class="meta-source-badge">{{ syncedModelMeta.source === 'ms' ? 'ModelScope' : 'Hugging Face' }}</span>
            </div>
            <div class="synced-meta-grid">
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Architecture" : "网络架构" }}:</span>
                <span class="meta-val">{{ syncedModelMeta.type }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Derived Params" : "推导参数量" }}:</span>
                <span class="meta-val text-accent">{{ syncedModelMeta.paramsB.toFixed(2) }}B</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Hidden Layers" : "隐藏层数" }}:</span>
                <span class="meta-val">{{ syncedModelMeta.layers }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Hidden Dim" : "隐藏维度 (Hidden)" }}:</span>
                <span class="meta-val">{{ syncedModelMeta.hiddenSize }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Attention / GQA" : "注意力结构 (Q:KV)" }}:</span>
                <span class="meta-val">Q{{ syncedModelMeta.qHeads }} : KV{{ syncedModelMeta.kvHeads }} (GQA 1:{{ (syncedModelMeta.qHeads / syncedModelMeta.kvHeads).toFixed(0) }})</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Default Context" : "原生上下文窗口" }}:</span>
                <span class="meta-val">{{ syncedModelMeta.maxCtx.toLocaleString() }} Tokens</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Deployment Precision Grid -->
        <div class="grid-2">
          <div class="form-group">
            <label class="field-label">{{ isEn ? "Weight Quantization:" : "权重量化精度：" }}</label>
            <select v-model.number="weightPrecBytes" class="cyber-select">
              <option :value="2.0">FP16 / BF16 (16-bit, 2 Bytes/param)</option>
              <option :value="1.0">INT8 / FP8 (8-bit, 1 Byte/param)</option>
              <option :value="0.55">AWQ / GPTQ INT4 (4-bit, ~0.55 Bytes)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="field-label">{{ isEn ? "KV Cache Precision:" : "KV Cache 缓存精度：" }}</label>
            <select v-model.number="kvPrecBytes" class="cyber-select">
              <option :value="2.0">FP16 (2 Bytes/token)</option>
              <option :value="1.0">FP8 KV Cache (1 Byte/token)</option>
            </select>
          </div>
        </div>

        <!-- 4. Sliders -->
        <div class="slider-group">
          <div class="slider-header">
            <label class="field-label">{{ isEn ? "Context Window Length:" : "上下文窗口长度 (Tokens)：" }}</label>
            <span class="slider-val-badge">{{ (ctxLength / 1024).toFixed(0) }}K ({{ ctxLength.toLocaleString() }} tokens)</span>
          </div>
          <input v-model.number="ctxLength" type="range" min="2048" max="131072" step="2048" class="cyber-range">
        </div>

        <div class="slider-group">
          <div class="slider-header">
            <label class="field-label">{{ isEn ? "Concurrency (Batch Size):" : "并发请求数 (Batch Size)：" }}</label>
            <span class="slider-val-badge">{{ concurrency }} Req</span>
          </div>
          <input v-model.number="concurrency" type="range" min="1" max="64" step="1" class="cyber-range">
        </div>

        <!-- 5. GPU Hardware Filter Search -->
        <div class="form-group">
          <label class="field-label">{{ isEn ? "Filter GPU Hardware Models:" : "过滤计算卡硬件型号：" }}</label>
          <input v-model="gpuSearchQuery" type="text" :placeholder="isEn ? 'Search RTX 5090, 昇腾, H200, B200...' : '搜索 4090, 5090, 昇腾, H200, B200, L40S...'" class="cyber-input">
        </div>
      </div>

      <!-- Right Output & Results -->
      <div class="vram-results-panel">
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">{{ isEn ? "Model Weights" : "模型静态权重" }}</span>
            <span class="metric-num">{{ weightsGb.toFixed(1) }} GB</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ isEn ? "KV Cache Memory" : "KV Cache 动态显存" }}</span>
            <span class="metric-num">{{ kvGb.toFixed(1) }} GB</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ isEn ? "CUDA Buffer" : "CUDA 运行缓冲区" }}</span>
            <span class="metric-num">1.6 GB</span>
          </div>
          <div class="metric-card highlight">
            <span class="metric-label">{{ isEn ? "Total Required VRAM" : "总推荐最低显存" }}</span>
            <span class="metric-num highlight">{{ totalVramGb.toFixed(1) }} GB</span>
          </div>
        </div>

        <div class="optimal-banner">
          {{ recommendationText }}
        </div>

        <!-- Hardware GPUs Table -->
        <div class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th>{{ isEn ? "GPU / Accelerator" : "计算卡型号" }}</th>
                <th>{{ isEn ? "VRAM" : "显存容量" }}</th>
                <th>{{ isEn ? "Bandwidth" : "显存带宽" }}</th>
                <th>{{ isEn ? "Bus" : "总线互联" }}</th>
                <th>{{ isEn ? "Deployment Topology" : "推荐并行方案 (TP)" }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="gpu in filteredGpus" :key="gpu.id">
                <td>
                  <div class="gpu-name-cell">
                    <span class="gpu-name">{{ gpu.name }}</span>
                    <span class="gpu-type-chip">{{ gpu.category }}</span>
                  </div>
                </td>
                <td><strong>{{ gpu.vramGb }} GB</strong> {{ gpu.memType }}</td>
                <td><span class="bandwidth-text">{{ gpu.bandwidth }}</span></td>
                <td>{{ gpu.bus }}</td>
                <td>
                  <span class="gpu-status-badge" :class="gpu.statusClass">
                    {{ gpu.statusText }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  lang: { type: String, default: 'zh' },
  isEn: { type: Boolean, default: false }
});

// Model Platform Source: 'hf' | 'ms' (No preset, no custom)
const modelSource = ref('hf');
const activeModelId = ref('Qwen/Qwen2.5-7B-Instruct');
const modelSearchQuery = ref('Qwen/Qwen2.5-7B-Instruct');
const searchContainerRef = ref(null);

const isDropdownOpen = ref(false);
const isSearching = ref(false);
const isSyncing = ref(false);
const syncError = ref('');
const hfSearchResults = ref([]);
const extraMsModels = ref([]);

// Synced Model Metadata - Prepopulated with verified Qwen2.5-7B specs for SSR/SSG
const syncedModelMeta = ref({
  id: 'Qwen/Qwen2.5-7B-Instruct',
  source: 'hf',
  type: 'Qwen2ForCausalLM',
  paramsB: 7.61,
  layers: 28,
  hiddenSize: 3584,
  qHeads: 28,
  kvHeads: 4,
  maxCtx: 32768
});

// Active model architecture parameters (automatically derived from config.json)
const modelParamsB = ref(7.61);
const modelLayers = ref(28);
const modelHiddenSize = ref(3584);
const modelQHeads = ref(28);
const modelKvHeads = ref(4);

// Deployment inference options
const weightPrecBytes = ref(2.0); // FP16: 2, INT8: 1, INT4: 0.55
const kvPrecBytes = ref(2.0); // FP16: 2, FP8: 1
const ctxLength = ref(8192);
const concurrency = ref(4);
const gpuSearchQuery = ref('');

// Top Popular Hugging Face Models
const POPULAR_HF_MODELS = [
  { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B Instruct', org: 'Qwen', params: '7.6B', downloads: '9.6M', likes: 2219 },
  { id: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen 2.5 14B Instruct', org: 'Qwen', params: '14.7B', downloads: '3.2M', likes: 980 },
  { id: 'Qwen/Qwen2.5-32B-Instruct', name: 'Qwen 2.5 32B Instruct', org: 'Qwen', params: '32.5B', downloads: '4.8M', likes: 1450 },
  { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B Instruct', org: 'Qwen', params: '72.7B', downloads: '5.1M', likes: 2890 },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3 (MoE 671B)', org: 'deepseek-ai', params: '671B', downloads: '2.8M', likes: 8320 },
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 (Reasoning MoE)', org: 'deepseek-ai', params: '671B', downloads: '3.5M', likes: 9140 },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B Instruct', org: 'meta-llama', params: '70.6B', downloads: '8.4M', likes: 3200 },
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B Instruct', org: 'meta-llama', params: '8.0B', downloads: '12.5M', likes: 4500 },
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B Instruct v0.3', org: 'mistralai', params: '7.2B', downloads: '6.2M', likes: 2100 },
  { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B Instruct', org: 'google', params: '9.2B', downloads: '4.1M', likes: 1650 },
  { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B Chat', org: 'THUDM', params: '9.4B', downloads: '1.9M', likes: 880 }
];

// Top Curated ModelScope (魔搭社区) Models
const POPULAR_MS_MODELS = [
  { id: 'qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5 7B Instruct', nameZh: '通义千问 2.5 7B 对话', org: 'qwen', params: '7.6B' },
  { id: 'qwen/Qwen2.5-14B-Instruct', name: 'Qwen2.5 14B Instruct', nameZh: '通义千问 2.5 14B 对话', org: 'qwen', params: '14.7B' },
  { id: 'qwen/Qwen2.5-32B-Instruct', name: 'Qwen2.5 32B Instruct', nameZh: '通义千问 2.5 32B 对话', org: 'qwen', params: '32.5B' },
  { id: 'qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B Instruct', nameZh: '通义千问 2.5 72B 对话', org: 'qwen', params: '72.7B' },
  { id: 'qwen/Qwen2.5-Coder-7B-Instruct', name: 'Qwen2.5 Coder 7B', nameZh: '千问代码大模型 7B', org: 'qwen', params: '7.6B' },
  { id: 'qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen2.5 Coder 32B', nameZh: '千问代码大模型 32B', org: 'qwen', params: '32.5B' },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3', nameZh: '深度求索 DeepSeek-V3 (MoE 671B)', org: 'deepseek-ai', params: '671B' },
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1', nameZh: '深度求索 DeepSeek-R1 推理大模型', org: 'deepseek-ai', params: '671B' },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', name: 'DeepSeek-R1-Distill-Qwen-7B', nameZh: 'DeepSeek R1 蒸馏 Qwen 7B', org: 'deepseek-ai', params: '7.6B' },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B', name: 'DeepSeek-R1-Distill-Qwen-14B', nameZh: 'DeepSeek R1 蒸馏 Qwen 14B', org: 'deepseek-ai', params: '14.7B' },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', name: 'DeepSeek-R1-Distill-Qwen-32B', nameZh: 'DeepSeek R1 蒸馏 Qwen 32B', org: 'deepseek-ai', params: '32.5B' },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', name: 'DeepSeek-R1-Distill-Llama-70B', nameZh: 'DeepSeek R1 蒸馏 Llama 70B', org: 'deepseek-ai', params: '70.6B' },
  { id: 'ZhipuAI/glm-4-9b-chat', name: 'GLM-4 9B Chat', nameZh: '智谱 GLM-4 9B 对话', org: 'ZhipuAI', params: '9.4B' },
  { id: 'baichuan-inc/Baichuan2-7B-Chat', name: 'Baichuan2 7B Chat', nameZh: '百川 Baichuan2 7B 对话', org: 'baichuan-inc', params: '7B' },
  { id: 'baichuan-inc/Baichuan2-13B-Chat', name: 'Baichuan2 13B Chat', nameZh: '百川 Baichuan2 13B 对话', org: 'baichuan-inc', params: '13B' },
  { id: '01ai/Yi-1.5-9B-Chat', name: 'Yi-1.5 9B Chat', nameZh: '零一万物 Yi 1.5 9B', org: '01ai', params: '9B' },
  { id: '01ai/Yi-1.5-34B-Chat', name: 'Yi-1.5 34B Chat', nameZh: '零一万物 Yi 1.5 34B', org: '01ai', params: '34B' },
  { id: 'Shanghai_AI_Laboratory/internlm2_5-7b-chat', name: 'InternLM2.5 7B', nameZh: '书生·浦语 InternLM2.5 7B', org: 'Shanghai_AI_Laboratory', params: '7.7B' },
  { id: 'Shanghai_AI_Laboratory/internlm2_5-20b-chat', name: 'InternLM2.5 20B', nameZh: '书生·浦语 InternLM2.5 20B', org: 'Shanghai_AI_Laboratory', params: '20B' },
  { id: 'OpenBMB/MiniCPM-2B-sft-bf16', name: 'MiniCPM 2B', nameZh: '面壁智能 MiniCPM 2B', org: 'OpenBMB', params: '2.4B' },
  { id: 'OpenBMB/MiniCPM3-4B', name: 'MiniCPM3 4B', nameZh: '面壁智能 MiniCPM3 4B', org: 'OpenBMB', params: '4B' },
  { id: 'moonshotai/Kimi-K3', name: 'Kimi K3', nameZh: '月之暗面 Kimi K3 MoE', org: 'moonshotai', params: 'MoE' }
];

// Quick Recommendation Chips per platform
const currentQuickChips = computed(() => {
  if (modelSource.value === 'ms') {
    return [
      { id: 'qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B' },
      { id: 'qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B' },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3' },
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1' },
      { id: 'ZhipuAI/glm-4-9b-chat', label: 'GLM-4-9B' },
      { id: 'baichuan-inc/Baichuan2-13B-Chat', label: 'Baichuan2-13B' }
    ];
  }
  return [
    { id: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B' },
    { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B' },
    { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3' },
    { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1' },
    { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama-3.3-70B' },
    { id: 'google/gemma-2-9b-it', label: 'Gemma-2-9B' }
  ];
});

// Search results filtered by current input and platform
const filteredModelResults = computed(() => {
  const q = modelSearchQuery.value.trim().toLowerCase();
  if (modelSource.value === 'hf') {
    if (q && hfSearchResults.value.length > 0) {
      return hfSearchResults.value;
    }
    if (!q) {
      return POPULAR_HF_MODELS;
    }
    return POPULAR_HF_MODELS.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  } else {
    // ModelScope
    const combined = [...POPULAR_MS_MODELS, ...extraMsModels.value];
    if (!q) return combined;
    return combined.filter(m =>
      m.id.toLowerCase().includes(q) ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.nameZh && m.nameZh.toLowerCase().includes(q))
    );
  }
});

function formatCount(num) {
  if (!num) return null;
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return String(num);
}

let searchDebounceTimer = null;

async function fetchHfSearch(query) {
  isSearching.value = true;
  try {
    const res = await fetch(`https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=15`);
    if (res.ok) {
      const data = await res.json();
      hfSearchResults.value = data.map(d => ({
        id: d.id,
        name: d.id.split('/')[1] || d.id,
        org: d.id.split('/')[0] || '',
        downloads: d.downloads ? formatCount(d.downloads) : null,
        likes: d.likes || 0
      }));
    }
  } catch (err) {
    // Silently handle network restrictions
  } finally {
    isSearching.value = false;
  }
}

function onSearchInput() {
  isDropdownOpen.value = true;
  const q = modelSearchQuery.value.trim();
  if (modelSource.value === 'hf') {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    if (!q) {
      hfSearchResults.value = [];
      return;
    }
    searchDebounceTimer = setTimeout(() => {
      fetchHfSearch(q);
    }, 280);
  }
}

function onSearchFocus() {
  isDropdownOpen.value = true;
}

function clearSearch() {
  modelSearchQuery.value = '';
  hfSearchResults.value = [];
}

function switchSource(source) {
  modelSource.value = source;
  isDropdownOpen.value = false;
  syncError.value = '';
  if (source === 'ms') {
    const defaultId = 'qwen/Qwen2.5-7B-Instruct';
    activeModelId.value = defaultId;
    modelSearchQuery.value = defaultId;
    syncOnlineModel(defaultId);
  } else {
    const defaultId = 'Qwen/Qwen2.5-7B-Instruct';
    activeModelId.value = defaultId;
    modelSearchQuery.value = defaultId;
    syncOnlineModel(defaultId);
  }
}

function selectModel(item) {
  activeModelId.value = item.id;
  modelSearchQuery.value = item.id;
  isDropdownOpen.value = false;
  syncOnlineModel(item.id);
}

function triggerManualSync() {
  const id = modelSearchQuery.value.trim();
  if (!id) return;
  activeModelId.value = id;
  isDropdownOpen.value = false;
  syncOnlineModel(id);
}

// Asynchronous Online Config Sync from Hugging Face or ModelScope
async function syncOnlineModel(targetId) {
  const modelId = (targetId || activeModelId.value || '').trim();
  if (!modelId) return;

  isSyncing.value = true;
  syncError.value = '';

  try {
    let configData = null;
    let exactParams = null;

    if (modelSource.value === 'hf') {
      // 1. Try Hugging Face API for exact safetensors parameter count
      try {
        const apiRes = await fetch(`https://huggingface.co/api/models/${modelId}`);
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          const p = apiJson.safetensors?.parameters;
          if (p) {
            exactParams = p.BF16 || p.F16 || p.F8_E4M3 || p.F32 || Object.values(p)[0];
          }
        }
      } catch (e) {
        // Fallback to mathematical estimation
      }

      // 2. Fetch raw config.json
      const configRes = await fetch(`https://huggingface.co/${modelId}/raw/main/config.json`);
      if (!configRes.ok) {
        if (configRes.status === 401) {
          throw new Error(props.isEn ? 'This model is gated on Hugging Face (requires login access).' : '该模型在 Hugging Face 属于门禁模型 (Gated Repo)，需要登录凭据。');
        }
        throw new Error(props.isEn ? `Failed to fetch config.json (HTTP ${configRes.status})` : `无法获取 config.json (HTTP ${configRes.status})，请检查 Model ID 是否正确。`);
      }
      configData = await configRes.json();

    } else {
      // ModelScope
      const msUrl = `https://www.modelscope.cn/models/${modelId}/resolve/master/config.json`;
      const configRes = await fetch(msUrl);
      if (!configRes.ok) {
        throw new Error(props.isEn ? `Failed to fetch ModelScope config (HTTP ${configRes.status})` : `无法获取魔搭社区 config.json (HTTP ${configRes.status})，请检查模型 ID 是否正确。`);
      }
      configData = await configRes.json();
    }

    // Auto-parse Model Architecture
    const hiddenSize = configData.hidden_size || configData.d_model || 4096;
    const layers = configData.num_hidden_layers || configData.n_layer || configData.num_layers || 32;
    const qHeads = configData.num_attention_heads || configData.n_head || 32;
    const kvHeads = configData.num_key_value_heads || configData.num_kv_heads || configData.n_head_kv || qHeads;
    const intermediateSize = configData.intermediate_size || (hiddenSize * 4);
    const vocabSize = configData.vocab_size || 32000;
    const maxCtx = configData.max_position_embeddings || configData.max_seq_len || 8192;
    const modelType = configData.model_type || configData.architectures?.[0] || 'transformer';

    // Mathematical Parameter Derivation
    let calculatedParamsB = 0;
    if (exactParams && typeof exactParams === 'number') {
      calculatedParamsB = exactParams / 1e9;
    } else {
      const isMoe = !!(configData.n_routed_experts || configData.num_local_experts);
      const experts = configData.n_routed_experts || configData.num_local_experts || 1;
      const moeIntermediate = configData.moe_intermediate_size || intermediateSize;

      const selfAttnParams = hiddenSize * (hiddenSize * (1 + 2 * (kvHeads / qHeads)));
      const mlpParams = isMoe
        ? (experts * 3 * hiddenSize * moeIntermediate)
        : (3 * hiddenSize * intermediateSize);

      const perLayer = selfAttnParams + mlpParams + (4 * hiddenSize);
      const totalEstimated = (layers * perLayer) + (2 * vocabSize * hiddenSize);
      calculatedParamsB = totalEstimated / 1e9;
    }

    // Update active reactive state
    modelParamsB.value = Math.max(0.1, parseFloat(calculatedParamsB.toFixed(2)));
    modelLayers.value = layers;
    modelHiddenSize.value = hiddenSize;
    modelQHeads.value = qHeads;
    modelKvHeads.value = kvHeads;
    ctxLength.value = Math.min(131072, Math.max(2048, maxCtx));

    syncedModelMeta.value = {
      id: modelId,
      source: modelSource.value,
      type: modelType,
      paramsB: calculatedParamsB,
      layers,
      hiddenSize,
      qHeads,
      kvHeads,
      maxCtx
    };

  } catch (err) {
    syncError.value = err.message || String(err);
  } finally {
    isSyncing.value = false;
  }
}

// 10 GPU Accelerator Models
const ALL_GPUS = [
  { id: 'rtx-4090', name: 'NVIDIA RTX 4090', category: '消费级旗舰', vramGb: 24, memType: 'GDDR6X', bandwidth: '1.0 TB/s', bus: 'PCIe 4.0' },
  { id: 'rtx-5090', name: 'NVIDIA RTX 5090', category: 'Blackwell 消费旗舰', vramGb: 32, memType: 'GDDR7', bandwidth: '1.79 TB/s', bus: 'PCIe 5.0' },
  { id: 'l40s', name: 'NVIDIA L40S', category: '通用数据中心', vramGb: 48, memType: 'GDDR6', bandwidth: '864 GB/s', bus: 'PCIe 4.0' },
  { id: 'ascend-910b', name: '华为昇腾 Ascend 910B', category: '国产信创主力', vramGb: 64, memType: 'HBM2e', bandwidth: '819 GB/s', bus: 'HCCS' },
  { id: 'a100-80', name: 'NVIDIA A100 SXM4', category: '企业级主力', vramGb: 80, memType: 'HBM2e', bandwidth: '2.04 TB/s', bus: 'NVLink 3' },
  { id: 'h100-80', name: 'NVIDIA H100 SXM5', category: 'Hopper 旗舰', vramGb: 80, memType: 'HBM3', bandwidth: '3.35 TB/s', bus: 'NVLink 4' },
  { id: 'h20-96', name: 'NVIDIA H20 SXM', category: '合规大显存卡', vramGb: 96, memType: 'HBM3', bandwidth: '4.0 TB/s', bus: 'NVLink 4' },
  { id: 'ascend-910c', name: '华为昇腾 Ascend 910C', category: '国产双芯旗舰', vramGb: 128, memType: 'HBM2e', bandwidth: '3.2 TB/s', bus: 'HCCS' },
  { id: 'h200-141', name: 'NVIDIA H200 SXM', category: '超大显存 Hopper', vramGb: 141, memType: 'HBM3e', bandwidth: '4.8 TB/s', bus: 'NVLink 4' },
  { id: 'b200-192', name: 'NVIDIA B200 SXM', category: 'Blackwell 顶配', vramGb: 192, memType: 'HBM3e', bandwidth: '8.0 TB/s', bus: 'NVLink 5' }
];

// Formula 1: Model Static Weights (GiB)
const weightsGb = computed(() => {
  return modelParamsB.value * weightPrecBytes.value;
});

// Formula 2: KV Cache per token
const kvGb = computed(() => {
  const gqaRatio = modelKvHeads.value / modelQHeads.value;
  const kvBytesPerToken = 2 * modelLayers.value * modelHiddenSize.value * gqaRatio * kvPrecBytes.value;
  const totalBytes = kvBytesPerToken * ctxLength.value * concurrency.value;
  return totalBytes / (1024 * 1024 * 1024);
});

// Formula 3: Total Required VRAM
const totalVramGb = computed(() => {
  return weightsGb.value + kvGb.value + 1.6;
});

const recommendationText = computed(() => {
  const v = totalVramGb.value;
  if (props.isEn) {
    if (v <= 22) return 'Optimal Fit: 1x RTX 4090 24GB or RTX 5090 32GB can run single-card full speed.';
    if (v <= 44) return 'Optimal Fit: 2x RTX 4090 24GB (TP=2) or 1x L40S 48GB.';
    if (v <= 75) return 'Optimal Fit: 1x NVIDIA A100 / H100 80GB SXM.';
    if (v <= 135) return 'Optimal Fit: 1x NVIDIA H200 141GB or 2x 80GB GPUs (TP=2) / Ascend 910C.';
    if (v <= 185) return 'Optimal Fit: 1x NVIDIA B200 192GB or 4x 80GB GPUs (TP=4).';
    return `Enterprise Topology: Multi-GPU Cluster needed (${Math.ceil(v / 75)}x 80GB or ${Math.ceil(v / 180)}x B200 GPUs).`;
  } else {
    if (v <= 22) return '最佳适配方案：单张 RTX 4090 24G 或 RTX 5090 32G 即可全速单卡部署。';
    if (v <= 44) return '最佳适配方案：2 张 RTX 4090 (TP=2) 或单张 L40S 48G。';
    if (v <= 75) return '最佳适配方案：单张 A100 / H100 80G SXM。';
    if (v <= 135) return '最佳适配方案：单张 H200 141G 独占，或双卡 80G (TP=2) / 昇腾 910C。';
    if (v <= 185) return '最佳适配方案：单张 B200 192G，或 4 卡 80G (TP=4) 组网。';
    return `超大规模模型：需 ${Math.ceil(v / 75)} 张 80G 或 ${Math.ceil(v / 180)} 张 B200 加速卡集群并行部署。`;
  }
});

const filteredGpus = computed(() => {
  const query = gpuSearchQuery.value.trim().toLowerCase();
  const v = totalVramGb.value;

  return ALL_GPUS.filter(g => {
    if (!query) return true;
    return g.name.toLowerCase().includes(query) ||
           g.category.toLowerCase().includes(query) ||
           g.memType.toLowerCase().includes(query) ||
           g.bus.toLowerCase().includes(query);
  }).map(gpu => {
    const usableVram = gpu.vramGb * 0.92;
    const cardsNeeded = Math.ceil(v / usableVram);
    let tp = 1;
    if (cardsNeeded > 1) {
      tp = Math.min(8, Math.pow(2, Math.ceil(Math.log2(cardsNeeded))));
    }

    const isSingle = gpu.vramGb * 0.92 >= v;
    let statusClass = 'fit-success';
    let statusText = '';

    if (isSingle) {
      statusClass = 'fit-success';
      statusText = props.isEn ? '1 Card (Single GPU TP=1)' : '单卡可用 (TP=1)';
    } else if (cardsNeeded <= 8) {
      statusClass = 'fit-cluster';
      statusText = props.isEn ? `${cardsNeeded} Cards (TP=${tp})` : `${cardsNeeded} 卡并行 (TP=${tp})`;
    } else {
      statusClass = 'fit-exceeded';
      statusText = props.isEn ? `${cardsNeeded} Cards (Multi-Node)` : `跨节点集群 (${cardsNeeded} 卡)`;
    }

    return {
      ...gpu,
      cardsNeeded,
      statusClass,
      statusText
    };
  });
});

function handleClickOutside(e) {
  if (searchContainerRef.value && !searchContainerRef.value.contains(e.target)) {
    isDropdownOpen.value = false;
  }
}

// Fetch dynamic models list from ModelScope api-inference (CORS open)
async function fetchMsInferenceModels() {
  try {
    const res = await fetch('https://api-inference.modelscope.cn/v1/models');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        extraMsModels.value = data.data.map(m => ({
          id: m.id,
          name: m.id.split('/')[1] || m.id,
          nameZh: m.id,
          org: m.id.split('/')[0] || '',
          params: 'Online'
        }));
      }
    }
  } catch (e) {
    // Non-blocking background enhancement
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
    fetchMsInferenceModels();
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside);
  }
});
</script>

<style scoped>
.vram-window {
  background: rgba(10, 12, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(99, 102, 241, 0.08);
}

.vram-layout {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 2rem;
  padding: 1.5rem;
}

.vram-config-panel {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.source-mode-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 3px;
  gap: 4px;
}

.source-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  font-size: 0.82rem;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.source-tab-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
}

.source-tab-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
}

.model-search-form-group {
  position: relative;
}

.search-input-container {
  position: relative;
  display: flex;
  gap: 8px;
  width: 100%;
}

.search-input-box {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  padding: 0 8px 0 12px;
  transition: all 0.2s ease;
}

.search-input-box:focus-within {
  border-color: #818cf8;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.35);
  background: rgba(15, 23, 42, 0.7);
}

.search-icon {
  flex-shrink: 0;
  color: #818cf8;
  margin-right: 8px;
}

.search-text-input {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 8px 0 !important;
  font-size: 0.86rem;
  color: #f1f5f9;
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 6px;
  font-size: 0.82rem;
  border-radius: 4px;
}

.clear-search-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.searching-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(99, 102, 241, 0.3);
  border-top-color: #818cf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-left: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sync-btn {
  white-space: nowrap;
  flex-shrink: 0;
  padding: 8px 14px;
  font-size: 0.82rem;
}

/* Search Results Dropdown */
.search-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 99;
  background: rgba(14, 18, 28, 0.98);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 8px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(99, 102, 241, 0.2);
  backdrop-filter: blur(12px);
  max-height: 280px;
  overflow-y: auto;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 0.72rem;
  font-family: var(--font-mono, monospace);
  color: #a5b4fc;
}

.dropdown-empty {
  padding: 16px 12px;
  font-size: 0.8rem;
  color: #94a3b8;
  text-align: center;
  line-height: 1.5;
}

.dropdown-list {
  list-style: none;
  margin: 0;
  padding: 4px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dropdown-item:hover {
  background: rgba(99, 102, 241, 0.18);
}

.dropdown-item.active {
  background: rgba(99, 102, 241, 0.28);
  border-left: 3px solid #818cf8;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.item-id {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-name {
  font-size: 0.72rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.badge {
  font-size: 0.68rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono, monospace);
}

.params-badge {
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.downloads-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.likes-badge {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
}

.quick-chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.chips-label {
  font-size: 0.72rem;
  color: var(--text-muted, #94a3b8);
}

.quick-chip-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #c7d2fe;
  font-size: 0.72rem;
  font-family: var(--font-mono, monospace);
  padding: 3px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-chip-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #ffffff;
}

.quick-chip-btn.active {
  background: #6366f1;
  border-color: #818cf8;
  color: #ffffff;
}

.sync-error-banner {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 6px;
  color: #fca5a5;
  font-size: 0.8rem;
  font-family: var(--font-mono, monospace);
  margin-top: 8px;
}

.synced-meta-card {
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.synced-meta-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-tag {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono, monospace);
}

.meta-title {
  font-size: 0.82rem;
  color: #f1f5f9;
}

.meta-source-badge {
  margin-left: auto;
  font-size: 0.7rem;
  font-family: var(--font-mono, monospace);
  color: #818cf8;
  background: rgba(99, 102, 241, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
}

.synced-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
}

.meta-lbl {
  color: var(--text-muted, #94a3b8);
  margin-right: 4px;
}

.meta-val {
  color: #e2e8f0;
}

.text-accent {
  color: #38bdf8;
  font-weight: 700;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
  font-weight: 500;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.slider-group {
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

.vram-results-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.metric-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-card.highlight {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.35);
}

.metric-label {
  font-size: 0.72rem;
  color: var(--text-muted, #94a3b8);
  font-family: var(--font-mono, monospace);
}

.metric-num {
  font-size: 1.2rem;
  font-weight: 700;
  color: #f1f5f9;
  font-family: var(--font-mono, monospace);
}

.metric-num.highlight {
  color: #38bdf8;
  text-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
}

.optimal-banner {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #34d399;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 500;
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

.cyber-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.gpu-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gpu-name {
  font-weight: 600;
  color: #f1f5f9;
}

.gpu-type-chip {
  font-size: 0.72rem;
  color: #a5b4fc;
}

.bandwidth-text {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  color: #38bdf8;
}

.gpu-status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: var(--font-mono, monospace);
  white-space: nowrap;
}

.fit-success {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.fit-cluster {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.fit-exceeded {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.cyber-select, .cyber-input {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #f1f5f9;
  padding: 8px 12px;
  font-size: 0.88rem;
  font-family: var(--font-mono, monospace);
  outline: none;
  transition: all 0.2s ease;
  width: 100%;
}

.cyber-select:focus, .cyber-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.25);
}

.cyber-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
  margin: 10px 0;
}

.cyber-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #6366f1;
  border: 2px solid #ffffff;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);
  transition: transform 0.1s ease;
}

.cyber-range::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

@media (max-width: 1024px) {
  .vram-layout {
    grid-template-columns: 1fr;
  }
  .metrics-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
