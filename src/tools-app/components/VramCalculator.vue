<template>
  <div class="terminal-window vram-window fade-in" id="vram-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: vram_estimator.sh --arch=dense_and_moe --target=enterprise_gpus</div>
      <div class="terminal-actions">
        <span class="status-indicator live"><span class="status-pulse"></span>VUE REACTIVE SANDBOX</span>
      </div>
    </div>

    <div class="tool-app-body vram-layout">
      <!-- Left Config Controls -->
      <div class="vram-config-panel">
        <div class="form-group">
          <label class="field-label">{{ isEn ? 'Base Model Architecture:' : '基座大模型预设：' }}</label>
          <select v-model="selectedModelKey" class="cyber-select">
            <option v-for="(m, key) in PRESET_MODELS" :key="key" :value="key">
              {{ m.name }}
            </option>
          </select>
        </div>

        <div v-if="selectedModelKey === 'custom'" class="form-group">
          <label class="field-label">{{ isEn ? 'Custom Parameters (Billion):' : '自定义参数量 (Billion B)：' }}</label>
          <input v-model.number="customParamsB" type="number" min="0.5" max="10000" step="0.5" class="cyber-input">
        </div>

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
        <div class="form-group" style="margin-top: 0.5rem;">
          <label class="field-label">{{ isEn ? 'Filter GPU Hardware List:' : '快速过滤显卡/加速卡型号：' }}</label>
          <input v-model="gpuSearchQuery" type="text" :placeholder="isEn ? 'Search RTX, H100, 昇腾, B200...' : '搜索 4090, 5090, 昇腾, H200, B200...'" class="cyber-input">
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
import { ref, computed, watch } from 'vue';

const props = defineProps({
  lang: { type: String, default: 'zh' },
  isEn: { type: Boolean, default: false }
});

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
  'custom': {
    name: 'Custom Model (自定义参数量)',
    paramsB: 30,
    layers: 48,
    hiddenSize: 5120,
    qHeads: 40,
    kvHeads: 8,
    defaultCtx: 8192
  }
};

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

const selectedModelKey = ref('llama-3.3-70b');
const customParamsB = ref(30);
const weightPrecBytes = ref(2.0); // FP16: 2, INT8: 1, INT4: 0.55
const kvPrecBytes = ref(2.0); // FP16: 2, FP8: 1
const ctxLength = ref(8192);
const concurrency = ref(4);
const gpuSearchQuery = ref('');

// Auto update default context on model select
watch(selectedModelKey, (newVal) => {
  const m = PRESET_MODELS[newVal];
  if (m && m.defaultCtx) {
    ctxLength.value = m.defaultCtx;
  }
});

const currentModel = computed(() => {
  return PRESET_MODELS[selectedModelKey.value] || PRESET_MODELS['llama-3.3-70b'];
});

const actualParamsB = computed(() => {
  if (selectedModelKey.value === 'custom') {
    return customParamsB.value || 30;
  }
  return currentModel.value.paramsB;
});

// Formula 1: Model Weights (GiB)
const weightsGb = computed(() => {
  return actualParamsB.value * weightPrecBytes.value;
});

// Formula 2: KV Cache per token: 2 * layers * hidden * (kvHeads / qHeads) * kvBytes
const kvGb = computed(() => {
  const m = currentModel.value;
  const layers = m.layers;
  const hidden = m.hiddenSize;
  const gqaRatio = (m.kvHeads || 8) / (m.qHeads || 64);
  const kvBytesPerToken = 2 * layers * hidden * gqaRatio * kvPrecBytes.value;
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
    if (v <= 135) return 'Optimal Fit: 1x NVIDIA H200 141GB or 2x 80GB GPUs (TP=2).';
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
  gap: 1.25rem;
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
