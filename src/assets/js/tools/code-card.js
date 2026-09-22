// Geek Code Card Screenshot Generator (Code to Image)
import hljs from 'highlight.js/lib/common';

export function initCodeCard() {
  const container = document.getElementById('codecard-tool-app');
  if (!container) return;

  const isEn = container.dataset.lang === 'en';

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'cyber-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  const codeInput = document.getElementById('cc-code-input');
  const langSelect = document.getElementById('cc-lang-select');
  const titleInput = document.getElementById('cc-title-input');
  const themeSelect = document.getElementById('cc-theme-select');
  const paddingSelect = document.getElementById('cc-padding-select');
  const lineNumCheck = document.getElementById('cc-linenum-check');

  const previewWrap = document.getElementById('cc-card-preview-wrap');
  const previewWindow = document.getElementById('cc-card-window');
  const previewTitle = document.getElementById('cc-card-title');
  const previewCodeBlock = document.getElementById('cc-card-code');

  const btnExportPng = document.getElementById('cc-btn-export-png');
  const btnCopyImg = document.getElementById('cc-btn-copy-img');
  const btnSample = document.getElementById('cc-btn-sample');
  const btnClear = document.getElementById('cc-btn-clear');

  const THEMES = {
    'cyber-neon': {
      bg: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
      canvasColors: ['#4f46e5', '#06b6d4']
    },
    'midnight-matrix': {
      bg: 'linear-gradient(135deg, #090a0f 0%, #064e3b 100%)',
      canvasColors: ['#090a0f', '#064e3b']
    },
    'sunset-horizon': {
      bg: 'linear-gradient(135deg, #e11d48 0%, #d97706 100%)',
      canvasColors: ['#e11d48', '#d97706']
    },
    'slate-dark': {
      bg: '#18181b',
      canvasColors: ['#18181b', '#18181b']
    },
    'aurora-borealis': {
      bg: 'linear-gradient(135deg, #059669 0%, #2563eb 100%)',
      canvasColors: ['#059669', '#2563eb']
    }
  };

  function updatePreview() {
    const code = codeInput.value;
    const lang = langSelect.value;
    const title = titleInput.value || 'agent_executor.ts';
    const themeKey = themeSelect.value;
    const padding = parseInt(paddingSelect.value, 10) || 32;
    const showLineNum = lineNumCheck ? lineNumCheck.checked : true;

    // Update Title
    if (previewTitle) previewTitle.textContent = title;

    // Update Theme Background & Padding
    if (previewWrap) {
      const theme = THEMES[themeKey] || THEMES['cyber-neon'];
      previewWrap.style.background = theme.bg;
      previewWrap.style.padding = `${padding}px`;
    }

    // Highlight Code
    if (previewCodeBlock) {
      if (!code.trim()) {
        previewCodeBlock.innerHTML = `<span class="hljs-comment">// ${isEn ? 'Enter code on the left to preview...' : '在左侧输入代码实时预览...'}</span>`;
        return;
      }

      let highlightedHtml = '';
      try {
        if (lang && hljs.getLanguage(lang)) {
          highlightedHtml = hljs.highlight(code, { language: lang }).value;
        } else {
          highlightedHtml = hljs.highlightAuto(code).value;
        }
      } catch (err) {
        highlightedHtml = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      if (showLineNum) {
        const lines = highlightedHtml.split('\n');
        const numberedLines = lines.map((l, idx) => {
          return `<span class="cc-line"><span class="cc-line-num">${idx + 1}</span><span class="cc-line-content">${l || ' '}</span></span>`;
        });
        previewCodeBlock.innerHTML = numberedLines.join('\n');
      } else {
        previewCodeBlock.innerHTML = highlightedHtml;
      }
    }
  }

  // High-Resolution Canvas Rendering
  function renderCardToCanvas() {
    const code = codeInput.value || '// Empty code';
    const lang = langSelect.value;
    const title = titleInput.value || 'agent_executor.ts';
    const themeKey = themeSelect.value;
    const theme = THEMES[themeKey] || THEMES['cyber-neon'];
    const padding = (parseInt(paddingSelect.value, 10) || 32) * 2; // Retina 2x scale
    const showLineNum = lineNumCheck ? lineNumCheck.checked : true;

    const lines = code.split('\n');
    const scale = 2; // 2x Retina scale

    // Measure text
    const fontSize = 14 * scale;
    const lineHeight = 24 * scale;
    const headerHeight = 44 * scale;
    const windowRadius = 12 * scale;
    const cardRadius = 16 * scale;

    const maxLineLength = Math.max(...lines.map(l => l.length), 30);
    const charWidth = 8.5 * scale;
    const lineNumGutter = showLineNum ? 45 * scale : 0;
    const windowInnerWidth = Math.max(500 * scale, maxLineLength * charWidth + lineNumGutter + 40 * scale);
    const windowInnerHeight = headerHeight + lines.length * lineHeight + 20 * scale;

    const canvasWidth = windowInnerWidth + padding * 2;
    const canvasHeight = windowInnerHeight + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // 1. Draw Outer Card Gradient Background
    const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    grad.addColorStop(0, theme.canvasColors[0]);
    grad.addColorStop(1, theme.canvasColors[1]);

    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, canvasWidth, canvasHeight, cardRadius);
    ctx.fill();

    // 2. Draw macOS Window with Drop Shadow
    const wx = padding;
    const wy = padding;
    const ww = windowInnerWidth;
    const wh = windowInnerHeight;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24 * scale;
    ctx.shadowOffsetY = 12 * scale;
    ctx.fillStyle = '#0f141c';
    roundRect(ctx, wx, wy, ww, wh, windowRadius);
    ctx.fill();
    ctx.restore();

    // Window Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1 * scale;
    roundRect(ctx, wx, wy, ww, wh, windowRadius);
    ctx.stroke();

    // 3. Draw Header (Dots & Title)
    const dotY = wy + 20 * scale;
    const dotR = 6 * scale;

    // Red dot
    ctx.fillStyle = '#ff5f56';
    ctx.beginPath();
    ctx.arc(wx + 22 * scale, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Yellow dot
    ctx.fillStyle = '#ffbd2e';
    ctx.beginPath();
    ctx.arc(wx + 40 * scale, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Green dot
    ctx.fillStyle = '#27c93f';
    ctx.beginPath();
    ctx.arc(wx + 58 * scale, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.font = `${12 * scale}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText(title, wx + ww / 2, dotY + 4 * scale);

    // 4. Draw Header Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.moveTo(wx, wy + headerHeight);
    ctx.lineTo(wx + ww, wy + headerHeight);
    ctx.stroke();

    // 5. Draw Code Lines
    ctx.font = `${13 * scale}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';

    const codeStartY = wy + headerHeight + 22 * scale;

    lines.forEach((lineText, idx) => {
      const lineY = codeStartY + idx * lineHeight;

      if (showLineNum) {
        ctx.fillStyle = '#475569';
        ctx.fillText(String(idx + 1).padStart(2, ' '), wx + 18 * scale, lineY);
      }

      ctx.fillStyle = '#e2e8f0';
      const textX = wx + 18 * scale + lineNumGutter;
      ctx.fillText(lineText, textX, lineY);
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

  // Export PNG Action
  if (btnExportPng) {
    btnExportPng.addEventListener('click', () => {
      const canvas = renderCardToCanvas();
      const link = document.createElement('a');
      link.download = `${titleInput.value || 'code-card'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast(isEn ? 'Exported code card PNG!' : '已导出高清代码卡片图片！');
    });
  }

  // Copy Image to Clipboard Action
  if (btnCopyImg) {
    btnCopyImg.addEventListener('click', () => {
      const canvas = renderCardToCanvas();
      if (!navigator.clipboard || !window.ClipboardItem) {
        showToast(isEn ? 'Clipboard image copy not supported on this browser' : '当前浏览器暂不支持图片直拷，请使用导出下载');
        return;
      }

      canvas.toBlob(blob => {
        if (!blob) return;
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          showToast(isEn ? 'Image copied to clipboard!' : '代码卡片已复制到剪贴板！');
        }).catch(err => {
          console.warn('Clipboard write image failed:', err);
          showToast(isEn ? 'Copy failed, use Export PNG instead' : '复制失败，请直接使用导出下载');
        });
      }, 'image/png');
    });
  }

  if (btnSample) {
    btnSample.addEventListener('click', () => {
      codeInput.value = `// 2026 Autonomous Agent Execution Loop
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
}`;
      titleInput.value = 'agent_executor.ts';
      langSelect.value = 'typescript';
      themeSelect.value = 'cyber-neon';
      updatePreview();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      codeInput.value = '';
      updatePreview();
    });
  }

  codeInput.addEventListener('input', updatePreview);
  langSelect.addEventListener('change', updatePreview);
  titleInput.addEventListener('input', updatePreview);
  themeSelect.addEventListener('change', updatePreview);
  paddingSelect.addEventListener('change', updatePreview);
  if (lineNumCheck) lineNumCheck.addEventListener('change', updatePreview);

  // Initialize sample
  if (btnSample) btnSample.click();
}
