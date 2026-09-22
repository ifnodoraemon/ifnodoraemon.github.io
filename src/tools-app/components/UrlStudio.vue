<template>
  <div class="terminal-window url-window" id="url-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: url_query_builder.sh --rfc=3986</div>
      <div class="terminal-actions">
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="loadSample">{{ isEn ? 'Sample URL' : '示例 URL' }}</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="clearAll">{{ isEn ? 'Clear' : '清空' }}</button>
      </div>
    </div>

    <div class="tool-app-body url-layout">
      <!-- Raw Input -->
      <div class="url-input-block">
        <label class="field-label">{{ isEn ? 'Raw URL or Query String:' : '原始 URL 或编码字符串：' }}</label>
        <textarea
          v-model="rawUrl"
          class="url-textarea"
          placeholder="https://blog.llmgo.top/articles/ai-agent/?lang=zh&utm_source=github"
          spellcheck="false"
          @input="parseFromInput"
        ></textarea>

        <div class="url-actions-row">
          <button type="button" class="tool-btn btn-secondary btn-sm" @click="encodeComp">encodeURIComponent</button>
          <button type="button" class="tool-btn btn-secondary btn-sm" @click="encodeFull">encodeURI</button>
          <button type="button" class="tool-btn btn-secondary btn-sm" @click="decodeSingle">decodeURI</button>
          <button type="button" class="tool-btn btn-highlight btn-sm" @click="decodeDeep">⚡ {{ isEn ? 'Deep Multi-Pass Decode' : '多层嵌套深度解码' }}</button>
        </div>
      </div>

      <!-- Breakdown Grid -->
      <div class="breakdown-grid">
        <div class="breakdown-card">
          <span class="breakdown-label">Protocol:</span>
          <code>{{ urlParts.protocol || '-' }}</code>
        </div>
        <div class="breakdown-card">
          <span class="breakdown-label">Host / Origin:</span>
          <code>{{ urlParts.host || '-' }}</code>
        </div>
        <div class="breakdown-card">
          <span class="breakdown-label">Pathname:</span>
          <code>{{ urlParts.pathname || '-' }}</code>
        </div>
        <div class="breakdown-card">
          <span class="breakdown-label">Hash:</span>
          <code>{{ urlParts.hash || '-' }}</code>
        </div>
      </div>

      <!-- Interactive Query Table -->
      <div class="query-section">
        <div class="query-header">
          <h3 class="card-title">{{ isEn ? 'Interactive Query Parameters Table' : 'Query 参数可视化交互表格' }}</h3>
          <button type="button" class="tool-btn btn-secondary btn-sm" @click="addParam">+ {{ isEn ? 'Add Parameter' : '新增参数' }}</button>
        </div>

        <div class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">{{ isEn ? 'Active' : '启用' }}</th>
                <th>{{ isEn ? 'Key' : '参数名 (Key)' }}</th>
                <th>{{ isEn ? 'Value' : '参数值 (Value)' }}</th>
                <th style="width: 60px; text-align: center;">{{ isEn ? 'Action' : '操作' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(param, idx) in queryParams" :key="param.id" :class="{ 'param-off': !param.enabled }">
                <td style="text-align: center;">
                  <input v-model="param.enabled" type="checkbox" class="cyber-checkbox">
                </td>
                <td>
                  <input v-model="param.key" type="text" class="cyber-input param-input" placeholder="Key">
                </td>
                <td>
                  <input v-model="param.value" type="text" class="cyber-input param-input" placeholder="Value">
                </td>
                <td style="text-align: center;">
                  <button type="button" class="del-btn" @click="removeParam(idx)" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  </button>
                </td>
              </tr>
              <tr v-if="queryParams.length === 0">
                <td colspan="4" class="text-center text-muted" style="padding: 1.5rem;">
                  {{ isEn ? 'No query parameters detected in URL' : '当前 URL 无 Query 参数，可点击上方按钮添加' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Reconstructed Clean URL -->
      <div class="reconstructed-block">
        <div class="reconstructed-header">
          <span class="field-label">{{ isEn ? 'Reconstructed Clean Synthesized URL:' : '实时重新组装与清理后的 URL：' }}</span>
          <button type="button" class="tool-btn btn-highlight btn-sm" @click="copyReconstructed">{{ isEn ? 'Copy URL' : '一键复制完整 URL' }}</button>
        </div>
        <textarea :value="reconstructedUrl" class="url-textarea recon-textarea" readonly spellcheck="false"></textarea>
      </div>
    </div>

    <div v-if="toastMsg" class="toast-popup">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  lang: { type: String, default: 'zh' },
  isEn: { type: Boolean, default: false }
});

const rawUrl = ref('https://blog.llmgo.top/articles/ai-agent/?utm_source=github&utm_medium=readme&session=eyJhbGciOiJIUzI1NiJ9&lang=zh-CN#faq-section');
const queryParams = ref([]);
const basePathPrefix = ref('');
const hashPart = ref('');
const toastMsg = ref('');
let idSeq = 1;

function showToast(msg) {
  toastMsg.value = msg;
  setTimeout(() => { toastMsg.value = ''; }, 2000);
}

function parseFromInput() {
  const raw = rawUrl.value.trim();
  if (!raw) {
    basePathPrefix.value = '';
    hashPart.value = '';
    queryParams.value = [];
    return;
  }

  try {
    let parseable = raw;
    let addedDummy = false;
    if (!/^https?:\/\//i.test(raw)) {
      parseable = 'https://' + raw;
      addedDummy = true;
    }

    const u = new URL(parseable);
    basePathPrefix.value = addedDummy ? raw.split('?')[0].split('#')[0] : `${u.protocol}//${u.host}${u.pathname}`;
    hashPart.value = u.hash;

    const list = [];
    u.searchParams.forEach((val, key) => {
      list.push({ id: ++idSeq, key, value: val, enabled: true });
    });
    queryParams.value = list;
  } catch (e) {
    const qIndex = raw.indexOf('?');
    if (qIndex !== -1) {
      basePathPrefix.value = raw.substring(0, qIndex);
      const qStr = raw.substring(qIndex + 1).split('#')[0];
      const hIndex = raw.indexOf('#');
      hashPart.value = hIndex !== -1 ? raw.substring(hIndex) : '';

      const list = [];
      qStr.split('&').forEach(pair => {
        if (!pair) return;
        const [k, ...v] = pair.split('=');
        list.push({ id: ++idSeq, key: decodeURIComponent(k || ''), value: decodeURIComponent(v.join('=') || ''), enabled: true });
      });
      queryParams.value = list;
    } else {
      basePathPrefix.value = raw;
      hashPart.value = '';
      queryParams.value = [];
    }
  }
}

// Initial parse
parseFromInput();

const urlParts = computed(() => {
  const raw = rawUrl.value.trim();
  if (!raw) return { protocol: '', host: '', pathname: '', hash: '' };
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    return {
      protocol: /^https?:\/\//i.test(raw) ? u.protocol : '-',
      host: u.host,
      pathname: u.pathname,
      hash: u.hash
    };
  } catch (e) {
    return { protocol: '-', host: '-', pathname: raw, hash: '' };
  }
});

const reconstructedUrl = computed(() => {
  const active = queryParams.value.filter(p => p.enabled && p.key.trim() !== '');
  let qs = '';
  if (active.length > 0) {
    qs = '?' + active.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
  }
  return `${basePathPrefix.value}${qs}${hashPart.value}`;
});

function addParam() {
  queryParams.value.push({ id: ++idSeq, key: '', value: '', enabled: true });
}

function removeParam(idx) {
  queryParams.value.splice(idx, 1);
}

function encodeComp() {
  if (!rawUrl.value) return;
  rawUrl.value = encodeURIComponent(rawUrl.value);
  parseFromInput();
}

function encodeFull() {
  if (!rawUrl.value) return;
  rawUrl.value = encodeURI(rawUrl.value);
  parseFromInput();
}

function decodeSingle() {
  if (!rawUrl.value) return;
  try {
    rawUrl.value = decodeURIComponent(rawUrl.value);
  } catch (e) {
    rawUrl.value = decodeURI(rawUrl.value);
  }
  parseFromInput();
}

function decodeDeep() {
  let cur = rawUrl.value;
  if (!cur) return;
  let prev = '';
  let loops = 0;
  while (cur !== prev && loops < 10) {
    prev = cur;
    loops++;
    try {
      cur = decodeURIComponent(cur);
    } catch (e) {
      try { cur = decodeURI(cur); } catch (e2) { break; }
    }
  }
  rawUrl.value = cur;
  parseFromInput();
  showToast(props.isEn ? `Multi-pass decoded (${loops} passes)` : `已完成多层解码 (${loops} 轮)`);
}

function copyReconstructed() {
  if (!reconstructedUrl.value) return;
  navigator.clipboard.writeText(reconstructedUrl.value).then(() => {
    showToast(props.isEn ? 'Copied Clean URL' : '已复制重组后的 URL');
  });
}

function clearAll() {
  rawUrl.value = '';
  parseFromInput();
}

function loadSample() {
  rawUrl.value = 'https://blog.llmgo.top/articles/ai-agent/?utm_source=github&utm_medium=readme&session=eyJhbGciOiJIUzI1NiJ9&lang=zh-CN#faq-section';
  parseFromInput();
}
</script>

<style scoped>
.url-window {
  background: rgba(10, 12, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
}

.url-layout {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.field-label {
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
  font-weight: 500;
  display: block;
  margin-bottom: 6px;
}

.url-textarea {
  width: 100%;
  min-height: 80px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 10px 12px;
  color: #f1f5f9;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.url-textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.25);
}

.recon-textarea {
  min-height: 60px;
}

.url-actions-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.breakdown-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.breakdown-label {
  font-size: 0.72rem;
  color: var(--text-muted, #94a3b8);
  font-family: var(--font-mono, monospace);
}

.breakdown-card code {
  color: #38bdf8;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 0.82rem;
}

.query-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.query-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  color: #f1f5f9;
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
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.cyber-table td {
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.param-off {
  opacity: 0.45;
}

.param-input {
  padding: 6px 10px;
  font-size: 0.82rem;
}

.del-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.del-btn:hover {
  color: #fb7185;
}

.reconstructed-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reconstructed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  .breakdown-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
