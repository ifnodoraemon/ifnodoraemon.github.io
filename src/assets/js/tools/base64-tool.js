// Base64 Codec & Multi-Format Converter Engine

export function initBase64Tool() {
  const container = document.getElementById('base64-tool-app');
  if (!container) return;

  const isEn = container.dataset.lang === 'en';

  const inputEl = document.getElementById('b64-input');
  const outputEl = document.getElementById('b64-output');
  const urlSafeToggle = document.getElementById('b64-urlsafe-toggle');
  const liveConvertToggle = document.getElementById('b64-live-toggle');

  // Stats
  const statInputBytes = document.getElementById('b64-stat-input-bytes');
  const statOutputBytes = document.getElementById('b64-stat-output-bytes');
  const statRatio = document.getElementById('b64-stat-ratio');

  // Action Buttons
  const btnEncode = document.getElementById('b64-btn-encode');
  const btnDecode = document.getElementById('b64-btn-decode');
  const btnSwap = document.getElementById('b64-btn-swap');
  const btnClear = document.getElementById('b64-btn-clear');
  const btnCopy = document.getElementById('b64-btn-copy');
  const btnDownload = document.getElementById('b64-btn-download');

  // Sample Buttons
  const sampleTextBtn = document.getElementById('b64-sample-text');
  const sampleJsonBtn = document.getElementById('b64-sample-json');
  const sampleSvgBtn = document.getElementById('b64-sample-svg');

  // File Upload Elements
  const fileInput = document.getElementById('b64-file-input');
  const dropzone = document.getElementById('b64-dropzone');
  const dropzoneText = document.getElementById('b64-dropzone-text');

  // Image Preview and format actions
  const previewBox = document.getElementById('b64-preview-box');
  const previewImg = document.getElementById('b64-preview-img');
  const formatButtonsRow = document.getElementById('b64-format-buttons');
  const btnCopyDataUrl = document.getElementById('b64-copy-dataurl');
  const btnCopyImgTag = document.getElementById('b64-copy-imgtag');
  const btnCopyCssBg = document.getElementById('b64-copy-cssbg');
  const btnCopyMdImg = document.getElementById('b64-copy-mdimg');

  // Submode Tabs (Text vs File)
  const modeTabs = document.querySelectorAll('.b64-mode-tab');
  const textModeWrapper = document.getElementById('b64-text-mode');
  const fileModeWrapper = document.getElementById('b64-file-mode');

  let currentDataUrl = '';
  let currentMimeType = '';
  let currentFileName = 'converted_file';

  // Helper: Toast notification
  function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `cyber-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="toast-message">${escapeHtml(message)}</div>
    `;

    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Encoding: UTF-8 to Base64 ---
  function utf8ToBase64(str, urlSafe = false) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    let base64 = btoa(binary);
    if (urlSafe) {
      base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return base64;
  }

  // --- Decoding: Base64 to UTF-8 ---
  function base64ToUtf8(base64Str) {
    let str = base64Str.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  // Update Byte Counters & Ratio
  function updateStats(inBytes, outBytes) {
    if (statInputBytes) statInputBytes.textContent = `${inBytes.toLocaleString()} B`;
    if (statOutputBytes) statOutputBytes.textContent = `${outBytes.toLocaleString()} B`;

    if (statRatio) {
      if (inBytes > 0 && outBytes > 0) {
        const diff = ((outBytes - inBytes) / inBytes) * 100;
        statRatio.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
        statRatio.style.color = diff > 0 ? '#38bdf8' : '#34d399';
      } else {
        statRatio.textContent = '0%';
        statRatio.style.color = 'var(--text-muted)';
      }
    }
  }

  // Detect and render image/file preview if output or input is image
  function inspectForMedia(text) {
    const trimmed = text.trim();
    let dataUri = '';
    let isImage = false;

    if (trimmed.startsWith('data:image/')) {
      dataUri = trimmed;
      isImage = true;
      const mimeMatch = trimmed.match(/^data:([^;]+);base64,/);
      if (mimeMatch) currentMimeType = mimeMatch[1];
    } else if (trimmed.startsWith('data:')) {
      dataUri = trimmed;
      const mimeMatch = trimmed.match(/^data:([^;]+);base64,/);
      if (mimeMatch) currentMimeType = mimeMatch[1];
      isImage = currentMimeType.startsWith('image/');
    } else {
      // Check magic signatures for raw Base64 image
      if (trimmed.startsWith('iVBORw0KGgo')) { // PNG
        currentMimeType = 'image/png';
        dataUri = `data:image/png;base64,${trimmed}`;
        isImage = true;
      } else if (trimmed.startsWith('/9j/')) { // JPEG
        currentMimeType = 'image/jpeg';
        dataUri = `data:image/jpeg;base64,${trimmed}`;
        isImage = true;
      } else if (trimmed.startsWith('R0lGOD')) { // GIF
        currentMimeType = 'image/gif';
        dataUri = `data:image/gif;base64,${trimmed}`;
        isImage = true;
      } else if (trimmed.startsWith('UklGR')) { // WebP
        currentMimeType = 'image/webp';
        dataUri = `data:image/webp;base64,${trimmed}`;
        isImage = true;
      } else if (trimmed.startsWith('PHN2Zy')) { // SVG
        currentMimeType = 'image/svg+xml';
        dataUri = `data:image/svg+xml;base64,${trimmed}`;
        isImage = true;
      }
    }

    currentDataUrl = dataUri;

    if (isImage && dataUri) {
      if (previewBox && previewImg) {
        previewImg.src = dataUri;
        previewBox.style.display = 'block';
      }
      if (formatButtonsRow) formatButtonsRow.style.display = 'flex';
      if (btnDownload) btnDownload.style.display = 'inline-flex';
    } else {
      if (previewBox) previewBox.style.display = 'none';
      if (formatButtonsRow) formatButtonsRow.style.display = 'none';
      if (btnDownload && !currentDataUrl) btnDownload.style.display = 'none';
    }
  }

  // Trigger Encode Action
  function handleEncode() {
    const raw = inputEl.value;
    if (!raw) {
      outputEl.value = '';
      updateStats(0, 0);
      inspectForMedia('');
      return;
    }

    const isUrlSafe = urlSafeToggle ? urlSafeToggle.checked : false;
    try {
      const inBytes = new TextEncoder().encode(raw).length;
      const encoded = utf8ToBase64(raw, isUrlSafe);
      outputEl.value = encoded;
      updateStats(inBytes, encoded.length);
      inspectForMedia(encoded);
    } catch (err) {
      console.error('Encode error:', err);
      showToast(isEn ? 'Encoding failed: ' + err.message : '编码失败：' + err.message, 'error');
    }
  }

  // Trigger Decode Action
  function handleDecode() {
    const raw = inputEl.value.trim();
    if (!raw) {
      outputEl.value = '';
      updateStats(0, 0);
      inspectForMedia('');
      return;
    }

    try {
      // Check if input is a Data URL
      let base64Body = raw;
      if (raw.startsWith('data:')) {
        const parts = raw.split(',');
        if (parts.length > 1) {
          base64Body = parts[1];
        }
      }

      // Check if it might be an image/media first
      inspectForMedia(raw);

      const decoded = base64ToUtf8(base64Body);
      outputEl.value = decoded;
      const outBytes = new TextEncoder().encode(decoded).length;
      updateStats(raw.length, outBytes);
    } catch (err) {
      console.error('Decode error:', err);
      // Even if UTF-8 decode failed, it might be raw binary image data
      inspectForMedia(raw);
      if (!currentDataUrl) {
        showToast(isEn ? 'Invalid Base64 sequence or binary file.' : '无效的 Base64 字符串或包含不可读二进制。', 'error');
      }
    }
  }

  // Swap Input and Output
  function handleSwap() {
    const temp = inputEl.value;
    inputEl.value = outputEl.value;
    outputEl.value = temp;

    const inBytes = new TextEncoder().encode(inputEl.value).length;
    const outBytes = new TextEncoder().encode(outputEl.value).length;
    updateStats(inBytes, outBytes);
    inspectForMedia(outputEl.value);
    showToast(isEn ? 'Swapped input & output.' : '已交换输入与输出。');
  }

  // Clear Both
  function handleClear() {
    inputEl.value = '';
    outputEl.value = '';
    currentDataUrl = '';
    updateStats(0, 0);
    inspectForMedia('');
    if (fileInput) fileInput.value = '';
    if (dropzoneText) {
      dropzoneText.textContent = isEn
        ? 'Drag & drop file or image here, or click to browse'
        : '拖拽文件或图片至此，或点击选择本地文件';
    }
    showToast(isEn ? 'Cleared.' : '已清空。');
  }

  // Copy Output
  function handleCopy() {
    const val = outputEl.value;
    if (!val) {
      showToast(isEn ? 'Nothing to copy.' : '输出结果为空，无法复制。', 'error');
      return;
    }
    navigator.clipboard.writeText(val).then(() => {
      showToast(isEn ? 'Output copied to clipboard!' : '转换结果已复制到剪贴板！');
    });
  }

  // Download converted file
  function handleDownload() {
    if (currentDataUrl) {
      // Trigger download from Data URL
      const a = document.createElement('a');
      a.href = currentDataUrl;
      const ext = currentMimeType.split('/')[1] || 'bin';
      a.download = `${currentFileName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(isEn ? 'File downloaded!' : '文件下载已开始！');
      return;
    }

    const text = outputEl.value;
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'base64_result.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(isEn ? 'Result file downloaded!' : '文本结果已保存为文件！');
  }

  // Live input listening
  if (inputEl) {
    let debounce;
    inputEl.addEventListener('input', () => {
      const isLive = liveConvertToggle ? liveConvertToggle.checked : true;
      if (!isLive) return;

      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const val = inputEl.value.trim();
        // Auto heuristic: if looks like valid Base64, try decode; else encode
        const isProbableBase64 = /^[A-Za-z0-9+/_-]+={0,2}$/.test(val) && val.length > 8 && val.length % 4 <= 2;
        if (isProbableBase64) {
          try {
            handleDecode();
            return;
          } catch(e) {}
        }
        handleEncode();
      }, 150);
    });
  }

  // URL Safe Toggle change
  if (urlSafeToggle) {
    urlSafeToggle.addEventListener('change', () => {
      handleEncode();
    });
  }

  // File Upload / Dropzone Handling
  function processFile(file) {
    if (!file) return;

    currentFileName = file.name.replace(/\.[^/.]+$/, '');
    currentMimeType = file.type || 'application/octet-stream';

    if (dropzoneText) {
      dropzoneText.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result;
      currentDataUrl = dataUri;
      inputEl.value = `[File: ${file.name} | Type: ${currentMimeType} | Size: ${file.size} bytes]`;

      const parts = dataUri.split(',');
      const rawBase64 = parts.length > 1 ? parts[1] : parts[0];

      outputEl.value = dataUri;
      updateStats(file.size, rawBase64.length);
      inspectForMedia(dataUri);

      showToast(isEn ? `File ${file.name} encoded to Base64!` : `文件 ${file.name} 已成功转换为 Base64！`);
    };
    reader.readAsDataURL(file);
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file) processFile(file);
    });

    dropzone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
  }

  // Quick format copy buttons
  if (btnCopyDataUrl) {
    btnCopyDataUrl.addEventListener('click', () => {
      if (!currentDataUrl) return;
      navigator.clipboard.writeText(currentDataUrl).then(() => {
        showToast(isEn ? 'Data URL copied!' : 'Data URL 已复制！');
      });
    });
  }

  if (btnCopyImgTag) {
    btnCopyImgTag.addEventListener('click', () => {
      if (!currentDataUrl) return;
      const tag = `<img src="${currentDataUrl}" alt="Embedded Image">`;
      navigator.clipboard.writeText(tag).then(() => {
        showToast(isEn ? 'HTML <img> tag copied!' : 'HTML <img> 标签已复制！');
      });
    });
  }

  if (btnCopyCssBg) {
    btnCopyCssBg.addEventListener('click', () => {
      if (!currentDataUrl) return;
      const css = `background-image: url("${currentDataUrl}");`;
      navigator.clipboard.writeText(css).then(() => {
        showToast(isEn ? 'CSS background-image copied!' : 'CSS background-image 样式已复制！');
      });
    });
  }

  if (btnCopyMdImg) {
    btnCopyMdImg.addEventListener('click', () => {
      if (!currentDataUrl) return;
      const md = `![Image](${currentDataUrl})`;
      navigator.clipboard.writeText(md).then(() => {
        showToast(isEn ? 'Markdown image syntax copied!' : 'Markdown 图片代码已复制！');
      });
    });
  }

  // Submode Tabs (Text vs File)
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.dataset.mode;
      if (mode === 'file') {
        if (textModeWrapper) textModeWrapper.style.display = 'none';
        if (fileModeWrapper) fileModeWrapper.style.display = 'block';
      } else {
        if (textModeWrapper) textModeWrapper.style.display = 'block';
        if (fileModeWrapper) fileModeWrapper.style.display = 'none';
      }
    });
  });

  // Sample Loaders
  if (sampleTextBtn) {
    sampleTextBtn.addEventListener('click', () => {
      inputEl.value = isEn
        ? 'Frontier AI Architect Handbook 2026: DeepSeek-V4-Pro, Kimi K3, and GPT-6 Astra. 🤖⚡'
        : '大雄话AI — 2026 前沿大模型架构与 Agent 工程实战笔记。专注 DeepSeek-V4-Pro、Kimi K3 与高性能推理！🤖⚡';
      handleEncode();
      showToast(isEn ? 'Loaded text sample.' : '已载入文本示例并完成编码。');
    });
  }

  if (sampleJsonBtn) {
    sampleJsonBtn.addEventListener('click', () => {
      const sampleObj = {
        app: "Nobita Talks AI",
        version: "2026.3.5",
        features: ["Markdown Studio", "Base64 Codec", "KaTeX Typography"],
        metrics: { latency_ttft_ms: 140, context_window: 131072 }
      };
      inputEl.value = JSON.stringify(sampleObj, null, 2);
      handleEncode();
      showToast(isEn ? 'Loaded JSON sample.' : '已载入 JSON 示例并完成编码。');
    });
  }

  if (sampleSvgBtn) {
    sampleSvgBtn.addEventListener('click', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="45" fill="#6366f1"/><path d="M30 50 L45 65 L70 35" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`;
      inputEl.value = svg;
      handleEncode();
      inspectForMedia(outputEl.value);
      showToast(isEn ? 'Loaded SVG sample.' : '已载入 SVG 矢量图并生成 Base64。');
    });
  }

  // Attach button listeners
  if (btnEncode) btnEncode.addEventListener('click', handleEncode);
  if (btnDecode) btnDecode.addEventListener('click', handleDecode);
  if (btnSwap) btnSwap.addEventListener('click', handleSwap);
  if (btnClear) btnClear.addEventListener('click', handleClear);
  if (btnCopy) btnCopy.addEventListener('click', handleCopy);
  if (btnDownload) btnDownload.addEventListener('click', handleDownload);
}
