<template>
  <div class="terminal-window base64-window" id="base64-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Execute: base64_codec.sh --mode=bidirectional --charset=utf-8</div>
      <div class="terminal-actions">
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="loadSampleText">{{ isEn ? 'Sample Text' : '文本示例' }}</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="clearAll">{{ isEn ? 'Clear' : '清空' }}</button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="b64-toolbar">
      <div class="toolbar-left">
        <div class="mode-tabs">
          <button
            type="button"
            class="mode-tab-btn"
            :class="{ active: inputMode === 'text' }"
            @click="inputMode = 'text'"
          >
            {{ isEn ? 'Text Mode' : '文本编解码' }}
          </button>
          <button
            type="button"
            class="mode-tab-btn"
            :class="{ active: inputMode === 'file' }"
            @click="inputMode = 'file'"
          >
            {{ isEn ? 'File / Image Mode' : '文件/图片转 Base64' }}
          </button>
        </div>

        <label class="checkbox-inline">
          <input v-model="isUrlSafe" type="checkbox" class="cyber-checkbox">
          <span>RFC 4648 URL-Safe (Base64URL)</span>
        </label>
      </div>

      <div class="toolbar-right">
        <button v-if="outputVal" type="button" class="tool-btn btn-primary btn-sm" @click="copyOutput">
          {{ isEn ? 'Copy Output' : '复制结果' }}
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="error-banner">
      ⚠️ {{ errorMessage }}
    </div>

    <!-- Workspace -->
    <div class="b64-workspace">
      <!-- Left Input Pane -->
      <div class="pane left-pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="pane-indicator"></span>
            <span>{{ isEn ? 'Input Source' : '输入源数据' }}</span>
          </div>
          <span class="stat-text">{{ inBytesFormatted }}</span>
        </div>

        <!-- Text Mode -->
        <div v-if="inputMode === 'text'" class="editor-wrap">
          <textarea
            v-model="inputVal"
            class="code-textarea"
            :placeholder="isEn ? 'Enter text or paste Base64 here...' : '在此输入需要编码的纯文本，或粘贴待解码的 Base64 字符串...'"
            spellcheck="false"
            @input="errorMessage = ''"
          ></textarea>
        </div>

        <!-- File Mode Dropzone -->
        <div v-else class="dropzone-wrap">
          <div
            class="dropzone"
            :class="{ 'drag-over': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleFileDrop"
            @click="triggerFileInput"
          >
            <input ref="fileInputRef" type="file" style="display: none;" @change="handleFileSelect">
            <div class="drop-icon">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div class="drop-title">{{ fileInfo ? fileInfo.name : (isEn ? 'Drop file here or click to browse' : '将图片/文件拖拽至此处，或点击浏览') }}</div>
            <div class="drop-sub">{{ fileInfo ? `${formatBytes(fileInfo.size)} · ${fileInfo.type}` : 'PNG, JPG, SVG, WebP, GIF, JSON, PDF, TXT...' }}</div>
          </div>
        </div>
      </div>

      <!-- Actions Column -->
      <div class="b64-actions-col">
        <button type="button" class="tool-btn btn-highlight action-btn" @click="encodeAction">
          {{ isEn ? 'Encode ➔' : '编码 ➔' }}
        </button>
        <button type="button" class="tool-btn btn-secondary action-btn" @click="decodeAction">
          {{ isEn ? '➔ Decode' : '➔ 解码' }}
        </button>
        <button type="button" class="tool-btn btn-secondary action-btn" @click="swapAction">
          {{ isEn ? '⇄ Swap' : '⇄ 互换' }}
        </button>
      </div>

      <!-- Right Output Pane -->
      <div class="pane right-pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="pane-indicator preview"></span>
            <span>{{ isEn ? 'Conversion Output' : '转换输出结果' }}</span>
          </div>
          <span class="stat-text">{{ outBytesFormatted }}</span>
        </div>

        <div class="editor-wrap">
          <textarea
            v-model="outputVal"
            class="code-textarea"
            :placeholder="isEn ? 'Output will appear here...' : '编解码结果将在此输出...'"
            spellcheck="false"
            readonly
          ></textarea>
        </div>

        <!-- Media Preview Box -->
        <div v-if="previewImgSrc" class="media-preview-card">
          <div class="preview-title">{{ isEn ? 'Live Media Preview:' : '实时媒体渲染预览：' }}</div>
          <div class="preview-img-box">
            <img :src="previewImgSrc" alt="Preview">
          </div>
          <div class="media-actions-row">
            <button type="button" class="tool-btn btn-secondary btn-sm" @click="copySnippet('dataurl')">Data URL</button>
            <button type="button" class="tool-btn btn-secondary btn-sm" @click="copySnippet('imgtag')">&lt;img&gt; Tag</button>
            <button type="button" class="tool-btn btn-secondary btn-sm" @click="copySnippet('cssbg')">CSS background</button>
            <button type="button" class="tool-btn btn-secondary btn-sm" @click="copySnippet('mdimg')">Markdown</button>
            <button type="button" class="tool-btn btn-highlight btn-sm" @click="downloadDecodedFile">{{ isEn ? 'Download' : '下载还原文件' }}</button>
          </div>
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

