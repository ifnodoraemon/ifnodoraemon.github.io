<template>
  <div class="terminal-window codecard-window" id="codecard-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: code_card_renderer.sh --canvas-export</div>
      <div class="terminal-actions">
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="loadSample">{{ isEn ? 'Sample Code' : '示例代码' }}</button>
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="codeText = ''">{{ isEn ? 'Clear' : '清空' }}</button>
      </div>
    </div>

    <!-- Controls Bar -->
    <div class="cc-toolbar">
      <div class="toolbar-left">
        <div class="control-inline">
          <label class="field-label">{{ isEn ? 'Language:' : '代码语言：' }}</label>
          <select v-model="selectedLang" class="cyber-select select-sm">
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="rust">Rust</option>
            <option value="go">Go</option>
            <option value="bash">Bash / Shell</option>
            <option value="json">JSON</option>
            <option value="sql">SQL</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
          </select>
        </div>

        <div class="control-inline">
          <label class="field-label">{{ isEn ? 'Theme:' : '背景渐变：' }}</label>
          <select v-model="selectedThemeKey" class="cyber-select select-sm">
            <option value="cyber-neon">Cyber Neon (Indigo / Cyan)</option>
            <option value="midnight-matrix">Midnight Matrix (Dark Navy / Emerald)</option>
            <option value="sunset-horizon">Sunset Horizon (Rose / Amber)</option>
            <option value="slate-dark">Minimalist Dark (Slate / Charcoal)</option>
            <option value="aurora-borealis">Aurora Borealis (Emerald / Blue)</option>
          </select>
        </div>

        <div class="control-inline">
          <label class="field-label">{{ isEn ? 'Padding:' : '卡片边距：' }}</label>
          <select v-model.number="cardPadding" class="cyber-select select-sm">
            <option :value="20">20px</option>
            <option :value="32">32px</option>
            <option :value="48">48px</option>
          </select>
        </div>

        <label class="checkbox-inline">
          <input v-model="showLineNumbers" type="checkbox" class="cyber-checkbox">
          <span>{{ isEn ? 'Line Numbers' : '显示行号' }}</span>
        </label>
      </div>

      <div class="toolbar-right">
        <button type="button" class="tool-btn btn-secondary btn-sm" @click="copyCardImage">📋 {{ isEn ? 'Copy Image' : '复制图片' }}</button>
        <button type="button" class="tool-btn btn-highlight btn-sm" @click="downloadCardPng">⚡ {{ isEn ? 'Download PNG' : '导出高清 PNG' }}</button>
      </div>
    </div>

    <!-- Dual Panes: Left Input, Right Preview -->
    <div class="dual-panes">
      <div class="pane left-pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="pane-indicator"></span>
            <span>{{ isEn ? 'Source Code' : '代码源文本' }}</span>
          </div>
          <input v-model="cardTitle" type="text" class="cyber-input title-input" placeholder="Title (e.g. agent.ts)">
        </div>
        <div class="editor-wrap">
          <textarea
            v-model="codeText"
            class="code-textarea"
            :placeholder="isEn ? 'Paste code here to render image...' : '在此输入代码...'"
            spellcheck="false"
          ></textarea>
        </div>
      </div>

      <div class="pane right-pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="pane-indicator preview"></span>
            <span>{{ isEn ? 'Live Card Preview (Retina Render)' : '卡片实时渲染预览' }}</span>
          </div>
        </div>

        <div class="card-preview-container">
          <div class="card-wrapper" :style="{ background: currentTheme.bg, padding: `${cardPadding}px` }">
            <div class="mac-window">
              <div class="window-header">
                <div class="terminal-dots">
                  <span class="dot close"></span>
                  <span class="dot minimize"></span>
                  <span class="dot expand"></span>
                </div>
                <div class="window-title">{{ cardTitle || 'code_snippet.ts' }}</div>
              </div>
              <pre class="code-pre"><code class="hljs" v-html="highlightedHtml"></code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toastMsg" class="toast-popup">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import hljs from 'highlight.js/lib/common';

const props = defineProps({
  lang: { type: String, default: 'zh' },
  isEn: { type: Boolean, default: false }
});

