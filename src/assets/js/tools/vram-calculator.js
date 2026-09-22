// LLM VRAM & GPU Serving Calculator

const PRESET_MODELS = {
  'deepseek-v4-pro': {
    name: 'DeepSeek-V4-Pro (MoE 671B)',
    paramsB: 671,
    layers: 64,
    hiddenSize: 7168,
    qHeads: 128,
    kvHeads: 16,
    defaultCtx: 32768,
  },
  'kimi-k3': {
    name: 'Kimi K3 (2.8T KDA MoE)',
    paramsB: 2800,
    layers: 84,
    hiddenSize: 8192,
    qHeads: 128,
    kvHeads: 16,
    defaultCtx: 65536,
  },
  'llama-3.3-70b': {
    name: 'Llama 3.3 70B',
    paramsB: 70.6,
    layers: 80,
    hiddenSize: 8192,
    qHeads: 64,
    kvHeads: 8,
    defaultCtx: 8192,
  },
  'qwen-2.5-72b': {
    name: 'Qwen 2.5 72B',
    paramsB: 72.7,
    layers: 80,
    hiddenSize: 8192,
    qHeads: 64,
    kvHeads: 8,
    defaultCtx: 8192,
  },
  'qwen-2.5-32b': {
    name: 'Qwen 2.5 32B',
    paramsB: 32.5,
    layers: 64,
    hiddenSize: 5120,
    qHeads: 40,
    kvHeads: 8,
    defaultCtx: 8192,
  },
  'qwen-2.5-14b': {
    name: 'Qwen 2.5 14B',
    paramsB: 14.7,
    layers: 48,
    hiddenSize: 5120,
    qHeads: 40,
    kvHeads: 8,
    defaultCtx: 8192,
  },
  'qwen-2.5-7b': {
    name: 'Qwen 2.5 7B',
    paramsB: 7.6,
    layers: 28,
    hiddenSize: 3584,
    qHeads: 28,
    kvHeads: 4,
    defaultCtx: 8192,
  },
  'custom': {
    name: 'Custom Model (自定义参数)',
    paramsB: 30,
    layers: 48,
    hiddenSize: 5120,
    qHeads: 40,
    kvHeads: 8,
    defaultCtx: 8192,
  }
};

const GPU_PROFILES = [
  { name: 'NVIDIA RTX 4090', vramGb: 24, bus: 'PCIe 4.0' },
  { name: 'NVIDIA L40S', vramGb: 48, bus: 'PCIe 4.0' },
  { name: 'NVIDIA A100 SXM', vramGb: 80, bus: 'NVLink' },
  { name: 'NVIDIA H100 SXM', vramGb: 80, bus: 'NVLink 4' },
  { name: 'NVIDIA H20 SXM', vramGb: 96, bus: 'NVLink 4' }
];

