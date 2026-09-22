<template>
  <div class="terminal-window vram-window fade-in" id="vram-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: vram_estimator.sh --source={{ modelSource }} --target=enterprise_gpus</div>
      <div class="terminal-actions">
        <span class="status-indicator live"><span class="status-pulse"></span>VUE REACTIVE SANDBOX</span>
      </div>
    </div>

    <div class="tool-app-body vram-layout">
      <!-- Left Config Controls -->
      <div class="vram-config-panel">
        <!-- Model Selection Source Mode Tabs -->
        <div class="form-group">
          <label class="field-label">{{ isEn ? 'Model Source & Selection Mode:' : '模型来源与选择方式：' }}</label>
          <div class="source-mode-tabs">
            <button
              type="button"
              class="source-tab-btn"
              :class="{ active: modelSource === 'preset' }"
              @click="modelSource = 'preset'"
            >
              {{ isEn ? 'Featured Presets' : '热门主流预设' }}
            </button>
            <button
              type="button"
              class="source-tab-btn"
              :class="{ active: modelSource === 'hf' }"
              @click="modelSource = 'hf'"
            >
              Hugging Face
            </button>
            <button
              type="button"
              class="source-tab-btn"
              :class="{ active: modelSource === 'ms' }"
              @click="modelSource = 'ms'"
            >
              ModelScope 魔搭
            </button>
            <button
              type="button"
              class="source-tab-btn"
              :class="{ active: modelSource === 'custom' }"
              @click="modelSource = 'custom'"
            >
              {{ isEn ? 'Custom' : '手动自定义' }}
            </button>
          </div>
        </div>

        <!-- 1. Featured Presets Mode -->
        <div v-if="modelSource === 'preset'" class="form-group">
          <label class="field-label">{{ isEn ? 'Select Preset Model:' : '选择预设大模型：' }}</label>
          <select v-model="selectedPresetKey" class="cyber-select" @change="applyPreset">
            <option v-for="(m, key) in PRESET_MODELS" :key="key" :value="key">
              {{ m.name }}
            </option>
          </select>
        </div>

        <!-- 2. Hugging Face / ModelScope Online Sync Mode -->
        <div v-else-if="modelSource === 'hf' || modelSource === 'ms'" class="form-group">
          <label class="field-label">
            {{ modelSource === 'hf' ? 'Hugging Face Model ID:' : 'ModelScope (魔搭社区) Model ID:' }}
          </label>
          <div class="input-btn-row">
            <input
              v-model="onlineModelId"
              type="text"
              class="cyber-input"
              :placeholder="modelSource === 'hf' ? 'e.g. Qwen/Qwen2.5-7B-Instruct or deepseek-ai/DeepSeek-V3' : 'e.g. qwen/Qwen2.5-7B-Instruct or ZhipuAI/glm-4-9b-chat'"
              @keyup.enter="syncOnlineModel"
            >
            <button
              type="button"
              class="tool-btn btn-highlight sync-btn"
              :disabled="isSyncing"
              @click="syncOnlineModel"
            >
              {{ isSyncing ? (isEn ? 'Syncing...' : '同步中...') : (isEn ? '🔄 Sync Config' : '🔄 同步配置') }}
            </button>
          </div>

          <!-- Quick Recommendation Chips -->
          <div class="quick-chips-row">
            <span class="chips-label">{{ isEn ? 'Quick Pick:' : '快速点选：' }}</span>
            <button
              v-for="chip in quickModelChips"
              :key="chip"
              type="button"
              class="quick-chip-btn"
              @click="selectQuickChip(chip)"
            >
              {{ chip }}
            </button>
          </div>

          <!-- Sync Error Banner -->
          <div v-if="syncError" class="sync-error-banner">
            ⚠️ {{ syncError }}
          </div>

          <!-- Sync Success Info Card -->
          <div v-if="syncedModelMeta" class="synced-meta-card">
            <div class="synced-meta-header">
              <span class="meta-tag">SYNCED SUCCESS</span>
              <strong class="meta-title">{{ syncedModelMeta.id }}</strong>
            </div>
            <div class="synced-meta-grid">
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? 'Type' : '架构类型' }}:</span>
                <span class="meta-val">{{ syncedModelMeta.type }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? 'Params' : '自动推导参数' }}:</span>
                <span class="meta-val text-accent">{{ syncedModelMeta.paramsB.toFixed(2) }}B</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? 'Layers' : '隐藏层数' }}:</span>
                <span class="meta-val">{{ syncedModelMeta.layers }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? 'Hidden / Heads' : '隐藏维度/头数' }}:</span>
                <span class="meta-val">{{ syncedModelMeta.hiddenSize }} / Q{{ syncedModelMeta.qHeads }}:KV{{ syncedModelMeta.kvHeads }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Manual Custom Mode -->
        <div v-else class="custom-fields-grid">
          <div class="form-group">
            <label class="field-label">{{ isEn ? 'Parameter Count (Billion B):' : '模型总参数量 (Billion B)：' }}</label>
            <input v-model.number="modelParamsB" type="number" min="0.1" max="10000" step="0.5" class="cyber-input">
          </div>
          <div class="form-group">
            <label class="field-label">{{ isEn ? 'Layers (Hidden Layers):' : '层数 (Hidden Layers)：' }}</label>
            <input v-model.number="modelLayers" type="number" min="1" max="256" step="1" class="cyber-input">
          </div>
          <div class="form-group">
            <label class="field-label">{{ isEn ? 'Hidden Dimension (d_model):' : '隐藏维度 (Hidden Size)：' }}</label>
            <input v-model.number="modelHiddenSize" type="number" min="512" max="32768" step="128" class="cyber-input">
          </div>
          <div class="form-group">
            <label class="field-label">{{ isEn ? 'GQA Ratio (KV Heads / Q Heads):' : '注意力头数比例 (KV / Q)：' }}</label>
            <div class="gqa-inputs">
              <input v-model.number="modelQHeads" type="number" min="1" max="256" class="cyber-input" placeholder="Q Heads">
              <span class="gqa-sep">:</span>
              <input v-model.number="modelKvHeads" type="number" min="1" max="256" class="cyber-input" placeholder="KV Heads">
            </div>
          </div>
        </div>

        <!-- Precision Grid -->
        <div class="grid-2">
          <div class="form-group">
            <label class="field-label">{{ isEn ? 'Weight Quantization:' : '权重量化精度：' }}</label>
            <select v-model.number="weightPrecBytes" class="cyber-select">
              <option :value="2.0">FP16 / BF16 (16-bit, 2 Bytes/param)</option>
              <option :value="1.0">INT8 / FP8 (8-bit, 1 Byte/param)</option>
              <option :value="0.55">AWQ / GPTQ INT4 (4-bit, ~0.55 Bytes)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="field-label">{{ isEn ? 'KV Cache Precision:' : 'KV Cache 缓存精度：' }}</label>
            <select v-model.number="kvPrecBytes" class="cyber-select">
              <option :value="2.0">FP16 (2 Bytes/token)</option>
              <option :value="1.0">FP8 KV Cache (1 Byte/token)</option>
            </select>
          </div>
        </div>

        <!-- Sliders -->
        <div class="slider-group">
          <div class="slider-header">
            <label class="field-label">{{ isEn ? 'Context Window Length:' : '上下文窗口长度 (Tokens)：' }}</label>
            <span class="slider-val-badge">{{ (ctxLength / 1024).toFixed(0) }}K ({{ ctxLength.toLocaleString() }} tokens)</span>
          </div>
          <input v-model.number="ctxLength" type="range" min="2048" max="131072" step="2048" class="cyber-range">
        </div>

        <div class="slider-group">
          <div class="slider-header">
            <label class="field-label">{{ isEn ? 'Concurrency (Batch Size):' : '最大并发并发数 (Batch Size)：' }}</label>
            <span class="slider-val-badge">{{ concurrency }} Req</span>
          </div>
          <input v-model.number="concurrency" type="range" min="1" max="64" step="1" class="cyber-range">
        </div>

        <!-- GPU Filter Search -->
        <div class="form-group">
          <label class="field-label">{{ isEn ? 'Filter GPU Hardware Models:' : '快速过滤计算卡型号：' }}</label>
          <input v-model="gpuSearchQuery" type="text" :placeholder="isEn ? 'Search RTX 5090, 昇腾, H200, B200...' : '搜索 4090, 5090, 昇腾, H200, B200, L40S...'" class="cyber-input">
        </div>
      </div>

      <!-- Right Output & Results -->
      <div class="vram-results-panel">
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">{{ isEn ? 'Model Weights' : '模型静态权重' }}</span>
            <span class="metric-num">{{ weightsGb.toFixed(1) }} GB</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ isEn ? 'KV Cache Memory' : 'KV Cache 动态显存' }}</span>
            <span class="metric-num">{{ kvGb.toFixed(1) }} GB</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ isEn ? 'CUDA Buffer' : 'CUDA 运行缓冲区' }}</span>
            <span class="metric-num">1.6 GB</span>
          </div>
          <div class="metric-card highlight">
            <span class="metric-label">{{ isEn ? 'Total Required VRAM' : '总推荐最低显存' }}</span>
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
                <th>{{ isEn ? 'GPU / Accelerator' : '计算卡型号' }}</th>
                <th>{{ isEn ? 'VRAM' : '显存容量' }}</th>
                <th>{{ isEn ? 'Bandwidth' : '显存带宽' }}</th>
                <th>{{ isEn ? 'Bus' : '总线互联' }}</th>
                <th>{{ isEn ? 'Deployment Topology' : '推荐并行方案 (TP)' }}</th>
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
import { ref, computed } from 'vue';

