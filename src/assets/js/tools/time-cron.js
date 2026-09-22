// Unix Timestamp & CRON Expression Studio

export function initTimeCron() {
  const container = document.getElementById('cron-tool-app');
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

  // ==========================================
  // Part 1: Live Current Unix Timestamp
  // ==========================================
  const liveSecEl = document.getElementById('tc-live-sec');
  const liveMsEl = document.getElementById('tc-live-ms');
  const btnCopyLiveSec = document.getElementById('tc-copy-sec');
  const btnCopyLiveMs = document.getElementById('tc-copy-ms');

  function tickLive() {
    const now = Date.now();
    if (liveSecEl) liveSecEl.textContent = Math.floor(now / 1000).toString();
    if (liveMsEl) liveMsEl.textContent = now.toString();
  }
  tickLive();
  const liveTimer = setInterval(tickLive, 500);

  if (btnCopyLiveSec) {
    btnCopyLiveSec.addEventListener('click', () => {
      const val = Math.floor(Date.now() / 1000).toString();
      navigator.clipboard.writeText(val).then(() => showToast(isEn ? 'Copied current seconds' : '已复制当前秒级时间戳'));
    });
  }

  if (btnCopyLiveMs) {
    btnCopyLiveMs.addEventListener('click', () => {
      const val = Date.now().toString();
      navigator.clipboard.writeText(val).then(() => showToast(isEn ? 'Copied current milliseconds' : '已复制当前毫秒级时间戳'));
    });
  }

  // ==========================================
  // Part 2: Timestamp -> Datetime
  // ==========================================
  const inputTs = document.getElementById('tc-input-ts');
  const btnNowTs = document.getElementById('tc-btn-now-ts');
  const outLocalTime = document.getElementById('tc-out-local');
  const outUtcTime = document.getElementById('tc-out-utc');
  const outRelative = document.getElementById('tc-out-relative');

  function pad(n) { return n < 10 ? '0' + n : n; }

  function formatDateTimeLocal(d) {
    const Y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
  }

  function formatRelative(diffSec) {
    const abs = Math.abs(diffSec);
    const prefix = diffSec < 0 ? (isEn ? '' : '') : (isEn ? 'in ' : '');
    const suffix = diffSec < 0 ? (isEn ? ' ago' : '前') : (isEn ? '' : '后');

    if (abs < 60) return isEn ? `${abs}s${suffix}` : `${abs} 秒${suffix}`;
    if (abs < 3600) {
      const mins = Math.floor(abs / 60);
      return isEn ? `${prefix}${mins}m${suffix}` : `${mins} 分钟${suffix}`;
    }
    if (abs < 86400) {
      const hours = Math.floor(abs / 3600);
      return isEn ? `${prefix}${hours}h${suffix}` : `${hours} 小时${suffix}`;
    }
    const days = Math.floor(abs / 86400);
    return isEn ? `${prefix}${days}d${suffix}` : `${days} 天${suffix}`;
  }

  function convertTsToDate() {
    let val = inputTs.value.trim();
    if (!val) {
      if (outLocalTime) outLocalTime.textContent = '-';
      if (outUtcTime) outUtcTime.textContent = '-';
      if (outRelative) outRelative.textContent = '-';
      return;
    }

    let num = parseInt(val, 10);
    if (isNaN(num)) return;

    // Auto-detect seconds vs milliseconds
    if (val.length <= 10) {
      num = num * 1000;
    }

    const d = new Date(num);
    if (isNaN(d.getTime())) return;

    if (outLocalTime) outLocalTime.textContent = formatDateTimeLocal(d);
    if (outUtcTime) outUtcTime.textContent = d.toISOString();

    const diffSec = Math.floor((num - Date.now()) / 1000);
    if (outRelative) outRelative.textContent = formatRelative(diffSec);
  }

  if (inputTs) inputTs.addEventListener('input', convertTsToDate);
  if (btnNowTs) {
    btnNowTs.addEventListener('click', () => {
      inputTs.value = Math.floor(Date.now() / 1000).toString();
      convertTsToDate();
    });
  }

  // ==========================================
  // Part 3: Datetime -> Timestamp
  // ==========================================
  const inputDateStr = document.getElementById('tc-input-date');
  const btnNowDate = document.getElementById('tc-btn-now-date');
  const outSec = document.getElementById('tc-out-sec');
  const outMs = document.getElementById('tc-out-ms');

  function convertDateToTs() {
    const val = inputDateStr.value.trim();
    if (!val) {
      if (outSec) outSec.textContent = '-';
      if (outMs) outMs.textContent = '-';
      return;
    }

    // Support YYYY-MM-DD HH:mm:ss or ISO
    const cleanStr = val.replace(' ', 'T');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return;

    const ms = d.getTime();
    if (outSec) outSec.textContent = Math.floor(ms / 1000).toString();
    if (outMs) outMs.textContent = ms.toString();
  }

  if (inputDateStr) inputDateStr.addEventListener('input', convertDateToTs);
  if (btnNowDate) {
    btnNowDate.addEventListener('click', () => {
      const now = new Date();
      inputDateStr.value = formatDateTimeLocal(now);
      convertDateToTs();
    });
  }

  // Initialize with current time
  if (inputTs) {
    inputTs.value = Math.floor(Date.now() / 1000).toString();
    convertTsToDate();
  }
  if (inputDateStr) {
    inputDateStr.value = formatDateTimeLocal(new Date());
    convertDateToTs();
  }

  // ==========================================
  // Part 4: CRON Expression Parser & Next 5 Runs
  // ==========================================
  const cronInput = document.getElementById('tc-cron-input');
  const cronPresetSelect = document.getElementById('tc-cron-preset');
  const cronDescText = document.getElementById('tc-cron-desc');
  const cronTableBody = document.getElementById('tc-cron-table-body');
  const cronError = document.getElementById('tc-cron-error');

  function parseCronField(pattern, min, max) {
    // Supports: *, */n, n, n,m, n-m
    const matchAny = (val) => true;

    if (pattern === '*') return matchAny;

    if (pattern.startsWith('*/')) {
      const step = parseInt(pattern.slice(2), 10);
      if (isNaN(step) || step <= 0) return null;
      return (val) => val % step === 0;
    }

    if (pattern.includes(',')) {
      const parts = pattern.split(',').map(p => parseInt(p.trim(), 10));
      return (val) => parts.includes(val);
    }

    if (pattern.includes('-')) {
      const [startStr, endStr] = pattern.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      return (val) => val >= start && val <= end;
    }

    const single = parseInt(pattern, 10);
    if (isNaN(single)) return null;
    return (val) => val === single;
  }

  function describeCron(cronStr) {
    const parts = cronStr.trim().split(/\s+/);
    if (parts.length !== 5) {
      return isEn ? 'Invalid CRON: Must contain exactly 5 space-separated parts' : '无效表达式：标准 CRON 需包含 5 个域';
    }

    const [min, hour, day, month, dow] = parts;

    if (cronStr === '* * * * *') {
      return isEn ? 'Every minute (every 60 seconds)' : '每分钟执行一次';
    }
    if (cronStr === '*/5 * * * *') {
      return isEn ? 'Every 5 minutes' : '每 5 分钟执行一次';
    }
    if (cronStr === '0 * * * *') {
      return isEn ? 'Every hour at minute 0' : '每小时整点执行一次';
    }
    if (cronStr === '0 0 * * *') {
      return isEn ? 'Every day at midnight (00:00)' : '每天午夜 00:00 执行';
    }
    if (cronStr === '0 2 * * *') {
      return isEn ? 'Every day at 02:00 AM' : '每天凌晨 02:00 执行';
    }
    if (cronStr === '30 9 * * 1-5') {
      return isEn ? 'At 09:30 AM, Monday through Friday' : '每周一至周五工作日 09:30 执行';
    }
    if (cronStr === '0 0 1 * *') {
      return isEn ? 'At 00:00 on day 1 of every month' : '每月 1 日午夜 00:00 执行';
    }

    // Dynamic generation
    const timeStr = hour === '*' ? `每小时第 ${min} 分钟` : `${hour}:${pad(min)}`;
    const dayStr = day === '*' ? '' : ` 每月 ${day} 号`;
    const dowStr = dow === '*' ? '' : ` 周 ${dow}`;
    return isEn ? `Runs at ${cronStr}` : `运行设定：${timeStr}${dayStr}${dowStr}`;
  }

  function calculateNextRuns(cronStr) {
    if (cronError) cronError.style.display = 'none';

    const parts = cronStr.trim().split(/\s+/);
    if (parts.length !== 5) {
      if (cronError) {
        cronError.style.display = 'block';
        cronError.textContent = isEn ? 'CRON must have 5 fields (minute hour day month weekday)' : 'CRON 表达式需包含 5 个字段 (分 时 日 月 周)';
      }
      return [];
    }

    const matchMin = parseCronField(parts[0], 0, 59);
    const matchHour = parseCronField(parts[1], 0, 23);
    const matchDay = parseCronField(parts[2], 1, 31);
    const matchMonth = parseCronField(parts[3], 1, 12);
    const matchDow = parseCronField(parts[4], 0, 6); // 0=Sun, 6=Sat

    if (!matchMin || !matchHour || !matchDay || !matchMonth || !matchDow) {
      if (cronError) {
        cronError.style.display = 'block';
        cronError.textContent = isEn ? 'Invalid syntax in CRON fields' : 'CRON 表达式包含无法解析的语法';
      }
      return [];
    }

    const results = [];
    // Start searching from next minute
    let iter = new Date();
    iter.setSeconds(0);
    iter.setMilliseconds(0);
    iter.setMinutes(iter.getMinutes() + 1);

    const maxMinutes = 60 * 24 * 366; // limit to 1 year forward
    let count = 0;

    for (let i = 0; i < maxMinutes && results.length < 5; i++) {
      const min = iter.getMinutes();
      const hour = iter.getHours();
      const day = iter.getDate();
      const month = iter.getMonth() + 1; // 1-indexed
      const dow = iter.getDay(); // 0-6

      if (matchMonth(month) && matchDay(day) && matchDow(dow) && matchHour(hour) && matchMin(min)) {
        results.push(new Date(iter.getTime()));
      }
      iter.setMinutes(iter.getMinutes() + 1);
    }

    return results;
  }

  const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function updateCronView() {
    const expr = cronInput.value.trim();
    if (cronDescText) {
      cronDescText.textContent = describeCron(expr);
    }

    const nextDates = calculateNextRuns(expr);
    if (cronTableBody) {
      if (nextDates.length === 0) {
        cronTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${isEn ? 'No execution times matched in the coming year' : '一年内无匹配触发时刻'}</td></tr>`;
        return;
      }

      cronTableBody.innerHTML = nextDates.map((d, idx) => {
        const weekday = isEn ? WEEKDAYS_EN[d.getDay()] : WEEKDAYS_ZH[d.getDay()];
        const diffSec = Math.floor((d.getTime() - Date.now()) / 1000);
        const relStr = formatRelative(diffSec);

        return `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td><code class="code-highlight">${formatDateTimeLocal(d)}</code></td>
            <td><span class="cron-weekday-tag">${weekday}</span></td>
            <td><span class="cron-rel-tag">${relStr}</span></td>
          </tr>
        `;
      }).join('');
    }
  }

  if (cronInput) cronInput.addEventListener('input', updateCronView);

  if (cronPresetSelect) {
    cronPresetSelect.addEventListener('change', () => {
      const val = cronPresetSelect.value;
      if (val && cronInput) {
        cronInput.value = val;
        updateCronView();
      }
    });
  }

  updateCronView();
}
