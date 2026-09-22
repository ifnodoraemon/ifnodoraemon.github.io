// JWT (JSON Web Token) Offline Sandbox Debugger (RFC 7519)

export function initJwtStudio() {
  const container = document.getElementById('jwt-tool-app');
  if (!container) return;

  const isEn = container.dataset.lang === 'en';

  const inputEl = document.getElementById('jwt-input');
  const headerCode = document.getElementById('jwt-header-code');
  const payloadCode = document.getElementById('jwt-payload-code');
  const sigText = document.getElementById('jwt-signature-val');
  const errorBox = document.getElementById('jwt-error-box');

  const claimsGrid = document.getElementById('jwt-claims-grid');
  const expStatusBadge = document.getElementById('jwt-exp-badge');

  const btnSample = document.getElementById('jwt-btn-sample');
  const btnClear = document.getElementById('jwt-btn-clear');
  const btnCopyHeader = document.getElementById('jwt-copy-header');
  const btnCopyPayload = document.getElementById('jwt-copy-payload');

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

  // Base64URL to UTF-8 string decoding
  function decodeBase64Url(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  function formatDate(unixSec) {
    if (!unixSec || isNaN(unixSec)) return 'N/A';
    const d = new Date(unixSec * 1000);
    return d.toLocaleString(isEn ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  function getRelativeExpiry(unixSec) {
    const nowSec = Math.floor(Date.now() / 1000);
    const diff = unixSec - nowSec;
    const absDiff = Math.abs(diff);

    const hours = Math.floor(absDiff / 3600);
    const minutes = Math.floor((absDiff % 3600) / 60);

    let timeStr = '';
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      timeStr = isEn ? `${days} days` : `${days} 天`;
    } else if (hours > 0) {
      timeStr = isEn ? `${hours}h ${minutes}m` : `${hours} 小时 ${minutes} 分钟`;
    } else {
      timeStr = isEn ? `${minutes}m` : `${minutes} 分钟`;
    }

    if (diff > 0) {
      return {
        expired: false,
        text: isEn ? `VALID (Expires in ${timeStr})` : `有效 (剩余 ${timeStr} 过期)`,
        cssClass: 'status-valid'
      };
    } else {
      return {
        expired: true,
        text: isEn ? `EXPIRED (${timeStr} ago)` : `已过期 (${timeStr} 前已失效)`,
        cssClass: 'status-expired'
      };
    }
  }

  function parseJwt() {
    if (errorBox) errorBox.style.display = 'none';

    const raw = inputEl.value.trim();
    if (!raw) {
      if (headerCode) headerCode.textContent = '{}';
      if (payloadCode) payloadCode.textContent = '{}';
      if (sigText) sigText.textContent = '';
      if (claimsGrid) claimsGrid.innerHTML = '';
      if (expStatusBadge) expStatusBadge.style.display = 'none';
      return;
    }

    const parts = raw.split('.');
    if (parts.length < 2) {
      if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.textContent = isEn
          ? 'Invalid JWT format: A valid JWT must contain at least 2 segments separated by dots (header.payload.signature).'
          : '无效的 JWT 格式：合规的 JWT 必须由点号分隔的段组成 (header.payload.signature)。';
      }
      return;
    }

    try {
      const headerObj = JSON.parse(decodeBase64Url(parts[0]));
      const payloadObj = JSON.parse(decodeBase64Url(parts[1]));
      const signaturePart = parts[2] || '';

      if (headerCode) headerCode.textContent = JSON.stringify(headerObj, null, 2);
      if (payloadCode) payloadCode.textContent = JSON.stringify(payloadObj, null, 2);
      if (sigText) {
        sigText.textContent = signaturePart
          ? `${signaturePart}\n\n// Algorithm: ${headerObj.alg || 'Unknown'}\n// ⚠️ Client-side signature verification requires secret key`
          : '// No signature segment found';
      }

      // Render Claims Table
      if (claimsGrid) {
        const claims = [
          { key: 'iss', label: isEn ? 'Issuer (iss)' : '签发者 (iss)', val: payloadObj.iss },
          { key: 'sub', label: isEn ? 'Subject (sub)' : '主题身份 (sub)', val: payloadObj.sub },
          { key: 'aud', label: isEn ? 'Audience (aud)' : '接收方受众 (aud)', val: payloadObj.aud },
          { key: 'iat', label: isEn ? 'Issued At (iat)' : '签发时间 (iat)', val: payloadObj.iat ? formatDate(payloadObj.iat) : null },
          { key: 'nbf', label: isEn ? 'Not Before (nbf)' : '生效时刻 (nbf)', val: payloadObj.nbf ? formatDate(payloadObj.nbf) : null },
          { key: 'exp', label: isEn ? 'Expiration (exp)' : '过期时间 (exp)', val: payloadObj.exp ? formatDate(payloadObj.exp) : null }
        ];

        const activeClaims = claims.filter(c => c.val !== undefined && c.val !== null);

        claimsGrid.innerHTML = activeClaims.map(c => `
          <div class="jwt-claim-chip">
            <span class="claim-tag">${c.label}</span>
            <span class="claim-val">${c.val}</span>
          </div>
        `).join('');
      }

      // Check expiration status
      if (expStatusBadge) {
        if (payloadObj.exp) {
          const status = getRelativeExpiry(payloadObj.exp);
          expStatusBadge.style.display = 'inline-flex';
          expStatusBadge.className = `jwt-exp-badge ${status.cssClass}`;
          expStatusBadge.textContent = status.text;
        } else {
          expStatusBadge.style.display = 'inline-flex';
          expStatusBadge.className = 'jwt-exp-badge status-warning';
          expStatusBadge.textContent = isEn ? 'NO EXPIRATION (Never Expires)' : '未设置过期时间 (永久有效)';
        }
      }

    } catch (err) {
      if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.textContent = `Parse Error: ${err.message}`;
      }
    }
  }

  inputEl.addEventListener('input', parseJwt);

  if (btnSample) {
    btnSample.addEventListener('click', () => {
      // Standard sample JWT (HS256) valid for 2 hours from now
      const now = Math.floor(Date.now() / 1000);
      const header = {
        alg: "HS256",
        typ: "JWT"
      };
      const payload = {
        iss: "https://blog.llmgo.top",
        sub: "developer_67990a",
        aud: "ai-agent-engine",
        name: "Nobita Talks AI Dev",
        roles: ["admin", "architect", "agent_operator"],
        mcp_scopes: ["fs:read", "tools:invoke", "context:query"],
        iat: now,
        nbf: now,
        exp: now + 7200
      };

      const b64Url = (obj) => {
        const json = JSON.stringify(obj);
        const encoded = btoa(unescape(encodeURIComponent(json)));
        return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };

      const sampleJwt = `${b64Url(header)}.${b64Url(payload)}.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk`;
      inputEl.value = sampleJwt;
      parseJwt();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      inputEl.value = '';
      parseJwt();
    });
  }

  if (btnCopyHeader) {
    btnCopyHeader.addEventListener('click', () => {
      if (!headerCode) return;
      navigator.clipboard.writeText(headerCode.textContent).then(() => {
        showToast(isEn ? 'Copied Header JSON' : '已复制 Header JSON');
      });
    });
  }

  if (btnCopyPayload) {
    btnCopyPayload.addEventListener('click', () => {
      if (!payloadCode) return;
      navigator.clipboard.writeText(payloadCode.textContent).then(() => {
        showToast(isEn ? 'Copied Payload JSON' : '已复制 Payload JSON');
      });
    });
  }

  parseJwt();
}
