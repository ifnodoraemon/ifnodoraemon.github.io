<template>
  <div class="terminal-window json-window" id="json-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: json_studio.sh --mode=format_and_ast</div>
      <div class="terminal-actions">
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="loadSample">{{ isEn ? 'Sample JSON' : '示例 JSON' }}</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="clearAll">{{ isEn ? 'Clear' : '清空' }}</button>
      </div>
    </div>

    <!-- Actions Toolbar -->
    <div class="json-toolbar">
      <div class="toolbar-left">
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="formatJson(2)">Format (2 Spaces)</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="formatJson(4)">Format (4 Spaces)</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="minifyJson">Minify</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="sortJsonKeys">Sort Keys</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="escapeString">Escape String</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="unescapeString">Unescape String</button>
      </div>
      <div class="toolbar-right">
        <button type="button" class="tool-btn btn-highlight btn-sm" @click="generateTs">⚡ {{ isEn ? 'Generate TypeScript' : '推导 TypeScript' }}</button>
        <button type="button" class="tool-btn btn-primary btn-sm" @click="copyOutput">{{ isEn ? 'Copy' : '复制结果' }}</button>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="errorMessage" class="error-banner">
      ⚠️ {{ errorMessage }}
    </div>

    <!-- Panes -->
    <div class="dual-panes">
      <div class="pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="pane-indicator"></span>
            <span>JSON Input</span>
          </div>
          <span class="stat-text">{{ inBytesFormatted }}</span>
        </div>
        <div class="editor-wrap">
          <textarea
            v-model="inputJson"
            class="code-textarea"
            :placeholder="isEn ? 'Paste JSON string here...' : '在此粘贴原始 JSON 文本...'"
            spellcheck="false"
            @input="errorMessage = ''"
          ></textarea>
        </div>
      </div>

      <div class="pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="pane-indicator preview"></span>
            <span>Output (Formatted JSON / TypeScript)</span>
          </div>
          <span class="stat-text">{{ outBytesFormatted }} · {{ outLinesCount }} {{ isEn ? 'lines' : '行' }}</span>
        </div>
        <div class="editor-wrap">
          <textarea
            v-model="outputCode"
            class="code-textarea"
            :placeholder="isEn ? 'Output will appear here...' : '处理或推导结果将输出于此...'"
            spellcheck="false"
            readonly
          ></textarea>
        </div>
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

const inputJson = ref('');
const outputCode = ref('');
const errorMessage = ref('');
const toastMsg = ref('');

function showToast(msg) {
  toastMsg.value = msg;
  setTimeout(() => { toastMsg.value = ''; }, 2000);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + ' ' + sizes[i];
}

const inBytesFormatted = computed(() => {
  return formatBytes(new Blob([inputJson.value]).size);
});

const outBytesFormatted = computed(() => {
  return formatBytes(new Blob([outputCode.value]).size);
});

const outLinesCount = computed(() => {
  return outputCode.value ? outputCode.value.split('\n').length : 0;
});

function parseInput() {
  errorMessage.value = '';
  const raw = inputJson.value.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    errorMessage.value = err.message;
    return null;
  }
}

function formatJson(spaces) {
  const data = parseInput();
  if (data !== null) {
    outputCode.value = JSON.stringify(data, null, spaces);
  }
}

function minifyJson() {
  const data = parseInput();
  if (data !== null) {
    outputCode.value = JSON.stringify(data);
  }
}

function sortJsonKeys() {
  const data = parseInput();
  if (data !== null) {
    const sortObj = (obj) => {
      if (Array.isArray(obj)) return obj.map(sortObj);
      if (obj !== null && typeof obj === 'object') {
        const sorted = {};
        Object.keys(obj).sort().forEach(k => { sorted[k] = sortObj(obj[k]); });
        return sorted;
      }
      return obj;
    };
    outputCode.value = JSON.stringify(sortObj(data), null, 2);
  }
}

function escapeString() {
  errorMessage.value = '';
  const raw = inputJson.value;
  if (!raw) return;
  outputCode.value = JSON.stringify(raw);
}

