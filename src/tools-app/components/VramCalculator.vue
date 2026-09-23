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
                :placeholder="modelSource === 'hf' ? (isEn ? 'Search HF models (e.g. GLM-5.3, Qwen2.5, DeepSeek-V3)...' : '搜索 Hugging Face 模型 (如 GLM-5.3, Qwen2.5, DeepSeek)...') : (isEn ? 'Search ModelScope models (e.g. GLM-5.3, qwen, deepseek)...' : '搜索魔搭社区模型 (如 GLM-5.3, qwen, deepseek, glm-4)...')"
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
                  {{ modelSource === 'hf' ? (isEn ? "Hugging Face Live Search / Recommended" : "Hugging Face 检索 / 推荐模型") : (isEn ? "ModelScope Live Search / Recommended" : "魔搭社区 检索 / 推荐模型") }}
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
                    <span v-if="item.likes || item.stars" class="badge likes-badge">♥ {{ item.likes || item.stars }}</span>
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

          <!-- Synced Model Meta Card (Automatically Derived from config.json & Hub APIs) -->
          <div v-if="syncedModelMeta" class="synced-meta-card">
            <div class="synced-meta-header">
              <span class="meta-tag">AUTOMATICALLY DERIVED FROM HUB</span>
              <strong class="meta-title">{{ syncedModelMeta.id }}</strong>
              <span class="meta-source-badge">{{ syncedModelMeta.source === 'ms' ? 'ModelScope' : 'Hugging Face' }}</span>
            </div>
            <div class="synced-meta-grid">
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Architecture" : "网络架构" }}:</span>
                <span class="meta-val">{{ syncedModelMeta.type }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Params" : "模型参数" }}:</span>
                <span class="meta-val text-accent">{{ syncedModelMeta.paramsDisplay }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Hidden Layers" : "隐藏层数" }}:</span>
                <span class="meta-val">{{ syncedModelMeta.layers }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Hidden Dim" : "隐藏维度" }}:</span>
                <span class="meta-val">{{ syncedModelMeta.hiddenSize }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "Detected Format" : "检测权重格式" }}:</span>
                <span class="meta-val">{{ syncedModelMeta.detectedQuant }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">{{ isEn ? "MoE Structure" : "专家结构 (MoE)" }}:</span>
                <span class="meta-val">{{ syncedModelMeta.moeInfo }}</span>
              </div>
              <div class="meta-item full-row">
                <span class="meta-lbl">{{ isEn ? "Attention & KV Mechanism" : "注意力与 KV 机制" }}:</span>
                <span class="meta-val">
                  <span class="kv-mech-badge" :class="syncedModelMeta.isMla ? 'mla-badge' : 'gqa-badge'">
                    {{ syncedModelMeta.attentionDesc }}
                  </span>
                </span>
              </div>
              <div class="meta-item full-row">
                <span class="meta-lbl">{{ isEn ? "Context Limits" : "上下文规格 (Tokens)" }}:</span>
                <span class="meta-val">
                  {{ syncedModelMeta.baseCtx.toLocaleString() }} Tokens ({{ isEn ? 'Native' : '原生基础' }})
                  <template v-if="syncedModelMeta.maxCtx > syncedModelMeta.baseCtx">
                    → <strong class="text-accent">{{ syncedModelMeta.maxCtx.toLocaleString() }} Tokens</strong> ({{ isEn ? 'Max Extensible' : '最大扩展支持' }})
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Deployment Precision Grid -->
        <div class="grid-2">
          <div class="form-group">
            <label class="field-label">{{ isEn ? "Weight Quantization:" : "权重量化精度：" }}</label>
            <select v-model.number="weightPrecBytes" class="cyber-select">
              <option :value="2.0">FP16 / BF16 (16-bit, 2.0 Bytes/param)</option>
              <option :value="1.0">INT8 / FP8 (8-bit, 1.0 Byte/param)</option>
              <option :value="0.55">AWQ / GPTQ INT4 (4-bit, ~0.55 Bytes/param)</option>
              <option :value="0.38">GGUF Q3 / Q2 (3-bit, ~0.38 Bytes/param)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="field-label">{{ isEn ? "KV Cache Precision:" : "KV Cache 缓存精度：" }}</label>
            <select v-model.number="kvPrecBytes" class="cyber-select">
              <option :value="2.0">FP16 / BF16 (2 Bytes/token, 原生未量化)</option>
              <option :value="1.0">FP8 KV Cache (1 Byte/token, 节省 50%)</option>
              <option :value="0.5">INT4 KV Cache (0.5 Bytes/token, 节省 75%)</option>
            </select>
          </div>
        </div>

        <!-- 4. Context Window Length Slider & Controls -->
        <div class="slider-group">
          <div class="slider-header">
            <div class="field-label-row">
              <label class="field-label">{{ isEn ? "Context Window Length:" : "上下文窗口长度：" }}</label>
              <span class="context-limit-hint">
                {{ isEn ? "Max Supported:" : "模型支持上限：" }} <strong>{{ modelMaxContext.toLocaleString() }}</strong>
              </span>
            </div>
            <div class="context-val-box">
              <input
                v-model.number="ctxLength"
                type="number"
                :min="sliderMin"
                :max="effectiveMaxContext"
                :step="sliderStep"
                class="cyber-input context-number-input"
              >
              <span class="tokens-unit">Tokens</span>
              <span class="slider-val-badge">{{ (ctxLength / 1024).toFixed(1) }}K</span>
            </div>
          </div>

          <input
            v-model.number="ctxLength"
            type="range"
            :min="sliderMin"
            :max="effectiveMaxContext"
            :step="sliderStep"
            class="cyber-range"
          >

          <!-- Quick Context Preset Chips -->
          <div class="context-presets-row">
            <span class="presets-label">{{ isEn ? "Presets:" : "常用窗口：" }}</span>
            <button
              v-for="p in contextPresets"
              :key="p.val"
              type="button"
              class="context-preset-chip"
              :class="{ active: ctxLength === p.val }"
              @click="setContextLength(p.val)"
            >
              {{ p.label }}
            </button>
            <button
              type="button"
              class="context-preset-chip max-chip"
              :class="{ active: ctxLength === modelMaxContext }"
              @click="setContextLength(modelMaxContext)"
              :title="isEn ? 'Set to Model Native Max' : '设置为模型支持的最大上下文'"
            >
              MAX ({{ (modelMaxContext / 1024).toFixed(0) }}K)
            </button>
          </div>

          <!-- Sliding Window Eviction / RoPE Extrapolation Toggles -->
          <div class="extra-options-row">
            <label v-if="modelSlidingWindow" class="toggle-checkbox-label">
              <input type="checkbox" v-model="useSlidingWindowEviction" class="cyber-checkbox">
              <span>{{ isEn ? `Enable SWA Eviction (Cap KV to ${modelSlidingWindow.toLocaleString()} tokens)` : `启用 SWA 滑动窗口剔除 (KV 缓存上限锁在 ${modelSlidingWindow.toLocaleString()} Tokens)` }}</span>
            </label>
            <label class="toggle-checkbox-label">
              <input type="checkbox" v-model="enableRopeExtrapolation" class="cyber-checkbox">
              <span>{{ isEn ? "Allow Long-Context RoPE Extrapolation (up to 4x context)" : "启用 RoPE 超长外推模式 (最高测试 4 倍超长上下文)" }}</span>
            </label>
          </div>
        </div>

        <!-- 5. Concurrency Slider -->
        <div class="slider-group">
          <div class="slider-header">
            <label class="field-label">{{ isEn ? "Concurrency (Batch Size):" : "并发请求数 (Batch Size)：" }}</label>
            <span class="slider-val-badge">{{ concurrency }} Req</span>
          </div>
          <input v-model.number="concurrency" type="range" min="1" max="64" step="1" class="cyber-range">
        </div>

        <!-- 6. GPU Hardware Filter Search -->
        <div class="form-group">
          <label class="field-label">{{ isEn ? "Filter GPU Hardware Models:" : "过滤计算卡硬件型号：" }}</label>
          <input v-model="gpuSearchQuery" type="text" :placeholder="isEn ? 'Search RTX 5090, PPU 810E, 昇腾, H200, B200, MI300X...' : '搜索 4090, 5090, 平头哥 PPU 810E, 昇腾, 昆仑芯, 海光, H200, B200, MI300X...'" class="cyber-input">
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
            <div class="metric-label-row">
              <span class="metric-label">{{ isEn ? "KV Cache Memory" : "KV Cache 动态显存" }}</span>
              <span class="kv-micro-badge" :class="isMlaActive ? 'mla' : 'gqa'">
                {{ isMlaActive ? 'MLA 压缩' : (modelKvHeads === 1 ? 'MQA 压缩' : `GQA 1:${(modelQHeads / modelKvHeads).toFixed(0)}`) }}
              </span>
            </div>
            <span class="metric-num">{{ kvGb.toFixed(2) }} GB</span>
            <span class="metric-subtext">~{{ perReqKvKb.toFixed(1) }} KB/req</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ isEn ? "CUDA & Working Memory" : "CUDA 与激活缓冲区" }}</span>
            <span class="metric-num">{{ cudaBufferGb.toFixed(1) }} GB</span>
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

        <!-- Multi-GPU Parallelism Topology Constraints Notice -->
        <div class="parallelism-info-banner">
          <div class="topology-header">
            <div class="info-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 6px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              {{ isEn ? "Multi-GPU Parallelism Topology & Sizing Rules" : "多卡并行拓扑与卡数约束规范" }}
            </div>
            <div class="model-tp-tags">
              <span class="tp-model-tag">
                {{ isEn ? "Model KV Heads:" : "当前模型 KV 头数:" }} <strong>{{ modelKvHeads }}</strong>
              </span>
              <span class="tp-support-tag">
                {{ isEn ? "Supported Single-Node TP:" : "单机有效 TP 档位:" }}
                <strong>TP={{ supportedSingleNodeTp.join(' / ') }}</strong>
              </span>
              <span class="tp-badge-power2" :class="{ highlight: isStrictPowerOfTwoModel }">
                {{ isStrictPowerOfTwoModel ? (isEn ? "Strict 2^k Required" : "强约束 2 的幂次方") : (isEn ? "Flexible Divisibility" : "支持特定偶数整除") }}
              </span>
            </div>
          </div>
          <div class="topology-rules-grid">
            <div class="rule-card">
              <div class="rule-title">
                <span class="rule-num">1</span>
                {{ isEn ? "Why Odd Cards (3, 5, 7) are Prohibited" : "为什么奇数卡 (3、5、7 卡) 不可行？" }}
              </div>
              <div class="rule-desc" v-if="isEn">
                • <strong>Ring Topology Break:</strong> NVLink / All-Reduce ring communication requires symmetric pairs. Odd ranks break the ring and cause severe bus contention.<br>
                • <strong>Attention Head Indivisibility:</strong> Tensor Parallelism requires KV Heads % TP == 0. Standard 8 or 4 KV heads cannot be divided by 3, 5, or 7.<br>
                • <strong>Chassis &amp; NUMA Affinity:</strong> Standard server mainboards provide 1, 2, 4, or 8 PCIe/SXM slots. Odd counts break dual-socket CPU bus symmetry.
              </div>
              <div class="rule-desc" v-else>
                • <strong>通信环拓扑断裂：</strong>NVLink / All-Reduce 双向环依赖对称配对，奇数卡会导致环路断开与严重木桶延迟。<br>
                • <strong>注意力头数无法整除：</strong>张量并行要求 KV Heads % TP == 0，主流 8 或 4 个 KV 头无法对 3、5、7 对称切分。<br>
                • <strong>物理机箱与 NUMA 限制：</strong>工业级服务器均为 1、2、4、8 卡插槽，奇数卡会破坏双路 CPU 的 PCIe 通道对称性。
              </div>
            </div>
            <div class="rule-card">
              <div class="rule-title">
                <span class="rule-num">2</span>
                {{ isEn ? "Why Most Models Strictly Require 2^k Cards" : "为什么大部分模型必须为 2 的幂次方 (2^k)？" }}
              </div>
              <div class="rule-desc" v-if="isEn">
                • <strong>GQA Divisibility:</strong> In Llama 3 (8 KV heads), factors of 8 are strictly {1, 2, 4, 8}. Running TP=6 triggers: <code>ValueError: Total number of KV heads (8) must be divisible by tensor parallel size (6)</code>.<br>
                • <strong>NCCL Binary Tree:</strong> All-reduce collective algorithms form balanced binary trees under power-of-2 ranks for peak throughput.
              </div>
              <div class="rule-desc" v-else>
                • <strong>GQA 分组查询注意力限制：</strong>以 Llama 3 (8 个 KV 头) 为例，8 的因数仅有 1、2、4、8 卡。若在 vLLM 中配置 6 卡 (TP=6) 将直接报错终止！Qwen 2.5 7B (4 个 KV 头) 单机更是严格限制为 1、2、4 卡。<br>
                • <strong>NCCL 二叉树规约通信：</strong>通信底层以 2 的幂次方构建双二叉树，计算与通信效率达到全局最优。
              </div>
            </div>
            <div class="rule-card">
              <div class="rule-title">
                <span class="rule-num">3</span>
                {{ isEn ? "When Even Non-Power-of-2 Cards (6, 12, 24, 48) Work" : "什么时候可以使用偶数卡 (如 6 卡、12 卡、24 卡、48 卡)？" }}
              </div>
              <div class="rule-desc" v-if="isEn">
                • <strong>Pipeline Parallelism (PP):</strong> Layers are partitioned across GPUs (e.g. 36 or 48 layers can be split across 6 cards with PP=6 or TP=2 x PP=3).<br>
                • <strong>Multi-Node Clusters:</strong> Enterprise data centers scale in 8-card server chassis. 24 cards (3 nodes) and 48 cards (6 nodes) run TP=8 locally and PP/EP across nodes.
              </div>
              <div class="rule-desc" v-else>
                • <strong>流水线并行 (Pipeline Parallelism, PP)：</strong>按 Transformer 隐藏层划分。如 36 或 48 层模型可切分为 6 级流水线 (PP=6) 或 2xTP + 3xPP (共 6 卡)。<br>
                • <strong>跨机集群交付：</strong>数据中心以 8 卡整机为标准交付单元，集群规模为 8 的倍数 (16 卡、24 卡、32 卡、48 卡、64 卡)。24 卡 (3 节点) 与 48 卡 (6 节点) 节点内执行满速 TP=8，跨节点执行 PP/EP！
              </div>
            </div>
          </div>
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

// Model Platform Source: 'hf' | 'ms'
const modelSource = ref('hf');
const activeModelId = ref('Qwen/Qwen2.5-7B-Instruct');
const modelSearchQuery = ref('Qwen/Qwen2.5-7B-Instruct');
const searchContainerRef = ref(null);

const isDropdownOpen = ref(false);
const isSearching = ref(false);
const isSyncing = ref(false);
const syncError = ref('');
const hfSearchResults = ref([]);
const msSearchResults = ref([]);
const extraMsModels = ref([]);

// Model Architecture Parameters (Reactively Derived from config.json & Hub APIs)
const modelParamsB = ref(7.61);
const modelActiveParamsB = ref(7.61);
const modelLayers = ref(28);
const modelHiddenSize = ref(3584);
const modelQHeads = ref(28);
const modelKvHeads = ref(4);
const modelHeadDim = ref(128);

// KV Mechanism Specs
const isMlaActive = ref(false);
const mlaKvLoraRank = ref(0);
const mlaQkRopeDim = ref(64);
const mlaKvDim = ref(576);
const modelSlidingWindow = ref(null);
const useSlidingWindowEviction = ref(false);

// Context Limits
const modelBaseContext = ref(32768);
const modelMaxContext = ref(131072);
const enableRopeExtrapolation = ref(false);

// Deployment Options
const weightPrecBytes = ref(2.0); // FP16: 2, INT8: 1, INT4: 0.55, INT3/2: 0.38
const kvPrecBytes = ref(2.0); // FP16: 2, FP8: 1, INT4: 0.5
const ctxLength = ref(8192);
const concurrency = ref(4);
const gpuSearchQuery = ref('');

// Prepopulated Verified Specs for SSR/SSG parity
const syncedModelMeta = ref({
  id: 'Qwen/Qwen2.5-7B-Instruct',
  source: 'hf',
  type: 'Qwen2ForCausalLM',
  paramsDisplay: '7.61B',
  paramsB: 7.61,
  layers: 28,
  hiddenSize: 3584,
  qHeads: 28,
  kvHeads: 4,
  headDim: 128,
  isMla: false,
  attentionDesc: 'GQA (Q28 : KV4, 比例 1:7)',
  detectedQuant: 'BF16 / FP16',
  moeInfo: '稠密架构 (Dense)',
  baseCtx: 32768,
  maxCtx: 131072,
  slidingWindow: 131072
});

// Top Popular Hugging Face Models
const POPULAR_HF_MODELS = [
  { id: 'zai-org/GLM-5.3', name: 'GLM-5.3', org: 'zai-org', params: '753B', downloads: '24.1K', likes: 1120 },
  { id: 'zai-org/GLM-5.3-Flash', name: 'GLM-5.3-Flash', org: 'zai-org', params: 'Flash', downloads: '89.5K', likes: 1840 },
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
  { id: 'ZhipuAI/GLM-5.3', name: 'GLM-5.3', nameZh: '智谱 GLM-5.3 (753B 双稀疏MoE)', org: 'ZhipuAI', params: '753B', downloads: '16.6K', stars: 287 },
  { id: 'ZhipuAI/GLM-5.3-Flash', name: 'GLM-5.3-Flash', nameZh: '智谱 GLM-5.3 Flash 轻量极速版', org: 'ZhipuAI', params: 'Flash', downloads: '73.9K', stars: 214 },
  { id: 'ZhipuAI/GLM-4-9B-Chat', name: 'GLM-4-9B-Chat', nameZh: '智谱 GLM-4 9B 对话', org: 'ZhipuAI', params: '9.4B', downloads: '154K', stars: 620 },
  { id: 'qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5 7B Instruct', nameZh: '通义千问 2.5 7B 对话', org: 'qwen', params: '7.6B', downloads: '8.2M', stars: 1530 },
  { id: 'qwen/Qwen2.5-14B-Instruct', name: 'Qwen2.5 14B Instruct', nameZh: '通义千问 2.5 14B 对话', org: 'qwen', params: '14.7B', downloads: '2.1M', stars: 740 },
  { id: 'qwen/Qwen2.5-32B-Instruct', name: 'Qwen2.5 32B Instruct', nameZh: '通义千问 2.5 32B 对话', org: 'qwen', params: '32.5B', downloads: '3.6M', stars: 1120 },
  { id: 'qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B Instruct', nameZh: '通义千问 2.5 72B 对话', org: 'qwen', params: '72.7B', downloads: '4.3M', stars: 2350 },
  { id: 'qwen/Qwen2.5-Coder-7B-Instruct', name: 'Qwen2.5 Coder 7B', nameZh: '千问代码大模型 7B', org: 'qwen', params: '7.6B', downloads: '1.2M', stars: 890 },
  { id: 'qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen2.5 Coder 32B', nameZh: '千问代码大模型 32B', org: 'qwen', params: '32.5B', downloads: '2.4M', stars: 1410 },
  { id: 'qwen/Qwen3.8-Flash-Next', name: 'Qwen3.8-Flash-Next', nameZh: '千问 3.8 Flash Next', org: 'qwen', params: '180B', downloads: '65.4K', stars: 1264 },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3', nameZh: '深度求索 DeepSeek-V3 (MoE 671B)', org: 'deepseek-ai', params: '671B', downloads: '2.6M', stars: 6540 },
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1', nameZh: '深度求索 DeepSeek-R1 推理', org: 'deepseek-ai', params: '671B', downloads: '3.1M', stars: 7890 },
  { id: 'deepseek-ai/DeepSeek-V4.1-Flash', name: 'DeepSeek-V4.1-Flash', nameZh: '深度求索 V4.1 Flash', org: 'deepseek-ai', params: '484B', downloads: '19.0K', stars: 384 },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', name: 'DeepSeek-R1-Distill-Qwen-7B', nameZh: 'DeepSeek R1 蒸馏 Qwen 7B', org: 'deepseek-ai', params: '7.6B', downloads: '980K', stars: 1120 },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', name: 'DeepSeek-R1-Distill-Qwen-32B', nameZh: 'DeepSeek R1 蒸馏 Qwen 32B', org: 'deepseek-ai', params: '32.5B', downloads: '1.4M', stars: 1650 },
  { id: 'baichuan-inc/Baichuan2-7B-Chat', name: 'Baichuan2 7B Chat', nameZh: '百川 Baichuan2 7B 对话', org: 'baichuan-inc', params: '7B', downloads: '450K', stars: 320 },
  { id: 'baichuan-inc/Baichuan2-13B-Chat', name: 'Baichuan2 13B Chat', nameZh: '百川 Baichuan2 13B 对话', org: 'baichuan-inc', params: '13B', downloads: '620K', stars: 410 },
  { id: '01ai/Yi-1.5-9B-Chat', name: 'Yi-1.5 9B Chat', nameZh: '零一万物 Yi 1.5 9B', org: '01ai', params: '9B', downloads: '380K', stars: 290 },
  { id: '01ai/Yi-1.5-34B-Chat', name: 'Yi-1.5 34B Chat', nameZh: '零一万物 Yi 1.5 34B', org: '01ai', params: '34B', downloads: '510K', stars: 440 },
  { id: 'Shanghai_AI_Laboratory/internlm2_5-7b-chat', name: 'InternLM2.5 7B', nameZh: '书生·浦语 InternLM2.5 7B', org: 'Shanghai_AI_Laboratory', params: '7.7B', downloads: '890K', stars: 760 },
  { id: 'Shanghai_AI_Laboratory/internlm2_5-20b-chat', name: 'InternLM2.5 20B', nameZh: '书生·浦语 InternLM2.5 20B', org: 'Shanghai_AI_Laboratory', params: '20B', downloads: '640K', stars: 580 },
  { id: 'OpenBMB/MiniCPM-2B-sft-bf16', name: 'MiniCPM 2B', nameZh: '面壁智能 MiniCPM 2B', org: 'OpenBMB', params: '2.4B', downloads: '520K', stars: 410 },
  { id: 'OpenBMB/MiniCPM5-2B', name: 'MiniCPM5 2B', nameZh: '面壁智能 MiniCPM5 2B', org: 'OpenBMB', params: '2.5B', downloads: '97.0K', stars: 122 },
  { id: 'moonshotai/Kimi-K3', name: 'Kimi K3', nameZh: '月之暗面 Kimi K3 MoE', org: 'moonshotai', params: 'MoE', downloads: '310K', stars: 580 }
];