const inputMode = ref('text');
const isUrlSafe = ref(false);
const inputVal = ref('');
const outputVal = ref('');
const errorMessage = ref('');
const isDragging = ref(false);
const fileInfo = ref(null);
const previewImgSrc = ref('');
const toastMsg = ref('');
const fileInputRef = ref(null);

function showToast(msg) {
  toastMsg.value = msg;
  setTimeout(() => { toastMsg.value = ''; }, 2000);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + ' ' + sizes[i];
}

const inBytesFormatted = computed(() => {
  if (fileInfo.value) return formatBytes(fileInfo.value.size);
  return formatBytes(new Blob([inputVal.value]).size);
});

const outBytesFormatted = computed(() => {
  return formatBytes(new Blob([outputVal.value]).size);
});

// UTF-8 Base64 Encoding
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  let base64 = btoa(binary);
  if (isUrlSafe.value) {
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return base64;
}

// UTF-8 Base64 Decoding
function base64ToUtf8(str) {
  let b64 = str.trim();
  if (b64.startsWith('data:')) {
    const comma = b64.indexOf(',');
    if (comma !== -1) b64 = b64.substring(comma + 1);
  }
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function encodeAction() {
  errorMessage.value = '';
  if (!inputVal.value) return;
  try {
    outputVal.value = utf8ToBase64(inputVal.value);
  } catch (e) {
    errorMessage.value = e.message;
  }
}

function decodeAction() {
  errorMessage.value = '';
  if (!inputVal.value) return;
  try {
    outputVal.value = base64ToUtf8(inputVal.value);
  } catch (e) {
    errorMessage.value = e.message;
  }
}

function swapAction() {
  const temp = inputVal.value;
  inputVal.value = outputVal.value;
  outputVal.value = temp;
}

function triggerFileInput() {
  if (fileInputRef.value) fileInputRef.value.click();
}

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) processFile(file);
}

function handleFileDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer.files?.[0];
  if (file) processFile(file);
}

function processFile(file) {
  fileInfo.value = { name: file.name, size: file.size, type: file.type || 'application/octet-stream' };
  const reader = new FileReader();
  reader.onload = () => {
    let result = reader.result;
    if (file.type.startsWith('image/')) {
      previewImgSrc.value = result;
    } else {
      previewImgSrc.value = '';
    }
    outputVal.value = result;
  };
  reader.readAsDataURL(file);
}

function copyOutput() {
  if (!outputVal.value) return;
  navigator.clipboard.writeText(outputVal.value).then(() => {
    showToast(props.isEn ? 'Copied Output' : '已复制结果');
  });
}

function copySnippet(type) {
  const val = outputVal.value;
  if (!val) return;
  let text = val;
  if (type === 'imgtag') text = `<img src="${val}" alt="Embedded Image" />`;
  if (type === 'cssbg') text = `background-image: url("${val}");`;
  if (type === 'mdimg') text = `![Image](${val})`;

  navigator.clipboard.writeText(text).then(() => {
    showToast(props.isEn ? 'Snippet copied' : '代码片段已复制');
  });
}

function downloadDecodedFile() {
  const url = outputVal.value;
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = fileInfo.value?.name || 'restored_file';
  link.click();
}

function clearAll() {
  inputVal.value = '';
  outputVal.value = '';
  fileInfo.value = null;
  previewImgSrc.value = '';
  errorMessage.value = '';
}

function loadSampleText() {
  inputMode.value = 'text';
  inputVal.value = props.isEn
    ? `Hello, DeepSeek-V4 & Kimi K3! Pure client-side lossless UTF-8 Base64 Codec.`
    : `你好，大雄话AI！100% 浏览器客户端纯离线 UTF-8 Base64 极速编解码器。`;
  encodeAction();
}
</script>

<style scoped>
.base64-window {
  background: rgba(10, 12, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
}

.b64-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mode-tabs {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 2px;
}

.mode-tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  padding: 4px 10px;
  font-size: 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-tab-btn.active {
  background: #6366f1;
  color: #ffffff;
}

.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
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

.b64-workspace {
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

.b64-actions-col {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(15, 18, 28, 0.7);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 10;
}

.action-btn {
  white-space: nowrap;
  min-width: 110px;
  justify-content: center;
}

.dropzone-wrap {
  flex: 1;
  display: flex;
  padding: 1.5rem;
}

.dropzone {
  flex: 1;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s ease;
}

.dropzone:hover, .dropzone.drag-over {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
}

.drop-icon {
  color: #818cf8;
  margin-bottom: 1rem;
}

.drop-title {
  color: #f1f5f9;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 4px;
}

.drop-sub {
  color: var(--text-muted, #94a3b8);
  font-size: 0.78rem;
  font-family: var(--font-mono, monospace);
}

.media-preview-card {
  margin: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.preview-title {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  margin-bottom: 8px;
}

.preview-img-box {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 180px;
  overflow: hidden;
  border-radius: 6px;
  background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 20px 20px;
  padding: 8px;
}

.preview-img-box img {
  max-height: 160px;
  max-width: 100%;
  object-fit: contain;
}

.media-actions-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
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
  .b64-workspace {
    flex-direction: column;
  }
  .b64-actions-col {
    flex-direction: row;
    border-left: none;
    border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
