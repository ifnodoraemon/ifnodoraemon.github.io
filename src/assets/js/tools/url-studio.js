// URL Codec & Query Parameter Interactive Table Studio (RFC 3986)

export function initUrlStudio() {
  const container = document.getElementById('url-tool-app');
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

  const inputUrl = document.getElementById('url-input');
  const btnEncodeComponent = document.getElementById('url-btn-encode-comp');
  const btnEncodeUri = document.getElementById('url-btn-encode-uri');
  const btnDecode = document.getElementById('url-btn-decode');
  const btnDecodeDeep = document.getElementById('url-btn-decode-deep');
  const btnClear = document.getElementById('url-btn-clear');
  const btnSample = document.getElementById('url-btn-sample');

  // Breakdown fields
  const outProtocol = document.getElementById('url-part-protocol');
  const outHost = document.getElementById('url-part-host');
  const outPath = document.getElementById('url-part-path');
  const outHash = document.getElementById('url-part-hash');

  // Query table
  const queryTableBody = document.getElementById('url-query-tbody');
  const btnAddParam = document.getElementById('url-btn-add-param');
  const outputCleanUrl = document.getElementById('url-output-reconstructed');
  const btnCopyCleanUrl = document.getElementById('url-btn-copy-reconstructed');

  let queryParams = []; // Array of { id, key, value, enabled }
  let baseUrlPrefix = ''; // protocol + host + path
  let hashPart = '';

  let paramIdSeq = 1;

  function parseCurrentUrl() {
    const raw = inputUrl.value.trim();
    if (!raw) {
      if (outProtocol) outProtocol.textContent = '-';
      if (outHost) outHost.textContent = '-';
      if (outPath) outPath.textContent = '-';
      if (outHash) outHash.textContent = '-';
      queryParams = [];
      renderQueryTable();
      updateReconstructedUrl();
      return;
    }

    try {
      // If no protocol, prepend dummy for parsing
      let parseable = raw;
      let addedDummy = false;
      if (!/^https?:\/\//i.test(raw)) {
        parseable = 'https://' + raw;
        addedDummy = true;
      }

      const u = new URL(parseable);
      if (outProtocol) outProtocol.textContent = addedDummy ? '-' : u.protocol;
      if (outHost) outHost.textContent = u.host || '-';
      if (outPath) outPath.textContent = u.pathname || '/';
      if (outHash) outHash.textContent = u.hash || '-';

      baseUrlPrefix = addedDummy ? raw.split('?')[0].split('#')[0] : `${u.protocol}//${u.host}${u.pathname}`;
      hashPart = u.hash;

      queryParams = [];
      u.searchParams.forEach((val, key) => {
        queryParams.push({
          id: ++paramIdSeq,
          key: key,
          value: val,
          enabled: true
        });
      });

      renderQueryTable();
      updateReconstructedUrl();
    } catch (e) {
      // Fallback for simple query strings like "?foo=bar&baz=1"
      if (outProtocol) outProtocol.textContent = '-';
      if (outHost) outHost.textContent = '-';
      if (outPath) outPath.textContent = '-';
      if (outHash) outHash.textContent = '-';

      const qIndex = raw.indexOf('?');
      if (qIndex !== -1) {
        baseUrlPrefix = raw.substring(0, qIndex);
        const qStr = raw.substring(qIndex + 1).split('#')[0];
        const hIndex = raw.indexOf('#');
        hashPart = hIndex !== -1 ? raw.substring(hIndex) : '';

        queryParams = [];
        const pairs = qStr.split('&');
        pairs.forEach(pair => {
          if (!pair) return;
          const [k, ...v] = pair.split('=');
          queryParams.push({
            id: ++paramIdSeq,
            key: decodeURIComponent(k || ''),
            value: decodeURIComponent(v.join('=') || ''),
            enabled: true
          });
        });
      } else {
        baseUrlPrefix = raw;
        hashPart = '';
        queryParams = [];
      }

      renderQueryTable();
      updateReconstructedUrl();
    }
  }

  function renderQueryTable() {
    if (!queryTableBody) return;

    if (queryParams.length === 0) {
      queryTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted" style="padding: 1.5rem;">
            ${isEn ? 'No query parameters detected in URL' : '当前 URL 无 Query 参数，可点击下方按钮添加'}
          </td>
        </tr>
      `;
      return;
    }

    queryTableBody.innerHTML = queryParams.map(p => `
      <tr class="${p.enabled ? '' : 'param-disabled'}" data-id="${p.id}">
        <td style="width: 40px; text-align: center;">
          <input type="checkbox" class="param-toggle" ${p.enabled ? 'checked' : ''}>
        </td>
        <td>
          <input type="text" class="param-input-key cyber-input" value="${escapeHtml(p.key)}" placeholder="Key">
        </td>
        <td>
          <input type="text" class="param-input-val cyber-input" value="${escapeHtml(p.value)}" placeholder="Value">
        </td>
        <td style="width: 50px; text-align: center;">
          <button type="button" class="tool-icon-btn param-del-btn" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    // Attach listeners
    queryTableBody.querySelectorAll('tr').forEach(row => {
      const id = parseInt(row.dataset.id, 10);
      const item = queryParams.find(p => p.id === id);
      if (!item) return;

      const toggle = row.querySelector('.param-toggle');
      const keyInput = row.querySelector('.param-input-key');
      const valInput = row.querySelector('.param-input-val');
      const delBtn = row.querySelector('.param-del-btn');

      toggle.addEventListener('change', () => {
        item.enabled = toggle.checked;
        row.classList.toggle('param-disabled', !toggle.checked);
        updateReconstructedUrl();
      });

      keyInput.addEventListener('input', () => {
        item.key = keyInput.value;
        updateReconstructedUrl();
      });

      valInput.addEventListener('input', () => {
        item.value = valInput.value;
        updateReconstructedUrl();
      });

      delBtn.addEventListener('click', () => {
        queryParams = queryParams.filter(p => p.id !== id);
        renderQueryTable();
        updateReconstructedUrl();
      });
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function updateReconstructedUrl() {
    if (!outputCleanUrl) return;

    const activeParams = queryParams.filter(p => p.enabled && p.key.trim() !== '');
    let qs = '';
    if (activeParams.length > 0) {
      qs = '?' + activeParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
    }

    const reconstructed = `${baseUrlPrefix}${qs}${hashPart}`;
    outputCleanUrl.value = reconstructed;
  }

  // Action listeners
  if (inputUrl) {
    inputUrl.addEventListener('input', parseCurrentUrl);
  }

  if (btnAddParam) {
    btnAddParam.addEventListener('click', () => {
      queryParams.push({
        id: ++paramIdSeq,
        key: '',
        value: '',
        enabled: true
      });
      renderQueryTable();
      updateReconstructedUrl();
    });
  }

  if (btnEncodeComponent) {
    btnEncodeComponent.addEventListener('click', () => {
      const raw = inputUrl.value;
      if (!raw) return;
      inputUrl.value = encodeURIComponent(raw);
      parseCurrentUrl();
    });
  }

  if (btnEncodeUri) {
    btnEncodeUri.addEventListener('click', () => {
      const raw = inputUrl.value;
      if (!raw) return;
      inputUrl.value = encodeURI(raw);
      parseCurrentUrl();
    });
  }

  if (btnDecode) {
    btnDecode.addEventListener('click', () => {
      const raw = inputUrl.value;
      if (!raw) return;
      try {
        inputUrl.value = decodeURIComponent(raw);
        parseCurrentUrl();
      } catch (e) {
        inputUrl.value = decodeURI(raw);
        parseCurrentUrl();
      }
    });
  }

  if (btnDecodeDeep) {
    btnDecodeDeep.addEventListener('click', () => {
      let cur = inputUrl.value;
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
      inputUrl.value = cur;
      parseCurrentUrl();
      showToast(isEn ? `Multi-pass decoded (${loops} passes)` : `已完成多层嵌套解码 (${loops} 轮)`);
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      inputUrl.value = '';
      parseCurrentUrl();
    });
  }

  if (btnSample) {
    btnSample.addEventListener('click', () => {
      inputUrl.value = 'https://blog.llmgo.top/articles/ai-agent/?utm_source=github&utm_medium=readme&session_token=eyJhbGciOiJIUzI1NiJ9&lang=zh-CN&debug=true#faq-section';
      parseCurrentUrl();
    });
  }

  if (btnCopyCleanUrl) {
    btnCopyCleanUrl.addEventListener('click', () => {
      const val = outputCleanUrl ? outputCleanUrl.value : '';
      if (!val) return;
      navigator.clipboard.writeText(val).then(() => {
        showToast(isEn ? 'Copied Clean URL' : '已复制重新组装的 URL');
      });
    });
  }

  parseCurrentUrl();
}