const codeText = ref(`// 2026 Autonomous Agent Execution Loop
async function runAgentStep(state: AgentState): Promise<StepResult> {
  const context = await memory.retrieveRelevant(state.goal);
  const prompt = compilePrompt({ goal: state.goal, context });
  
  // High-precision inference call
  const response = await llmClient.generate({
    model: "deepseek-v4-pro",
    messages: prompt,
    tools: mcpRegistry.getTools()
  });

  if (response.toolCalls) {
    return await executeMcpBatch(response.toolCalls);
  }
  return { done: true, output: response.content };
}`);

const selectedLang = ref('typescript');
const selectedThemeKey = ref('cyber-neon');
const cardPadding = ref(32);
const cardTitle = ref('agent_executor.ts');
const showLineNumbers = ref(true);
const toastMsg = ref('');

const THEMES = {
  'cyber-neon': {
    bg: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
    colors: ['#4f46e5', '#06b6d4']
  },
  'midnight-matrix': {
    bg: 'linear-gradient(135deg, #090a0f 0%, #064e3b 100%)',
    colors: ['#090a0f', '#064e3b']
  },
  'sunset-horizon': {
    bg: 'linear-gradient(135deg, #e11d48 0%, #d97706 100%)',
    colors: ['#e11d48', '#d97706']
  },
  'slate-dark': {
    bg: '#18181b',
    colors: ['#18181b', '#18181b']
  },
  'aurora-borealis': {
    bg: 'linear-gradient(135deg, #059669 0%, #2563eb 100%)',
    colors: ['#059669', '#2563eb']
  }
};

const currentTheme = computed(() => {
  return THEMES[selectedThemeKey.value] || THEMES['cyber-neon'];
});

function showToast(msg) {
  toastMsg.value = msg;
  setTimeout(() => { toastMsg.value = ''; }, 2000);
}