export function initVramCalculator() {
  const container = document.getElementById('vram-tool-app');
  if (!container) return;

  const isEn = container.dataset.lang === 'en';

  const modelSelect = document.getElementById('vram-model-select');
  const precSelect = document.getElementById('vram-prec-select');
  const kvPrecSelect = document.getElementById('vram-kv-prec-select');
  const ctxSlider = document.getElementById('vram-ctx-slider');
  const ctxValText = document.getElementById('vram-ctx-val');
  const batchSlider = document.getElementById('vram-batch-slider');
  const batchValText = document.getElementById('vram-batch-val');
  const customParamRow = document.getElementById('vram-custom-row');
  const customParamInput = document.getElementById('vram-custom-params');

  // Outputs
  const outWeights = document.getElementById('vram-out-weights');
  const outKv = document.getElementById('vram-out-kv');
  const outCuda = document.getElementById('vram-out-cuda');
  const outTotal = document.getElementById('vram-out-total');
  const gpuTableBody = document.getElementById('vram-gpu-table-body');
  const recBadge = document.getElementById('vram-rec-badge');

  function calculate() {
    const modelKey = modelSelect.value;
    const model = PRESET_MODELS[modelKey] || PRESET_MODELS['llama-3.3-70b'];

    let paramsB = model.paramsB;
    if (modelKey === 'custom' && customParamInput) {
      paramsB = parseFloat(customParamInput.value) || 30;
      if (customParamRow) customParamRow.style.display = 'flex';
    } else {
      if (customParamRow) customParamRow.style.display = 'none';
    }

    const precBytes = parseFloat(precSelect.value) || 2.0; // FP16: 2, INT8: 1, INT4: 0.55
    const kvBytes = parseFloat(kvPrecSelect.value) || 2.0; // FP16: 2, FP8: 1

    const ctxLength = parseInt(ctxSlider.value, 10) || 8192;
    const concurrency = parseInt(batchSlider.value, 10) || 4;

    if (ctxValText) ctxValText.textContent = `${(ctxLength / 1024).toFixed(0)}K (${ctxLength.toLocaleString()} tokens)`;
    if (batchValText) batchValText.textContent = `${concurrency} Req`;

    // 1. Model Weights VRAM (in GiB)
    const weightsGb = paramsB * precBytes;

    // 2. KV Cache per token
    // Formula: 2 * layers * hidden_size * (kvHeads / qHeads) * kvBytes
    const layers = model.layers;
    const hidden = model.hiddenSize;
    const gqaRatio = (model.kvHeads || 8) / (model.qHeads || 64);
    const kvBytesPerToken = 2 * layers * hidden * gqaRatio * kvBytes;
    const kvTotalBytes = kvBytesPerToken * ctxLength * concurrency;
    const kvGb = kvTotalBytes / (1024 * 1024 * 1024);

    // 3. CUDA & Activation Buffer
    const cudaBufferGb = 1.6;

    // 4. Total VRAM
    const totalVramGb = weightsGb + kvGb + cudaBufferGb;

    // Update UI Stats
    if (outWeights) outWeights.textContent = `${weightsGb.toFixed(1)} GB`;
    if (outKv) outKv.textContent = `${kvGb.toFixed(1)} GB`;
    if (outCuda) outCuda.textContent = `${cudaBufferGb.toFixed(1)} GB`;
    if (outTotal) outTotal.textContent = `${totalVramGb.toFixed(1)} GB`;

    // Update GPU Recommendations Table
    if (gpuTableBody) {
      gpuTableBody.innerHTML = GPU_PROFILES.map(gpu => {
        const cardsNeeded = Math.ceil(totalVramGb / (gpu.vramGb * 0.92)); // 92% safe threshold
        let tp = 1;
        if (cardsNeeded > 1) {
          tp = Math.min(8, Math.pow(2, Math.ceil(Math.log2(cardsNeeded))));
        }
        const isSufficientSingle = gpu.vramGb * 0.92 >= totalVramGb;
        const statusClass = isSufficientSingle ? 'fit-success' : cardsNeeded <= 8 ? 'fit-cluster' : 'fit-exceeded';
        const statusText = isSufficientSingle
          ? (isEn ? '1 Card (Single GPU)' : '单卡可用 (TP=1)')
          : cardsNeeded <= 8
            ? (isEn ? `${cardsNeeded} Cards (TP=${tp})` : `${cardsNeeded} 卡并行 (TP=${tp})`)
            : (isEn ? `${cardsNeeded} Cards (Multi-Node)` : `需多机集群 (${cardsNeeded}卡)`);

        return `
          <tr>
            <td><strong>${gpu.name}</strong></td>
            <td>${gpu.vramGb} GB</td>
            <td>${gpu.bus}</td>
            <td><span class="gpu-status-badge ${statusClass}">${statusText}</span></td>
          </tr>
        `;
      }).join('');
    }

    if (recBadge) {
      if (totalVramGb <= 22) {
        recBadge.textContent = isEn ? 'Optimal for 1x RTX 4090 24GB' : '最佳适配：单张 RTX 4090 24G 即可全速运行';
      } else if (totalVramGb <= 44) {
        recBadge.textContent = isEn ? 'Optimal for 2x RTX 4090 or 1x L40S 48GB' : '最佳适配：2×4090 24G 或单张 L40S 48G';
      } else if (totalVramGb <= 75) {
        recBadge.textContent = isEn ? 'Optimal for 1x A100 / H100 80GB' : '最佳适配：单张 A100 / H100 80G';
      } else if (totalVramGb <= 150) {
        recBadge.textContent = isEn ? 'Optimal for 2x A100/H100 80GB (TP=2)' : '最佳适配：双卡 A100/H100 80G (TP=2)';
      } else {
        recBadge.textContent = isEn ? `Requires Enterprise Cluster (${Math.ceil(totalVramGb / 75)}x 80GB GPUs)` : `超大规模模型：需 ${Math.ceil(totalVramGb / 75)} 张 80G 加速卡组网`;
      }
    }
  }

  modelSelect.addEventListener('change', () => {
    const model = PRESET_MODELS[modelSelect.value];
    if (model && model.defaultCtx && ctxSlider) {
      ctxSlider.value = model.defaultCtx;
    }
    calculate();
  });

  precSelect.addEventListener('change', calculate);
  kvPrecSelect.addEventListener('change', calculate);
  ctxSlider.addEventListener('input', calculate);
  batchSlider.addEventListener('input', calculate);
  if (customParamInput) customParamInput.addEventListener('input', calculate);

  calculate();
}