function unescapeString() {
  errorMessage.value = '';
  const raw = inputJson.value.trim();
  if (!raw) return;
  try {
    if (raw.startsWith('"') && raw.endsWith('"')) {
      outputCode.value = JSON.parse(raw);
    } else {
      outputCode.value = JSON.parse(`"${raw.replace(/"/g, '\\"')}"`);
    }
  } catch (err) {
    errorMessage.value = err.message;
  }
}

function generateTs() {
  const data = parseInput();
  if (data === null) return;

  const subInterfaces = [];
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/[^a-zA-Z0-9]/g, '');
  }

  function inferType(val, propName) {
    if (val === null) return 'any | null';
    if (val === undefined) return 'any';

    const t = typeof val;
    if (t === 'string') return 'string';
    if (t === 'number') return 'number';
    if (t === 'boolean') return 'boolean';

    if (Array.isArray(val)) {
      if (val.length === 0) return 'any[]';
      const types = new Set();
      val.forEach((item) => types.add(inferType(item, `${propName}Item`)));
      const union = Array.from(types).join(' | ');
      return types.size > 1 ? `(${union})[]` : `${union}[]`;
    }

    if (t === 'object') {
      const subName = capitalize(propName);
      parseInterface(val, subName);
      return subName;
    }
    return 'any';
  }

  function parseInterface(obj, interfaceName) {
    const lines = [`export interface ${interfaceName} {`];
    for (const [key, val] of Object.entries(obj)) {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      const typeStr = inferType(val, key);
      lines.push(`  ${safeKey}: ${typeStr};`);
    }
    lines.push('}');
    subInterfaces.push(lines.join('\n'));
  }

  const rootName = 'AgentWorkflowState';
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      parseInterface(data[0], rootName);
      subInterfaces.push(`export type ${rootName}List = ${rootName}[];`);
    } else {
      outputCode.value = `export type ${rootName} = any[];`;
      return;
    }
  } else if (typeof data === 'object' && data !== null) {
    parseInterface(data, rootName);
  } else {
    outputCode.value = `export type ${rootName} = ${typeof data};`;
    return;
  }

  outputCode.value = subInterfaces.reverse().join('\n\n');
}

function copyOutput() {
  if (!outputCode.value) return;
  navigator.clipboard.writeText(outputCode.value).then(() => {
    showToast(props.isEn ? 'Copied to clipboard!' : '已复制到剪贴板！');
  });
}

function clearAll() {
  inputJson.value = '';
  outputCode.value = '';
  errorMessage.value = '';
}

function loadSample() {
  const sample = {
    session_id: "agent-session-2026-xyz",
    workflow: {
      name: "autonomous_code_review",
      version: "2.4.0",
      concurrency: 4,
      timeout_seconds: 120
    },
    model_config: {
      primary_model: "deepseek-v4-pro",
      fallback_model: "kimi-k3",
      temperature: 0.2,
      max_context_tokens: 131072,
      enable_mcp_tools: true
    },
    tools_registered: [
      { name: "git_diff_analyzer", cache_ttl_sec: 300, is_read_only: true },
      { name: "ast_linter", cache_ttl_sec: 60, is_read_only: true }
    ],
    metadata: {
      author: "ifnodoraemon",
      organization: "Nobita Talks AI",
      verified: true,
      execution_metrics: {
        p95_latency_ms: 342.8,
        success_rate: 0.998
      }
    }
  };
  inputJson.value = JSON.stringify(sample, null, 2);
  generateTs();
}
</script>

<style scoped>
.json-window {
  background: rgba(10, 12, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
}

.json-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 12px;
  overflow-x: auto;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.error-banner {
  margin: 10px 16px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 6px;
  color: #fca5a5;
  font-size: 0.82rem;
  font-family: var(--font-mono, monospace);
}

.dual-panes {
  display: flex;
  min-height: 480px;
}

.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: rgba(8, 10, 15, 0.4);
}

.pane:first-child {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
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

.stat-text {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  font-family: var(--font-mono, monospace);
}

.editor-wrap {
  flex: 1;
  display: flex;
}

.code-textarea {
  width: 100%;
  flex: 1;
  background: transparent;
  border: none;
  padding: 16px;
  color: #f1f5f9;
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  line-height: 1.6;
  resize: none;
  outline: none;
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
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  z-index: 9999;
}

@media (max-width: 900px) {
  .dual-panes {
    flex-direction: column;
  }
  .pane:first-child {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
