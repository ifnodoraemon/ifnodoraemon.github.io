// JSON Studio: Prettifier, Escaper, AST TypeScript Generator

export function initJsonStudio() {
  const container = document.getElementById('json-tool-app');
  if (!container) return;

  const isEn = container.dataset.lang === 'en';

  const inputEl = document.getElementById('json-input');
  const outputEl = document.getElementById('json-output');
  const errorBanner = document.getElementById('json-error-banner');

  const btnFormat2 = document.getElementById('json-btn-format2');
  const btnFormat4 = document.getElementById('json-btn-format4');
  const btnMinify = document.getElementById('json-btn-minify');
  const btnSort = document.getElementById('json-btn-sort');
  const btnEscape = document.getElementById('json-btn-escape');
  const btnUnescape = document.getElementById('json-btn-unescape');
  const btnToTs = document.getElementById('json-btn-to-ts');
  const btnCopy = document.getElementById('json-btn-copy');
  const btnClear = document.getElementById('json-btn-clear');
  const btnSample = document.getElementById('json-btn-sample');

  const statInBytes = document.getElementById('json-stat-in-bytes');
  const statOutBytes = document.getElementById('json-stat-out-bytes');
  const statLines = document.getElementById('json-stat-lines');

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

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + ' ' + sizes[i];
  }

  function updateStats() {
    const inText = inputEl.value;
    const outText = outputEl.value;

    if (statInBytes) {
      const inSize = new Blob([inText]).size;
      statInBytes.textContent = formatBytes(inSize);
    }
    if (statOutBytes) {
      const outSize = new Blob([outText]).size;
      statOutBytes.textContent = formatBytes(outSize);
    }
    if (statLines) {
      const count = outText ? outText.split('\n').length : 0;
      statLines.textContent = `${count} ${isEn ? 'lines' : '行'}`;
    }
  }

  function clearError() {
    if (errorBanner) {
      errorBanner.style.display = 'none';
      errorBanner.textContent = '';
    }
  }

  function showError(err) {
    if (errorBanner) {
      errorBanner.style.display = 'block';
      let msg = err.message || String(err);
      errorBanner.textContent = `⚠️ ${msg}`;
    }
  }

  function parseInput() {
    clearError();
    const raw = inputEl.value.trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      showError(err);
      return null;
    }
  }

  function sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    } else if (obj !== null && typeof obj === 'object') {
      const sorted = {};
      Object.keys(obj).sort().forEach(key => {
        sorted[key] = sortObjectKeys(obj[key]);
      });
      return sorted;
    }
    return obj;
  }

  // AST-based TypeScript Interface Generator
  function generateTypeScript(jsonVal, rootName = 'RootObject') {
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
        // Aggregate array types
        const types = new Set();
        val.forEach((item, idx) => {
          types.add(inferType(item, `${propName}Item`));
        });
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
      const lines = [];
      lines.push(`export interface ${interfaceName} {`);

      for (const [key, val] of Object.entries(obj)) {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
        const typeStr = inferType(val, key);
        lines.push(`  ${safeKey}: ${typeStr};`);
      }

      lines.push('}');
      subInterfaces.push(lines.join('\n'));
    }

    if (Array.isArray(jsonVal)) {
      if (jsonVal.length > 0 && typeof jsonVal[0] === 'object' && jsonVal[0] !== null) {
        parseInterface(jsonVal[0], rootName);
        subInterfaces.push(`export type ${rootName}List = ${rootName}[];`);
      } else {
        return `export type ${rootName} = any[];`;
      }
    } else if (typeof jsonVal === 'object' && jsonVal !== null) {
      parseInterface(jsonVal, rootName);
    } else {
      return `export type ${rootName} = ${typeof jsonVal};`;
    }

    return subInterfaces.reverse().join('\n\n');
  }

  // Action listeners
  if (btnFormat2) {
    btnFormat2.addEventListener('click', () => {
      const data = parseInput();
      if (data !== null) {
        outputEl.value = JSON.stringify(data, null, 2);
        updateStats();
      }
    });
  }

  if (btnFormat4) {
    btnFormat4.addEventListener('click', () => {
      const data = parseInput();
      if (data !== null) {
        outputEl.value = JSON.stringify(data, null, 4);
        updateStats();
      }
    });
  }

  if (btnMinify) {
    btnMinify.addEventListener('click', () => {
      const data = parseInput();
      if (data !== null) {
        outputEl.value = JSON.stringify(data);
        updateStats();
      }
    });
  }

  if (btnSort) {
    btnSort.addEventListener('click', () => {
      const data = parseInput();
      if (data !== null) {
        const sorted = sortObjectKeys(data);
        outputEl.value = JSON.stringify(sorted, null, 2);
        updateStats();
      }
    });
  }

  if (btnEscape) {
    btnEscape.addEventListener('click', () => {
      clearError();
      const raw = inputEl.value;
      if (!raw) return;
      outputEl.value = JSON.stringify(raw);
      updateStats();
    });
  }

  if (btnUnescape) {
    btnUnescape.addEventListener('click', () => {
      clearError();
      const raw = inputEl.value.trim();
      if (!raw) return;
      try {
        if (raw.startsWith('"') && raw.endsWith('"')) {
          outputEl.value = JSON.parse(raw);
        } else {
          outputEl.value = JSON.parse(`"${raw.replace(/"/g, '\\"')}"`);
        }
        updateStats();
      } catch (err) {
        showError(err);
      }
    });
  }

  if (btnToTs) {
    btnToTs.addEventListener('click', () => {
      const data = parseInput();
      if (data !== null) {
        const tsCode = generateTypeScript(data, 'AgentWorkflowState');
        outputEl.value = tsCode;
        updateStats();
      }
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const text = outputEl.value;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        showToast(isEn ? 'Copied to clipboard!' : '已复制到剪贴板！');
      }).catch(err => console.warn('Copy failed:', err));
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      inputEl.value = '';
      outputEl.value = '';
      clearError();
      updateStats();
    });
  }

  if (btnSample) {
    btnSample.addEventListener('click', () => {
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
          { name: "ast_linter", cache_ttl_sec: 60, is_read_only: true },
          { name: "pr_commenter", cache_ttl_sec: 0, is_read_only: false }
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

      inputEl.value = JSON.stringify(sample, null, 2);
      clearError();
      updateStats();
      if (btnToTs) btnToTs.click();
    });
  }

  inputEl.addEventListener('input', () => {
    clearError();
    updateStats();
  });
  outputEl.addEventListener('input', updateStats);

  updateStats();
}