const props = defineProps({
  lang: { type: String, default: 'zh' },
  isEn: { type: Boolean, default: false }
});

const modelSource = ref('preset'); // 'preset' | 'hf' | 'ms' | 'custom'
const selectedPresetKey = ref('llama-3.3-70b');
const onlineModelId = ref('Qwen/Qwen2.5-7B-Instruct');
const isSyncing = ref(false);
const syncError = ref('');
const syncedModelMeta = ref(null);

// Active model parameters
const modelParamsB = ref(70.6);
const modelLayers = ref(80);
const modelHiddenSize = ref(8192);
const modelQHeads = ref(64);
const modelKvHeads = ref(8);

const weightPrecBytes = ref(2.0); // FP16: 2, INT8: 1, INT4: 0.55
const kvPrecBytes = ref(2.0); // FP16: 2, FP8: 1
const ctxLength = ref(8192);
const concurrency = ref(4);
const gpuSearchQuery = ref('');

const PRESET_MODELS = {
  'deepseek-v4-pro': {
    name: 'DeepSeek-V4-Pro (MoE 671B)',
    paramsB: 671,
    layers: 64,
    hiddenSize: 7168,
    qHeads: 128,
    kvHeads: 16,
    defaultCtx: 32768
  },
  'kimi-k3': {
    name: 'Kimi K3 (2.8T KDA MoE)',
    paramsB: 2800,
    layers: 84,
    hiddenSize: 8192,
    qHeads: 128,
    kvHeads: 16,
    defaultCtx: 65536
  },
  'llama-3.3-70b': {
    name: 'Llama 3.3 70B (Dense)',
    paramsB: 70.6,
    layers: 80,
    hiddenSize: 8192,
    qHeads: 64,
    kvHeads: 8,
    defaultCtx: 8192
  },
  'qwen-2.5-72b': {
    name: 'Qwen 2.5 72B (Dense)',
    paramsB: 72.7,
    layers: 80,
    hiddenSize: 8192,
    qHeads: 64,
    kvHeads: 8,
    defaultCtx: 8192
  },
  'qwen-2.5-32b': {
    name: 'Qwen 2.5 32B (Dense)',
    paramsB: 32.5,
    layers: 64,
    hiddenSize: 5120,
    qHeads: 40,
    kvHeads: 8,
    defaultCtx: 8192
  },
  'qwen-2.5-14b': {
    name: 'Qwen 2.5 14B (Dense)',
    paramsB: 14.7,
    layers: 48,
    hiddenSize: 5120,
    qHeads: 40,
    kvHeads: 8,
    defaultCtx: 8192
  },
  'qwen-2.5-7b': {
    name: 'Qwen 2.5 7B (Dense)',
    paramsB: 7.6,
    layers: 28,
    hiddenSize: 3584,
    qHeads: 28,
    kvHeads: 4,
    defaultCtx: 8192
  },
  'glm-4-9b': {
    name: 'GLM-4 9B (Chat/Dense)',
    paramsB: 9.4,
    layers: 40,
    hiddenSize: 4096,
    qHeads: 32,
    kvHeads: 2,
    defaultCtx: 8192
  }
};