const highlightedHtml = computed(() => {
  const code = codeText.value;
  if (!code.trim()) {
    return `<span class="hljs-comment">// ${props.isEn ? 'Paste code on the left...' : '在左侧粘贴代码...'}</span>`;
  }

  let html = '';
  try {
    if (selectedLang.value && hljs.getLanguage(selectedLang.value)) {
      html = hljs.highlight(code, { language: selectedLang.value }).value;
    } else {
      html = hljs.highlightAuto(code).value;
    }
  } catch (e) {
    html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  if (showLineNumbers.value) {
    const lines = html.split('\n');
    return lines.map((l, i) => {
      return `<span class="code-line"><span class="line-num">${i + 1}</span><span class="line-text">${l || ' '}</span></span>`;
    }).join('\n');
  }

  return html;
});

function renderToCanvas() {
  const code = codeText.value || '// Empty code';
  const lines = code.split('\n');
  const scale = 2; // 2x Retina
  const padding = cardPadding.value * scale;
  const showNums = showLineNumbers.value;

  const fontSize = 14 * scale;
  const lineHeight = 24 * scale;
  const headerHeight = 44 * scale;
  const windowRadius = 12 * scale;
  const cardRadius = 16 * scale;

  const maxLineLength = Math.max(...lines.map(l => l.length), 28);
  const charWidth = 8.5 * scale;
  const gutter = showNums ? 45 * scale : 0;
  const windowWidth = Math.max(480 * scale, maxLineLength * charWidth + gutter + 40 * scale);
  const windowHeight = headerHeight + lines.length * lineHeight + 20 * scale;

  const canvasWidth = windowWidth + padding * 2;
  const canvasHeight = windowHeight + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  grad.addColorStop(0, currentTheme.value.colors[0]);
  grad.addColorStop(1, currentTheme.value.colors[1]);
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, canvasWidth, canvasHeight, cardRadius);
  ctx.fill();

  // Window with shadow
  const wx = padding;
  const wy = padding;
  const ww = windowWidth;
  const wh = windowHeight;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24 * scale;
  ctx.shadowOffsetY = 12 * scale;
  ctx.fillStyle = '#0f141c';
  roundRect(ctx, wx, wy, ww, wh, windowRadius);
  ctx.fill();
  ctx.restore();

  // Window border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1 * scale;
  roundRect(ctx, wx, wy, ww, wh, windowRadius);
  ctx.stroke();

  // Dots
  const dotY = wy + 20 * scale;
  const dotR = 6 * scale;
  ctx.fillStyle = '#ff5f56';
  ctx.beginPath(); ctx.arc(wx + 22 * scale, dotY, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffbd2e';
  ctx.beginPath(); ctx.arc(wx + 40 * scale, dotY, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#27c93f';
  ctx.beginPath(); ctx.arc(wx + 58 * scale, dotY, dotR, 0, Math.PI * 2); ctx.fill();

  // Title
  ctx.font = `${12 * scale}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText(cardTitle.value || 'code_snippet.ts', wx + ww / 2, dotY + 4 * scale);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.moveTo(wx, wy + headerHeight);
  ctx.lineTo(wx + ww, wy + headerHeight);
  ctx.stroke();

  // Code
  ctx.font = `${13 * scale}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'left';
  const startY = wy + headerHeight + 22 * scale;

  lines.forEach((lineText, idx) => {
    const ly = startY + idx * lineHeight;
    if (showNums) {
      ctx.fillStyle = '#475569';
      ctx.fillText(String(idx + 1).padStart(2, ' '), wx + 18 * scale, ly);
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(lineText, wx + 18 * scale + gutter, ly);
  });

  return canvas;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function downloadCardPng() {
  const canvas = renderToCanvas();
  const link = document.createElement('a');
  link.download = `${cardTitle.value || 'code-card'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast(props.isEn ? 'Exported code card PNG!' : '已导出高清代码卡片图片！');
}

function copyCardImage() {
  const canvas = renderToCanvas();
  if (!navigator.clipboard || !window.ClipboardItem) {
    showToast(props.isEn ? 'Clipboard image copy not supported' : '浏览器暂不支持剪贴板直拷，请点击导出');
    return;
  }
  canvas.toBlob(blob => {
    if (!blob) return;
    const item = new ClipboardItem({ 'image/png': blob });
    navigator.clipboard.write([item]).then(() => {
      showToast(props.isEn ? 'Image copied to clipboard!' : '代码卡片已复制到剪贴板！');
    }).catch(err => {
      console.warn('Clipboard write failed:', err);
      showToast(props.isEn ? 'Copy failed, please download' : '复制失败，请直接下载图片');
    });
  }, 'image/png');
}

function loadSample() {
  codeText.value = `// 2026 Autonomous Agent Execution Loop
async function runAgentStep(state: AgentState): Promise<StepResult> {
  const context = await memory.retrieveRelevant(state.goal);
  const prompt = compilePrompt({ goal: state.goal, context });
  
  const response = await llmClient.generate({
    model: "deepseek-v4-pro",
    messages: prompt,
    tools: mcpRegistry.getTools()
  });

  if (response.toolCalls) {
    return await executeMcpBatch(response.toolCalls);
  }
  return { done: true, output: response.content };
}`;
  cardTitle.value = 'agent_executor.ts';
}
</script>

<style scoped>
.codecard-window {
  background: rgba(10, 12, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
}

.cc-toolbar {
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
  gap: 12px;
  flex-shrink: 0;
}

.control-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.field-label {
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
}

.select-sm {
  padding: 4px 8px;
  font-size: 0.82rem;
  width: auto;
}

.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
}

.dual-panes {
  display: flex;
  min-height: 500px;
}

.pane {
  display: flex;
  flex-direction: column;
}

.left-pane {
  flex: 0.9;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 10, 15, 0.4);
}

.right-pane {
  flex: 1.3;
  background: #05070a;
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

.title-input {
  width: 170px;
  padding: 2px 8px;
  font-size: 0.78rem;
  height: 26px;
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

.card-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overflow-x: auto;
}

.card-wrapper {
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.mac-window {
  background: #0f141c;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  min-width: 440px;
  max-width: 680px;
}

.window-header {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  position: relative;
}

.window-title {
  position: absolute;
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
  color: #94a3b8;
  pointer-events: none;
}

.code-pre {
  margin: 0;
  padding: 14px 18px;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  line-height: 1.6;
  overflow-x: auto;
}

:deep(.code-line) {
  display: flex;
  gap: 14px;
}

:deep(.line-num) {
  color: #475569;
  user-select: none;
  width: 24px;
  text-align: right;
  flex-shrink: 0;
}

:deep(.line-text) {
  flex: 1;
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
  .dual-panes {
    flex-direction: column;
  }
  .left-pane {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