// Quick Recommendation Chips per platform
const currentQuickChips = computed(() => {
  if (modelSource.value === 'ms') {
    return [
      { id: 'ZhipuAI/GLM-5.3', label: 'GLM-5.3' },
      { id: 'ZhipuAI/GLM-5.3-Flash', label: 'GLM-5.3-Flash' },
      { id: 'qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B' },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3' },
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1' },
      { id: 'qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B' }
    ];
  }
  return [
    { id: 'zai-org/GLM-5.3', label: 'GLM-5.3' },
    { id: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B' },
    { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3' },
    { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1' },
    { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama-3.3-70B' },
    { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B' }
  ];
});

// Dynamic Context Calculations
const effectiveMaxContext = computed(() => {
  if (enableRopeExtrapolation.value) {
    return Math.min(4194304, modelMaxContext.value * 4);
  }
  return modelMaxContext.value;
});

const sliderMin = computed(() => {
  return Math.min(512, modelMaxContext.value);
});

const sliderStep = computed(() => {
  return 512;
});

const contextPresets = computed(() => {
  const standardPresets = [
    { val: 2048, label: '2K' },
    { val: 4096, label: '4K' },
    { val: 8192, label: '8K' },
    { val: 16384, label: '16K' },
    { val: 32768, label: '32K' },
    { val: 65536, label: '64K' },
    { val: 131072, label: '128K' },
    { val: 163840, label: '160K' },
    { val: 262144, label: '256K' },
    { val: 524288, label: '512K' },
    { val: 1048576, label: '1M' }
  ];
  return standardPresets.filter(p => p.val < effectiveMaxContext.value);
});

function setContextLength(val) {
  ctxLength.value = Math.min(effectiveMaxContext.value, Math.max(sliderMin.value, val));
}

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
    if (q && msSearchResults.value.length > 0) {
      return msSearchResults.value;
    }
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

// Online ModelScope Search with Smart Alias Resolution
async function fetchMsSearch(query) {
  isSearching.value = true;
  const qLower = query.toLowerCase();
  const results = [];
  const seenIds = new Set();

  // 1. Check local catalog first (prioritize exact/partial matches)
  const allMsCatalog = [...POPULAR_MS_MODELS, ...extraMsModels.value];

  // Specific alias promotion: glm5 / glm5.3 / glm-5 -> ZhipuAI/GLM-5.3 & GLM-5.3-Flash
  if (qLower.includes('glm5') || qLower.includes('glm-5') || qLower.includes('glm 5')) {
    const glm5 = allMsCatalog.find(m => m.id === 'ZhipuAI/GLM-5.3');
    const glm5f = allMsCatalog.find(m => m.id === 'ZhipuAI/GLM-5.3-Flash');
    if (glm5) { results.push(glm5); seenIds.add(glm5.id); }
    if (glm5f) { results.push(glm5f); seenIds.add(glm5f.id); }
  }

  for (const m of allMsCatalog) {
    if (!seenIds.has(m.id) && (
      m.id.toLowerCase().includes(qLower) ||
      (m.name && m.name.toLowerCase().includes(qLower)) ||
      (m.nameZh && m.nameZh.toLowerCase().includes(qLower))
    )) {
      results.push(m);
      seenIds.add(m.id);
    }
  }

  // 2. Query Hugging Face Open API and map known repositories to ModelScope
  try {
    const hfRes = await fetch(`https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=12`);
    if (hfRes.ok) {
      const hfData = await hfRes.json();
      for (const d of hfData) {
        let msId = d.id;
        const [org, name] = d.id.split('/');

        // Map Hugging Face organizations to ModelScope equivalents
        if (org === 'zai-org' || org === 'THUDM') {
          msId = `ZhipuAI/${name}`;
        } else if (org === 'Qwen') {
          msId = `qwen/${name}`;
        }

        if (!seenIds.has(msId)) {
          seenIds.add(msId);
          results.push({
            id: msId,
            name: name || msId,
            org: msId.split('/')[0] || '',
            downloads: d.downloads ? formatCount(d.downloads) : null,
            stars: d.likes || 0
          });
        }
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }

  msSearchResults.value = results;
  isSearching.value = false;
}

function onSearchInput() {
  isDropdownOpen.value = true;
  const q = modelSearchQuery.value.trim();
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

  if (!q) {
    hfSearchResults.value = [];
    msSearchResults.value = [];
    return;
  }

  searchDebounceTimer = setTimeout(() => {
    if (modelSource.value === 'hf') {
      fetchHfSearch(q);
    } else {
      fetchMsSearch(q);
    }
  }, 260);
}

function onSearchFocus() {
  isDropdownOpen.value = true;
}

function clearSearch() {
  modelSearchQuery.value = '';
  hfSearchResults.value = [];
  msSearchResults.value = [];
}

function switchSource(source) {
  modelSource.value = source;
  isDropdownOpen.value = false;
  syncError.value = '';
  if (source === 'ms') {
    const defaultId = 'ZhipuAI/GLM-5.3';
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
  let modelId = (targetId || activeModelId.value || '').trim();
  if (!modelId) return;

  // Auto-normalize shorthand queries
  const qLower = modelId.toLowerCase();
  if (modelSource.value === 'ms') {
    if (qLower === 'glm5.3' || qLower === 'glm-5.3' || qLower === 'glm5' || qLower === 'glm-5') {
      modelId = 'ZhipuAI/GLM-5.3';
    } else if (qLower === 'glm5.3-flash' || qLower === 'glm-5.3-flash') {
      modelId = 'ZhipuAI/GLM-5.3-Flash';
    } else if (!modelId.includes('/')) {
      // Shorthand prefix heuristics
      if (qLower.startsWith('qwen')) modelId = `qwen/${modelId}`;
      else if (qLower.startsWith('deepseek')) modelId = `deepseek-ai/${modelId}`;
      else if (qLower.startsWith('glm')) modelId = `ZhipuAI/${modelId}`;
    }
  } else {
    if (qLower === 'glm5.3' || qLower === 'glm-5.3' || qLower === 'glm5') {
      modelId = 'zai-org/GLM-5.3';
    }
  }

  activeModelId.value = modelId;
  modelSearchQuery.value = modelId;
  isSyncing.value = true;
  syncError.value = '';

  try {
    let configData = null;
    let tokenizerData = null;
    let exactParams = null;

    if (modelSource.value === 'hf') {
      // 1. Try Hugging Face API for exact safetensors parameter count (sum across all tensor formats)
      try {
        const apiRes = await fetch(`https://huggingface.co/api/models/${modelId}`);
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson.safetensors?.parameters) {
            const p = apiJson.safetensors.parameters;
            const sumParams = Object.values(p).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
            if (sumParams > 0) exactParams = sumParams;
          } else if (typeof apiJson.safetensors?.total === 'number' && apiJson.safetensors.total > 0) {
            exactParams = apiJson.safetensors.total;
          }
        }
      } catch (e) {}

      // 2. Fetch raw config.json
      const configRes = await fetch(`https://huggingface.co/${modelId}/raw/main/config.json`);
      if (!configRes.ok) {
        if (configRes.status === 401) {
          throw new Error(props.isEn ? 'This model is gated on Hugging Face (requires login access).' : '该模型在 Hugging Face 属于门禁模型 (Gated Repo)，需要登录凭据。');
        }
        throw new Error(props.isEn ? `Failed to fetch config.json (HTTP ${configRes.status})` : `无法获取 config.json (HTTP ${configRes.status})，请检查 Model ID 是否正确。`);
      }
      configData = await configRes.json();

      // 3. Optional tokenizer_config.json
      try {
        const tokRes = await fetch(`https://huggingface.co/${modelId}/raw/main/tokenizer_config.json`);
        if (tokRes.ok) tokenizerData = await tokRes.json();
      } catch (e) {}

    } else {
      // ModelScope
      // 1. Try ModelScope API for exact verified safetensor model_size
      try {
        const msApiRes = await fetch(`https://www.modelscope.cn/api/v1/models/${modelId}`);
        if (msApiRes.ok) {
          const msApiJson = await msApiRes.json();
          const dInfo = msApiJson.Data || {};
          const pSize = dInfo.ModelInfos?.safetensor?.model_size;
          if (typeof pSize === 'number' && pSize > 0) {
            exactParams = pSize;
          } else if (typeof dInfo.StorageSize === 'number' && dInfo.StorageSize > 0) {
            exactParams = dInfo.StorageSize;
          }
        }
      } catch (e) {}

      // Fallback: Query Hugging Face open CORS API with mapped ID if ModelScope API was CORS-blocked in browser
      if (!exactParams) {
        try {
          const hfEquivalentId = modelId
            .replace(/^ZhipuAI\//, 'zai-org/')
            .replace(/^qwen\//, 'Qwen/');
          const hfRes = await fetch(`https://huggingface.co/api/models/${hfEquivalentId}`);
          if (hfRes.ok) {
            const hfJson = await hfRes.json();
            if (hfJson.safetensors?.parameters) {
              const sumP = Object.values(hfJson.safetensors.parameters).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
              if (sumP > 0) exactParams = sumP;
            }
          }
        } catch (e) {}
      }

      // 2. Fetch raw config.json (CORS open)
      const msUrl = `https://modelscope.cn/models/${modelId}/resolve/master/config.json`;
      const configRes = await fetch(msUrl);
      if (!configRes.ok) {
        throw new Error(props.isEn ? `Failed to fetch ModelScope config (HTTP ${configRes.status})` : `无法获取魔搭社区 config.json (HTTP ${configRes.status})，请检查模型 ID 是否存在。`);
      }
      configData = await configRes.json();

      // 3. Optional tokenizer_config.json
      try {
        const msTokUrl = `https://modelscope.cn/models/${modelId}/resolve/master/tokenizer_config.json`;
        const tokRes = await fetch(msTokUrl);
        if (tokRes.ok) tokenizerData = await tokRes.json();
      } catch (e) {}
    }

    // Flatten nested text_config if present (multimodal/VL models like GLM-5.3-Flash, Qwen-VL)
    const rawConfig = { ...configData, ...(configData.text_config || {}) };

    // Auto-parse Model Architecture
    const hiddenSize = rawConfig.hidden_size || rawConfig.d_model || 4096;
    const layers = rawConfig.num_hidden_layers || rawConfig.n_layer || rawConfig.num_layers || 32;
    const qHeads = rawConfig.num_attention_heads || rawConfig.n_head || 32;
    const kvHeads = rawConfig.num_key_value_heads || rawConfig.num_kv_heads || rawConfig.n_head_kv || qHeads;
    const intermediateSize = rawConfig.intermediate_size || (hiddenSize * 4);
    const vocabSize = rawConfig.vocab_size || 32000;
    const modelType = rawConfig.model_type || rawConfig.architectures?.[0] || 'transformer';

    // KV Cache & Attention Mechanism Detection (MHA / GQA / MQA / MLA)
    const isMla = !!(rawConfig.kv_lora_rank);
    const kvLoraRank = rawConfig.kv_lora_rank || 0;
    const qkRopeDim = rawConfig.qk_rope_head_dim || 64;
    const headDim = rawConfig.head_dim || rawConfig.v_head_dim || Math.floor(hiddenSize / qHeads);

    isMlaActive.value = isMla;
    mlaKvLoraRank.value = kvLoraRank;
    mlaQkRopeDim.value = qkRopeDim;
    mlaKvDim.value = isMla ? (kvLoraRank + qkRopeDim) : (2 * kvHeads * headDim);
    modelHeadDim.value = headDim;

    let attentionDesc = '';
    if (isMla) {
      const baselineKvDim = 2 * qHeads * headDim;
      const savings = Math.max(0, ((1 - (mlaKvDim.value / baselineKvDim)) * 100)).toFixed(1);
      attentionDesc = `MLA 潜在注意力 (kv_lora: ${kvLoraRank}, qk_rope: ${qkRopeDim}, 显存压缩率 ${savings}%)`;
    } else if (kvHeads === 1) {
      attentionDesc = `MQA 多查询注意力 (Q${qHeads} : KV1, 显存压缩率 ${((1 - 1/qHeads)*100).toFixed(0)}%)`;
    } else if (kvHeads < qHeads) {
      const ratio = (qHeads / kvHeads).toFixed(0);
      attentionDesc = `GQA 分组查询注意力 (Q${qHeads} : KV${kvHeads}, 比例 1:${ratio})`;
    } else {
      attentionDesc = `MHA 多头注意力 (Q${qHeads} : KV${kvHeads}, 未压缩)`;
    }

    // Sliding Window Detection
    const slidingWindow = typeof rawConfig.sliding_window === 'number' && rawConfig.sliding_window > 0
      ? rawConfig.sliding_window
      : null;
    modelSlidingWindow.value = slidingWindow;
    useSlidingWindowEviction.value = false;

    // Context Limits Extraction (Zero Hardcoding)
    const contextCandidates = [];
    const contextKeys = [
      'max_position_embeddings',
      'seq_length',
      'max_sequence_length',
      'max_seq_len',
      'model_max_length',
      'sliding_window',
      'n_positions',
      'seq_len',
      'max_target_positions'
    ];
    for (const k of contextKeys) {
      const v = rawConfig[k];
      if (typeof v === 'number' && v >= 512 && v <= 10000000) {
        contextCandidates.push(v);
      }
    }

    if (tokenizerData && typeof tokenizerData.model_max_length === 'number') {
      const tLen = tokenizerData.model_max_length;
      if (tLen >= 512 && tLen <= 10000000) {
        contextCandidates.push(tLen);
      }
    }

    if (rawConfig.rope_scaling && typeof rawConfig.rope_scaling === 'object') {
      const factor = rawConfig.rope_scaling.factor;
      const orig = rawConfig.rope_scaling.original_max_position_embeddings;
      if (typeof factor === 'number' && factor > 1) {
        const base = orig || rawConfig.max_position_embeddings || 4096;
        contextCandidates.push(Math.round(base * factor));
      }
    }

    let baseCtx = rawConfig.max_position_embeddings || rawConfig.seq_length || rawConfig.n_positions || 8192;
    let maxCtx = baseCtx;
    if (contextCandidates.length > 0) {
      maxCtx = Math.max(...contextCandidates);
    }
    if (baseCtx > maxCtx) baseCtx = maxCtx;

    modelBaseContext.value = baseCtx;
    modelMaxContext.value = maxCtx;

    // Intelligent context length initialization
    if (ctxLength.value > effectiveMaxContext.value) {
      ctxLength.value = effectiveMaxContext.value;
    } else if (ctxLength.value < sliderMin.value) {
      ctxLength.value = sliderMin.value;
    }

    // Auto-detect Weight Quantization Format
    let detectedQuant = 'BF16 / FP16';
    let suggestedWeightPrec = 2.0;

    if (rawConfig.quantization_config || configData.quantization_config) {
      const qCfg = rawConfig.quantization_config || configData.quantization_config;
      const method = (qCfg.quant_method || qCfg.quant_type || '').toLowerCase();
      const bits = qCfg.bits || (qCfg.load_in_4bit ? 4 : (qCfg.load_in_8bit ? 8 : null));

      if (method === 'awq' || method === 'gptq' || bits === 4) {
        detectedQuant = `AWQ / GPTQ (${bits || 4}-bit)`;
        suggestedWeightPrec = 0.55;
      } else if (method === 'fp8' || qCfg.fmt === 'e4m3' || bits === 8) {
        detectedQuant = 'FP8 (8-bit)';
        suggestedWeightPrec = 1.0;
      }
    } else if (rawConfig.torch_dtype === 'float32' || rawConfig.dtype === 'float32') {
      detectedQuant = 'FP32 (32-bit)';
      suggestedWeightPrec = 4.0;
    } else if (rawConfig.torch_dtype || rawConfig.dtype) {
      detectedQuant = (rawConfig.torch_dtype || rawConfig.dtype).toUpperCase();
      suggestedWeightPrec = 2.0;
    }
    weightPrecBytes.value = suggestedWeightPrec;

    // MoE Architecture Extraction
    const isMoe = !!(rawConfig.n_routed_experts || rawConfig.num_local_experts);
    const routedExperts = rawConfig.n_routed_experts || rawConfig.num_local_experts || 1;
    const expertsPerTok = rawConfig.num_experts_per_tok || rawConfig.num_experts_per_token || 1;
    const moeIntermediate = rawConfig.moe_intermediate_size || intermediateSize;
    const sharedExperts = rawConfig.n_shared_experts || 0;

    let moeInfo = '稠密架构 (Dense Transformer)';
    if (isMoe) {
      moeInfo = `MoE (${routedExperts} 路由专家, 激活 ${expertsPerTok} 专家${sharedExperts ? ` + ${sharedExperts} 共享` : ''})`;
    }

    // Mathematical Parameter Derivation
    let calculatedParamsB = 0;
    let activeParamsB = 0;

    // MoE Architecture with dense layer replacement (first_k_dense_replace)
    const firstKDenseReplace = rawConfig.first_k_dense_replace || 0;
    const moeLayers = Math.max(0, layers - firstKDenseReplace);
    const denseLayers = Math.min(layers, firstKDenseReplace);

    // Analytical Layer Architecture Weights
    const attnParams = isMla
      ? (hiddenSize * (rawConfig.q_lora_rank || hiddenSize) + (rawConfig.q_lora_rank || hiddenSize) * (qHeads * qkRopeDim) + hiddenSize * (kvLoraRank + qkRopeDim) + kvLoraRank * (qHeads * headDim) + (qHeads * headDim) * hiddenSize)
      : (hiddenSize * (hiddenSize * (1 + 2 * (kvHeads / qHeads))));

    const denseMlpParams = 3 * hiddenSize * intermediateSize;
    const moeMlpParams = isMoe
      ? (routedExperts * 3 * hiddenSize * moeIntermediate) + (sharedExperts * 3 * hiddenSize * intermediateSize)
      : denseMlpParams;

    const activeMoeMlpParams = isMoe
      ? (expertsPerTok * 3 * hiddenSize * moeIntermediate) + (sharedExperts * 3 * hiddenSize * intermediateSize)
      : denseMlpParams;

    const perLayerDenseTotal = attnParams + denseMlpParams + (4 * hiddenSize);
    const perLayerMoeTotal = attnParams + moeMlpParams + (4 * hiddenSize);
    const perLayerMoeActive = attnParams + activeMoeMlpParams + (4 * hiddenSize);

    if (exactParams && typeof exactParams === 'number' && exactParams > 0) {
      calculatedParamsB = exactParams / 1e9;
      if (isMoe && routedExperts > 1) {
        const activeRatio = ((moeLayers * perLayerMoeActive) + (denseLayers * perLayerDenseTotal)) / ((moeLayers * perLayerMoeTotal) + (denseLayers * perLayerDenseTotal));
        activeParamsB = Math.max(0.1, parseFloat((calculatedParamsB * activeRatio).toFixed(1)));
      } else {
        activeParamsB = calculatedParamsB;
      }
    } else {
      const totalEstimated = (moeLayers * perLayerMoeTotal) + (denseLayers * perLayerDenseTotal) + (2 * vocabSize * hiddenSize);
      const activeEstimated = (moeLayers * perLayerMoeActive) + (denseLayers * perLayerDenseTotal) + (2 * vocabSize * hiddenSize);

      calculatedParamsB = totalEstimated / 1e9;
      activeParamsB = activeEstimated / 1e9;
    }

    // Update active reactive state
    modelParamsB.value = Math.max(0.1, parseFloat(calculatedParamsB.toFixed(2)));
    modelActiveParamsB.value = Math.max(0.1, parseFloat(activeParamsB.toFixed(2)));
    modelLayers.value = layers;
    modelHiddenSize.value = hiddenSize;
    modelQHeads.value = qHeads;
    modelKvHeads.value = kvHeads;

    const paramsDisplay = isMoe
      ? `${modelParamsB.value.toFixed(1)}B (激活 ~${modelActiveParamsB.value.toFixed(1)}B)`
      : `${modelParamsB.value.toFixed(2)}B`;

    syncedModelMeta.value = {
      id: modelId,
      source: modelSource.value,
      type: modelType,
      paramsDisplay,
      paramsB: calculatedParamsB,
      layers,
      hiddenSize,
      qHeads,
      kvHeads,
      headDim,
      isMla,
      attentionDesc,
      detectedQuant,
      moeInfo,
      baseCtx,
      maxCtx,
      slidingWindow
    };

  } catch (err) {
    syncError.value = err.message || String(err);
  } finally {
    isSyncing.value = false;
  }
}

// 16 Enterprise & Domestic AI Accelerator Models
const ALL_GPUS = [
  { id: 'rtx-4090', name: 'NVIDIA RTX 4090', category: '消费级旗舰', vramGb: 24, memType: 'GDDR6X', bandwidth: '1.0 TB/s', bus: 'PCIe 4.0' },
  { id: 'rtx-5090', name: 'NVIDIA RTX 5090', category: 'Blackwell 消费旗舰', vramGb: 32, memType: 'GDDR7', bandwidth: '1.79 TB/s', bus: 'PCIe 5.0' },
  { id: 'mtt-s4000', name: '摩尔线程 MTT S4000', category: '国产全功能 GPU', vramGb: 48, memType: 'GDDR6', bandwidth: '768 GB/s', bus: 'MT-Link / PCIe 5.0' },
  { id: 'rtx-6000-ada', name: 'NVIDIA RTX 6000 Ada', category: '专业工作站旗舰', vramGb: 48, memType: 'GDDR6', bandwidth: '960 GB/s', bus: 'PCIe 4.0' },
  { id: 'l40s', name: 'NVIDIA L40S', category: '通用数据中心', vramGb: 48, memType: 'GDDR6', bandwidth: '864 GB/s', bus: 'PCIe 4.0' },
  { id: 'ascend-910b', name: '华为昇腾 Ascend 910B', category: '国产信创主力', vramGb: 64, memType: 'HBM2e', bandwidth: '819 GB/s', bus: 'HCCS' },
  { id: 'hygon-k100', name: '海光 DCU K100-AI', category: '国产 GPGPU (深算二号)', vramGb: 64, memType: 'HBM2e', bandwidth: '1.2 TB/s', bus: 'PCIe 4.0' },
  { id: 'a100-80', name: 'NVIDIA A100 SXM4', category: '企业级主力', vramGb: 80, memType: 'HBM2e', bandwidth: '2.04 TB/s', bus: 'NVLink 3' },
  { id: 'h100-80', name: 'NVIDIA H100 SXM5', category: 'Hopper 旗舰', vramGb: 80, memType: 'HBM3', bandwidth: '3.35 TB/s', bus: 'NVLink 4' },
  { id: 'ppu-810e', name: '阿里平头哥 PPU 810E (真武)', category: '阿里自研信创主力', vramGb: 96, memType: 'HBM2e', bandwidth: '1.6 TB/s', bus: 'ICN / OAM' },
  { id: 'kunlun-p800', name: '百度昆仑芯 P800', category: '百度信创旗舰', vramGb: 96, memType: 'HBM3', bandwidth: '2.4 TB/s', bus: 'PCIe 5.0 / OAM' },
  { id: 'h20-96', name: 'NVIDIA H20 SXM', category: '合规大显存卡', vramGb: 96, memType: 'HBM3', bandwidth: '4.0 TB/s', bus: 'NVLink 4' },
  { id: 'ascend-910c', name: '华为昇腾 Ascend 910C', category: '国产双芯旗舰', vramGb: 128, memType: 'HBM2e', bandwidth: '3.2 TB/s', bus: 'HCCS' },
  { id: 'h200-141', name: 'NVIDIA H200 SXM', category: '超大显存 Hopper', vramGb: 141, memType: 'HBM3e', bandwidth: '4.8 TB/s', bus: 'NVLink 4' },
  { id: 'b200-192', name: 'NVIDIA B200 SXM', category: 'Blackwell 顶配', vramGb: 192, memType: 'HBM3e', bandwidth: '8.0 TB/s', bus: 'NVLink 5' },
  { id: 'mi300x', name: 'AMD Instinct MI300X', category: 'AMD 旗舰加速卡', vramGb: 192, memType: 'HBM3', bandwidth: '5.3 TB/s', bus: 'Infinity Fabric' }
];

// Formula 1: Model Static Weights (GiB)
const weightsGb = computed(() => {
  return modelParamsB.value * weightPrecBytes.value;
});

// Formula 2: KV Cache per token with MLA / SWA support
const perReqKvKb = computed(() => {
  const effectiveCtx = (useSlidingWindowEviction.value && modelSlidingWindow.value)
    ? Math.min(ctxLength.value, modelSlidingWindow.value)
    : ctxLength.value;

  let kvBytesPerToken = 0;
  if (isMlaActive.value) {
    // Multi-Head Latent Attention (MLA) compressed dimension
    kvBytesPerToken = modelLayers.value * mlaKvDim.value * kvPrecBytes.value;
  } else {
    // Standard MHA / GQA / MQA
    const hDim = modelHeadDim.value || Math.floor(modelHiddenSize.value / modelQHeads.value);
    kvBytesPerToken = 2 * modelLayers.value * modelKvHeads.value * hDim * kvPrecBytes.value;
  }
  return (kvBytesPerToken * effectiveCtx) / 1024;
});

const kvGb = computed(() => {
  const totalKb = perReqKvKb.value * concurrency.value;
  return totalKb / (1024 * 1024);
});

// Formula 3: Dynamic CUDA Buffer & Activation Overhead
const cudaBufferGb = computed(() => {
  const activationOverhead = Math.min(6.0, (modelParamsB.value * 0.032) + ((ctxLength.value / 1024) * concurrency.value * 0.012));
  return parseFloat((0.8 + activationOverhead).toFixed(1));
});

// Formula 4: Total Required VRAM
const totalVramGb = computed(() => {
  return weightsGb.value + kvGb.value + cudaBufferGb.value;
});

const supportedSingleNodeTp = computed(() => {
  const kvH = modelKvHeads.value || 8;
  const isMla = isMlaActive.value;

  if (isMla) {
    return [1, 2, 4, 8];
  }

  // Divisors of kvHeads within [1, 2, 4, 8]
  const valid = [];
  for (const tp of [1, 2, 4, 8]) {
    if (kvH % tp === 0) {
      valid.push(tp);
    }
  }
  return valid.length > 0 ? valid : [1];
});

const isStrictPowerOfTwoModel = computed(() => {
  const kvH = modelKvHeads.value || 8;
  return [2, 4, 8, 16, 32, 64, 128].includes(kvH);
});

const recommendationText = computed(() => {
  const v = totalVramGb.value;
  if (props.isEn) {
    if (v <= 22) return 'Optimal Fit: 1x RTX 4090 24GB or RTX 5090 32GB can run single-card full speed (TP=1).';
    if (v <= 44) return 'Optimal Fit: 2x RTX 4090 24GB (TP=2) or 1x L40S / RTX 6000 Ada 48GB (TP=1).';
    if (v <= 75) return 'Optimal Fit: 1x NVIDIA A100 / H100 80GB SXM (TP=1).';
    if (v <= 88) return 'Optimal Fit: 1x T-Head PPU 810E (96GB) / Kunlunxin P800 / NVIDIA H20 96GB (TP=1).';
    if (v <= 135) return 'Optimal Fit: 1x NVIDIA H200 141GB or 2x 80GB SXM (TP=2) / 1x Ascend 910C 128GB.';
    if (v <= 180) return 'Optimal Fit: 1x NVIDIA B200 192GB / AMD MI300X (TP=1) or 4x 80GB SXM (TP=4).';
    if (v <= 360) return 'Optimal Fit: 2x B200 192GB / MI300X (TP=2) or 8x 80GB SXM Server (TP=8 full chassis).';
    if (v <= 720) return 'Enterprise Fit: 4x B200 192GB (TP=4) or 16x 80GB SXM (2-Node Cluster, TP=8 EP=2).';
    if (v <= 1400) return 'Hyperscale Topology: 8x B200 192GB (1-Node TP=8 full chassis) or 16x 80GB SXM (2-Node Cluster, TP=8 EP=2).';
    const num80G = Math.ceil(v / (80 * 0.92 * 8)) * 8;
    const numB200 = Math.ceil(v / (192 * 0.92 * 8)) * 8;
    return `Enterprise Topology: ${num80G}x 80GB GPUs (${num80G / 8} Nodes, TP=8) or ${numB200}x B200 GPUs (${numB200 / 8} Nodes, TP=8).`;
  } else {
    if (v <= 22) return '最佳适配方案：单张 RTX 4090 24G 或 RTX 5090 32G 即可全速单卡部署 (TP=1)。';
    if (v <= 44) return '最佳适配方案：2 张 RTX 4090 (TP=2) 或单张 L40S / RTX 6000 Ada 48G (TP=1)。';
    if (v <= 75) return '最佳适配方案：单张 A100 / H100 80G SXM (TP=1)。';
    if (v <= 88) return '最佳适配方案：单张阿里平头哥 PPU 810E (96G) / 百度昆仑芯 P800 / NVIDIA H20 (96G) 独占 (TP=1)。';
    if (v <= 135) return '最佳适配方案：单张 H200 141G 独占，或双卡 80G (TP=2) / 单张昇腾 910C (128G)。';
    if (v <= 180) return '最佳适配方案：单张 B200 192G / AMD MI300X 独占，或 4 卡 80G SXM (TP=4)。';
    if (v <= 360) return '最佳适配方案：双卡 B200 / MI300X (TP=2) 或 8 卡 80G 整机满配 (TP=8)。';
    if (v <= 720) return '企业级拓扑：4 卡 B200 (TP=4) 或 16 卡 80G (2 节点集群, TP=8 EP=2)。';
    if (v <= 1400) return '超大规模集群：单台 8 卡 B200 (单机满配, TP=8) 或 16 卡 80G (2 节点集群, TP=8 EP=2)。';
    const num80G = Math.ceil(v / (80 * 0.92 * 8)) * 8;
    const numB200 = Math.ceil(v / (192 * 0.92 * 8)) * 8;
    return `超大规模拓扑：需 ${num80G} 张 80G (${num80G / 8} 节点整机, TP=8) 或 ${numB200} 张 B200 (${numB200 / 8} 节点整机, TP=8) 组网。`;
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
    const rawCards = v / usableVram;

    // Strict Parallelism Constraint:
    // 1. Single card: rawCards <= 1 (TP=1)
    // 2. Single node: strictly power of 2 (2, 4, 8). Never odd cards (3, 5, 7)!
    // 3. Multi-node cluster: standard 8-GPU chassis multiples (16, 24, 32, 48, 64). Never odd cards!
    let allocatedCards = 1;
    let statusClass = 'fit-success';
    let statusText = '';

    if (rawCards <= 1.0) {
      allocatedCards = 1;
      statusClass = 'fit-success';
      statusText = props.isEn ? '1 Card (Single GPU TP=1)' : '单卡可用 (TP=1)';
    } else if (rawCards <= 2.0) {
      allocatedCards = 2;
      statusClass = 'fit-cluster';
      statusText = props.isEn ? '2 Cards (TP=2, 2^k)' : '2 卡并行 (TP=2, 2^k 约束)';
    } else if (rawCards <= 4.0) {
      allocatedCards = 4;
      statusClass = 'fit-cluster';
      statusText = props.isEn ? '4 Cards (TP=4, 2^k)' : '4 卡并行 (TP=4, 2^k 约束)';
    } else if (rawCards <= 8.0) {
      allocatedCards = 8;
      statusClass = 'fit-cluster';
      statusText = props.isEn ? '8 Cards (Full Chassis TP=8)' : '8 卡整机 (单机满配 TP=8)';
    } else {
      // Multi-node cluster: standard 8-GPU node chassis multiples
      const rawNodes = rawCards / 8;
      let targetNodes = Math.ceil(rawNodes);
      // Standard cluster scaling: avoid awkward odd node counts (e.g. 5 nodes -> 6 nodes, 7 nodes -> 8 nodes)
      if (targetNodes === 5) targetNodes = 6;
      else if (targetNodes === 7) targetNodes = 8;

      allocatedCards = targetNodes * 8;
      statusClass = 'fit-exceeded';
      const ppOrEp = `TP=8 + PP/EP=${targetNodes}`;
      statusText = props.isEn
        ? `${allocatedCards} Cards (${targetNodes}-Node Cluster, ${ppOrEp})`
        : `${allocatedCards} 卡集群 (${targetNodes} 节点整机, ${ppOrEp})`;
    }

    return {
      ...gpu,
      cardsNeeded: allocatedCards,
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
  gap: 8px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  padding: 0 10px;
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
}

.search-text-input {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 8px 4px !important;
  font-size: 0.86rem;
  color: #f1f5f9;
  flex: 1;
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
  gap: 6px 14px;
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
}

.meta-item.full-row {
  grid-column: span 2;
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

.kv-mech-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.74rem;
}

.mla-badge {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.gqa-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.3);
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

.field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.context-limit-hint {
  font-size: 0.72rem;
  color: #818cf8;
  font-family: var(--font-mono, monospace);
  margin-right: 12px;
}

.context-val-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.context-number-input {
  width: 90px !important;
  padding: 4px 6px !important;
  font-size: 0.82rem !important;
  text-align: right;
}

.tokens-unit {
  font-size: 0.72rem;
  color: var(--text-muted, #94a3b8);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.context-presets-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.presets-label {
  font-size: 0.72rem;
  color: var(--text-muted, #94a3b8);
  font-family: var(--font-mono, monospace);
}

.context-preset-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 0.7rem;
  font-family: var(--font-mono, monospace);
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.context-preset-chip:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #ffffff;
}

.context-preset-chip.active {
  background: #6366f1;
  border-color: #818cf8;
  color: #ffffff;
  font-weight: 600;
}

.context-preset-chip.max-chip {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.context-preset-chip.max-chip.active {
  background: #10b981;
  color: #ffffff;
}

.extra-options-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.toggle-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: #94a3b8;
  cursor: pointer;
}

.toggle-checkbox-label:hover {
  color: #e2e8f0;
}

.cyber-checkbox {
  accent-color: #6366f1;
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
  background: rgba(15, 20, 32, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 2px solid rgba(99, 102, 241, 0.4);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s ease;
}

.metric-card:hover {
  background: rgba(20, 27, 45, 0.9);
  border-color: rgba(99, 102, 241, 0.4);
}

.metric-card.highlight {
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-top: 2px solid #38bdf8;
  box-shadow: 0 4px 20px rgba(56, 189, 248, 0.12);
}

.metric-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 0.72rem;
  color: var(--text-muted, #94a3b8);
  font-family: var(--font-mono, monospace);
}

.kv-micro-badge {
  font-size: 0.62rem;
  font-family: var(--font-mono, monospace);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.kv-micro-badge.mla {
  background: rgba(244, 63, 94, 0.2);
  color: #fb7185;
}

.kv-micro-badge.gqa {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

.metric-subtext {
  font-size: 0.68rem;
  color: #64748b;
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
  border: 1px solid rgba(16, 185, 129, 0.28);
  color: #34d399;
  border-radius: 8px;
  padding: 11px 16px;
  font-size: 0.88rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.08);
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

.parallelism-info-banner {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 10px;
  padding: 14px 16px;
  margin-top: 14px;
  font-size: 0.76rem;
  line-height: 1.55;
  color: #94a3b8;
}

.topology-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 10px;
}

.topology-header .info-title {
  font-weight: 700;
  color: #c7d2fe;
  display: flex;
  align-items: center;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
}

.model-tp-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tp-model-tag, .tp-support-tag {
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
}

.tp-model-tag strong, .tp-support-tag strong {
  color: #38bdf8;
}

.tp-badge-power2 {
  background: rgba(234, 179, 8, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.3);
  color: #fbbf24;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.7rem;
}

.tp-badge-power2.highlight {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  color: #a5b4fc;
}

.topology-rules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.rule-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 10px 12px;
}

.rule-title {
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
}

.rule-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: 700;
}

.rule-desc {
  white-space: pre-line;
  color: #94a3b8;
  font-size: 0.72rem;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .topology-rules-grid {
    grid-template-columns: 1fr;
  }
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