const quickModelChips = computed(() => {
  if (modelSource.value === 'ms') {
    return [
      'qwen/Qwen2.5-7B-Instruct',
      'qwen/Qwen2.5-72B-Instruct',
      'deepseek-ai/DeepSeek-V3',
      'ZhipuAI/glm-4-9b-chat',
      'baichuan-inc/Baichuan2-13B-Chat'
    ];
  }
  return [
    'Qwen/Qwen2.5-7B-Instruct',
    'Qwen/Qwen2.5-72B-Instruct',
    'deepseek-ai/DeepSeek-V3',
    'google/gemma-2-9b',
    'mistralai/Mistral-7B-v0.3'
  ];
});

function selectQuickChip(chip) {
  onlineModelId.value = chip;
  syncOnlineModel();
}

function applyPreset() {
  const p = PRESET_MODELS[selectedPresetKey.value];
  if (!p) return;
  modelParamsB.value = p.paramsB;
  modelLayers.value = p.layers;
  modelHiddenSize.value = p.hiddenSize;
  modelQHeads.value = p.qHeads;
  modelKvHeads.value = p.kvHeads;
  if (p.defaultCtx) ctxLength.value = p.defaultCtx;
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

// Asynchronous Online Config Sync from Hugging Face or ModelScope
async function syncOnlineModel() {
  const modelId = onlineModelId.value.trim();
  if (!modelId) return;

  isSyncing.value = true;
  syncError.value = '';
  syncedModelMeta.value = null;

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
        // Fallback to config calculation
      }

      // 2. Fetch raw config.json
      const configRes = await fetch(`https://huggingface.co/${modelId}/raw/main/config.json`);
      if (!configRes.ok) {
        if (configRes.status === 401) {
          throw new Error(props.isEn ? 'This model is gated on Hugging Face (requires login access).' : '该模型在 Hugging Face 上属于闭源/门禁模型 (Gated Repo)，需要登录凭据。');
        }
        throw new Error(props.isEn ? `Failed to fetch config.json (HTTP ${configRes.status})` : `无法获取 config.json (HTTP ${configRes.status})，请检查 Model ID 是否正确。`);
      }
      configData = await configRes.json();

    } else {
      // ModelScope
      const msUrl = `https://www.modelscope.cn/models/${modelId}/resolve/master/config.json`;
      const configRes = await fetch(msUrl);
      if (!configRes.ok) {
        throw new Error(props.isEn ? `Failed to fetch ModelScope config (HTTP ${configRes.status})` : `无法获取魔搭社区 config.json (HTTP ${configRes.status})，请检查模型标识。`);
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

    // Parameter Calculation
    let calculatedParamsB = 0;
    if (exactParams && typeof exactParams === 'number') {
      calculatedParamsB = exactParams / 1e9;
    } else {
      // Compute from mathematical transformer formula
      const isMoe = !!(configData.n_routed_experts || configData.num_local_experts);
      const experts = configData.n_routed_experts || configData.num_local_experts || 1;
      const moeIntermediate = configData.moe_intermediate_size || intermediateSize;

      const selfAttnParams = hiddenSize * (hiddenSize * (1 + 2 * (kvHeads / qHeads)));
      const mlpParams = isMoe
        ? (experts * 3 * hiddenSize * moeIntermediate)
        : (3 * hiddenSize * intermediateSize);

      const perLayer = selfAttnParams + mlpParams + (4 * hiddenSize); // layer norms
      const totalEstimated = (layers * perLayer) + (2 * vocabSize * hiddenSize);
      calculatedParamsB = totalEstimated / 1e9;
    }

    // Update active state
    modelParamsB.value = Math.max(0.1, parseFloat(calculatedParamsB.toFixed(2)));
    modelLayers.value = layers;
    modelHiddenSize.value = hiddenSize;
    modelQHeads.value = qHeads;
    modelKvHeads.value = kvHeads;
    ctxLength.value = Math.min(131072, Math.max(2048, maxCtx));

    syncedModelMeta.value = {
      id: modelId,
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

// Formula 1: Model Weights (GiB)
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
  border-radius: 7px;
  padding: 3px;
  gap: 3px;
  overflow-x: auto;
}

.source-tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  font-size: 0.78rem;
  font-weight: 500;
  padding: 6px 8px;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.source-tab-btn.active {
  background: #6366f1;
  color: #ffffff;
}

.input-btn-row {
  display: flex;
  gap: 8px;
}

.sync-btn {
  white-space: nowrap;
  flex-shrink: 0;
  padding: 8px 14px;
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
  padding: 2px 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-chip-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
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

.custom-fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.gqa-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.gqa-sep {
  color: var(--text-muted, #94a3b8);
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
