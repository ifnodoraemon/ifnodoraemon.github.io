<template>
  <div class="terminal-window jwt-window fade-in" id="jwt-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: jwt_debugger.sh --offline-sandbox --rfc=7519</div>
      <div class="terminal-actions">
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="loadSample">{{ isEn ? 'Sample JWT' : '示例 Token' }}</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="clearAll">{{ isEn ? 'Clear' : '清空' }}</button>
      </div>
    </div>

    <div class="tool-app-body jwt-layout">
      <!-- Input Area -->
      <div class="jwt-input-wrap">
        <div class="jwt-input-header">
          <label class="field-label">{{ isEn ? 'Encoded JWT String (header.payload.signature):' : '编码的 JWT 字符串 (header.payload.signature)：' }}</label>
          <span v-if="expStatus" class="jwt-exp-badge" :class="expStatus.cssClass">
            {{ expStatus.text }}
          </span>
        </div>
        <textarea
          v-model="rawJwt"
          class="jwt-textarea"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
          spellcheck="false"
        ></textarea>
        <div v-if="parseError" class="error-banner">
          ⚠️ {{ parseError }}
        </div>
      </div>

      <!-- Claims Inspector -->
      <div v-if="activeClaims.length > 0" class="jwt-claims-wrap">
        <div class="claims-title">// {{ isEn ? 'Decoded Registered Claims' : '解码的 Claims 规范声明' }}</div>
        <div class="claims-grid">
          <div v-for="c in activeClaims" :key="c.key" class="claim-chip">
            <span class="claim-key">{{ c.label }}:</span>
            <span class="claim-val">{{ c.val }}</span>
          </div>
        </div>
      </div>

      <!-- 3 Segments Grid -->
      <div class="segments-grid">
        <!-- Header -->
        <div class="segment-card">
          <div class="segment-header header-color">
            <span>HEADER (Algorithm & Type)</span>
            <button type="button" class="copy-icon-btn" @click="copyText(headerJson, 'Header')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
          <pre class="code-pre"><code>{{ headerJson }}</code></pre>
        </div>

        <!-- Payload -->
        <div class="segment-card">
          <div class="segment-header payload-color">
            <span>PAYLOAD (Data Claims)</span>
            <button type="button" class="copy-icon-btn" @click="copyText(payloadJson, 'Payload')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
          <pre class="code-pre"><code>{{ payloadJson }}</code></pre>
        </div>

        <!-- Signature -->
        <div class="segment-card">
          <div class="segment-header signature-color">
            <span>SIGNATURE (Raw Bytes)</span>
          </div>
          <pre class="code-pre signature-pre"><code>{{ signatureText }}</code></pre>
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

const rawJwt = ref('');
const toastMsg = ref('');

function showToast(msg) {
  toastMsg.value = msg;
  setTimeout(() => { toastMsg.value = ''; }, 2000);
}

function decodeB64Url(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function formatDate(unixSec) {
  if (!unixSec || isNaN(unixSec)) return 'N/A';
  return new Date(unixSec * 1000).toLocaleString(props.isEn ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

const parsedJwt = computed(() => {
  const raw = rawJwt.value.trim();
  if (!raw) return { header: null, payload: null, sig: '', err: '' };

  const parts = raw.split('.');
  if (parts.length < 2) {
    return {
      header: null,
      payload: null,
      sig: '',
      err: props.isEn ? 'Invalid format: Must have at least header and payload separated by dots.' : '格式无效：必须由点号分隔的 Header 与 Payload 组成。'
    };
  }

  try {
    const header = JSON.parse(decodeB64Url(parts[0]));
    const payload = JSON.parse(decodeB64Url(parts[1]));
    const sig = parts[2] || '';
    return { header, payload, sig, err: '' };
  } catch (e) {
    return { header: null, payload: null, sig: '', err: e.message };
  }
});

const parseError = computed(() => parsedJwt.value.err);

const headerJson = computed(() => {
  return parsedJwt.value.header ? JSON.stringify(parsedJwt.value.header, null, 2) : '{}';
});

const payloadJson = computed(() => {
  return parsedJwt.value.payload ? JSON.stringify(parsedJwt.value.payload, null, 2) : '{}';
});

const signatureText = computed(() => {
  const sig = parsedJwt.value.sig;
  const alg = parsedJwt.value.header?.alg || 'Unknown';
  if (!sig) return '// No signature';
  return `${sig}\n\n// Algorithm: ${alg}\n// 🔒 100% Client-side sandbox`;
});

const expStatus = computed(() => {
  const p = parsedJwt.value.payload;
  if (!p || !p.exp) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const diff = p.exp - nowSec;
  const abs = Math.abs(diff);

  const hours = Math.floor(abs / 3600);
  const mins = Math.floor((abs % 3600) / 60);

  let timeStr = '';
  if (hours > 24) {
    const d = Math.floor(hours / 24);
    timeStr = props.isEn ? `${d} days` : `${d} 天`;
  } else if (hours > 0) {
    timeStr = props.isEn ? `${hours}h ${mins}m` : `${hours} 小时 ${mins} 分钟`;
  } else {
    timeStr = props.isEn ? `${mins}m` : `${mins} 分钟`;
  }

  if (diff > 0) {
    return {
      cssClass: 'status-valid',
      text: props.isEn ? `VALID (Expires in ${timeStr})` : `有效 (剩余 ${timeStr} 过期)`
    };
  } else {
    return {
      cssClass: 'status-expired',
      text: props.isEn ? `EXPIRED (${timeStr} ago)` : `已过期 (${timeStr} 前已失效)`
    };
  }
});

const activeClaims = computed(() => {
  const p = parsedJwt.value.payload;
  if (!p) return [];

  const list = [
    { key: 'iss', label: props.isEn ? 'Issuer (iss)' : '签发者 (iss)', val: p.iss },
    { key: 'sub', label: props.isEn ? 'Subject (sub)' : '主体用户 (sub)', val: p.sub },
    { key: 'aud', label: props.isEn ? 'Audience (aud)' : '受众 (aud)', val: p.aud },
    { key: 'iat', label: props.isEn ? 'Issued At (iat)' : '签发时间 (iat)', val: p.iat ? formatDate(p.iat) : null },
    { key: 'nbf', label: props.isEn ? 'Not Before (nbf)' : '生效时刻 (nbf)', val: p.nbf ? formatDate(p.nbf) : null },
    { key: 'exp', label: props.isEn ? 'Expiration (exp)' : '过期时间 (exp)', val: p.exp ? formatDate(p.exp) : null }
  ];

  return list.filter(item => item.val !== undefined && item.val !== null);
});

function copyText(str, name) {
  if (!str) return;
  navigator.clipboard.writeText(str).then(() => {
    showToast(props.isEn ? `Copied ${name} JSON` : `已复制 ${name} 数据`);
  });
}

function clearAll() {
  rawJwt.value = '';
}

function loadSample() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: "https://blog.llmgo.top",
    sub: "developer_67990a",
    aud: "ai-agent-engine",
    name: "Nobita Talks AI Dev",
    roles: ["admin", "architect", "agent_operator"],
    iat: now,
    nbf: now,
    exp: now + 7200
  };

  const b64 = (obj) => {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  rawJwt.value = `${b64(header)}.${b64(payload)}.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk`;
}
</script>

<style scoped>
.jwt-window {
  background: rgba(10, 12, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
}

.jwt-layout {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.jwt-input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.field-label {
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
  font-weight: 500;
}

.jwt-textarea {
  width: 100%;
  min-height: 90px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 12px;
  color: #f1f5f9;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.jwt-textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.25);
}

.error-banner {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 6px;
  color: #fca5a5;
  font-size: 0.82rem;
  font-family: var(--font-mono, monospace);
}

.jwt-exp-badge {
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-valid {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-expired {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.jwt-claims-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.claims-title {
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
  color: var(--text-muted, #94a3b8);
}

.claims-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.claim-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 5px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-family: var(--font-mono, monospace);
}

.claim-key {
  color: #818cf8;
}

.claim-val {
  color: #f1f5f9;
  font-weight: 500;
}

.segments-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}

.segment-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.segment-header {
  padding: 8px 12px;
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-color {
  background: rgba(244, 63, 94, 0.1);
  color: #fb7185;
}

.payload-color {
  background: rgba(168, 85, 247, 0.1);
  color: #c084fc;
}

.signature-color {
  background: rgba(14, 165, 233, 0.1);
  color: #38bdf8;
}

.code-pre {
  margin: 0;
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  font-size: 0.82rem;
  font-family: var(--font-mono, monospace);
  color: #e2e8f0;
  max-height: 280px;
  white-space: pre-wrap;
  word-break: break-all;
}

.copy-icon-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 2px;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.copy-icon-btn:hover {
  opacity: 1;
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

@media (max-width: 1024px) {
  .segments-grid {
    grid-template-columns: 1fr;
  }
}
</style>
