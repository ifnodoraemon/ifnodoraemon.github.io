<template>
  <div class="terminal-window cron-window" id="cron-tool-app">
    <div class="terminal-header">
      <div class="terminal-dots">
        <span class="dot close"></span>
        <span class="dot minimize"></span>
        <span class="dot expand"></span>
      </div>
      <div class="terminal-title">Runtime: cron_scheduler.sh --timezone=Asia/Shanghai</div>
      <div class="terminal-actions">
        <span class="status-indicator live"><span class="status-pulse"></span>LIVE TICKING</span>
      </div>
    </div>

    <div class="tool-app-body cron-layout">
      <!-- Live Ticking Timestamp Banner -->
      <div class="live-clock-banner">
        <div class="clock-item">
          <span class="clock-label">{{ isEn ? 'Current Seconds (10-digit):' : '当前 Unix 时间戳 (秒级)：' }}</span>
          <strong class="clock-num">{{ currentSeconds }}</strong>
          <button type="button" class="tool-btn btn-secondary btn-sm" @click="copyVal(currentSeconds, 'Seconds')">{{ isEn ? 'Copy' : '复制' }}</button>
        </div>
        <div class="clock-item">
          <span class="clock-label">{{ isEn ? 'Milliseconds (13-digit):' : '毫秒级时间戳 (毫秒)：' }}</span>
          <strong class="clock-num highlight">{{ currentMs }}</strong>
          <button type="button" class="tool-btn btn-secondary btn-sm" @click="copyVal(currentMs, 'Milliseconds')">{{ isEn ? 'Copy' : '复制' }}</button>
        </div>
      </div>

      <!-- Dual Timestamp Converters -->
      <div class="converters-grid">
        <!-- Timestamp -> Date -->
        <div class="card-box">
          <h3 class="card-title">{{ isEn ? 'Timestamp ➔ Datetime' : '时间戳 ➔ 本地时间 / UTC' }}</h3>
          <div class="input-row">
            <input v-model="inputTs" type="text" class="cyber-input" placeholder="e.g. 1774000000">
            <button type="button" class="tool-btn btn-secondary btn-sm" @click="inputTs = String(currentSeconds)">{{ isEn ? 'Now' : '当前' }}</button>
          </div>
          <div class="result-list">
            <div class="result-row">
              <span>{{ isEn ? 'Local / Beijing (UTC+8):' : '本地 / 北京时间：' }}</span>
              <strong class="text-accent">{{ tsConverted.local }}</strong>
            </div>
            <div class="result-row">
              <span>ISO 8601 (UTC):</span>
              <code>{{ tsConverted.utc }}</code>
            </div>
            <div class="result-row">
              <span>{{ isEn ? 'Relative Distance:' : '相对距离：' }}</span>
              <span>{{ tsConverted.relative }}</span>
            </div>
          </div>
        </div>

        <!-- Date -> Timestamp -->
        <div class="card-box">
          <h3 class="card-title">{{ isEn ? 'Datetime ➔ Timestamp' : '日期时间 ➔ Unix 时间戳' }}</h3>
          <div class="input-row">
            <input v-model="inputDate" type="text" class="cyber-input" placeholder="2026-09-22 16:00:00">
            <button type="button" class="tool-btn btn-secondary btn-sm" @click="setNowDate">{{ isEn ? 'Now' : '当前' }}</button>
          </div>
          <div class="result-list">
            <div class="result-row">
              <span>{{ isEn ? 'Unix Seconds:' : '秒级时间戳 (10 位)：' }}</span>
              <strong class="text-accent">{{ dateConverted.sec }}</strong>
            </div>
            <div class="result-row">
              <span>{{ isEn ? 'Milliseconds:' : '毫秒级时间戳 (13 位)：' }}</span>
              <code>{{ dateConverted.ms }}</code>
            </div>
          </div>
        </div>
      </div>

      <!-- CRON Expression Studio -->
      <div class="cron-section">
        <div class="cron-header">
          <h3 class="card-title">{{ isEn ? 'CRON Expression Visualizer & Next Runs' : 'CRON 表达式可视化解析与下 5 次触发时刻推演' }}</h3>
          <div class="presets-row">
            <label class="field-label">{{ isEn ? 'Presets:' : '常用预设：' }}</label>
            <select v-model="cronExpr" class="cyber-select preset-select">
              <option value="* * * * *">{{ isEn ? 'Every minute (* * * * *)' : '每分钟 (* * * * *)' }}</option>
              <option value="*/5 * * * *">{{ isEn ? 'Every 5 minutes (*/5 * * * *)' : '每 5 分钟 (*/5 * * * *)' }}</option>
              <option value="0 * * * *">{{ isEn ? 'Hourly on the hour (0 * * * *)' : '每小时整点 (0 * * * *)' }}</option>
              <option value="0 2 * * *">{{ isEn ? 'Daily at 02:00 AM (0 2 * * *)' : '每天凌晨 02:00 (0 2 * * *)' }}</option>
              <option value="0 0 * * *">{{ isEn ? 'Daily at midnight (0 0 * * *)' : '每天午夜 00:00 (0 0 * * *)' }}</option>
              <option value="30 9 * * 1-5">{{ isEn ? 'Weekdays at 09:30 AM (30 9 * * 1-5)' : '工作日 09:30 (30 9 * * 1-5)' }}</option>
              <option value="0 0 1 * *">{{ isEn ? 'Monthly on the 1st (0 0 1 * *)' : '每月 1 日午夜 (0 0 1 * *)' }}</option>
            </select>
          </div>
        </div>

        <div class="cron-input-row">
          <input v-model="cronExpr" type="text" class="cyber-input cron-input-field">
          <div class="cron-desc-box">{{ cronDescription }}</div>
        </div>

        <div v-if="cronError" class="error-banner">
          ⚠️ {{ cronError }}
        </div>

        <!-- Next 5 runs table -->
        <div class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th>{{ isEn ? 'Order' : '序次' }}</th>
                <th>{{ isEn ? 'Scheduled Trigger Time (Local)' : '计划触发时间 (本地时间)' }}</th>
                <th>{{ isEn ? 'Day of Week' : '星期' }}</th>
                <th>{{ isEn ? 'Countdown' : '倒计时' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(run, idx) in nextFiveRuns" :key="idx">
                <td><strong>#{{ idx + 1 }}</strong></td>
                <td><code class="code-tag">{{ run.formatted }}</code></td>
                <td><span class="weekday-badge">{{ run.weekday }}</span></td>
                <td><span class="rel-countdown">{{ run.relative }}</span></td>
              </tr>
              <tr v-if="nextFiveRuns.length === 0">
                <td colspan="4" class="text-center text-muted">{{ isEn ? 'No execution times matched in the coming year' : '一年内无匹配触发时刻' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="toastMsg" class="toast-popup">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  lang: { type: String, default: 'zh' },
  isEn: { type: Boolean, default: false }
});

const currentSeconds = ref(Math.floor(Date.now() / 1000));
const currentMs = ref(Date.now());
const inputTs = ref(String(Math.floor(Date.now() / 1000)));
const inputDate = ref('');
const cronExpr = ref('0 2 * * *');
const toastMsg = ref('');

let timer = null;
onMounted(() => {
  timer = setInterval(() => {
    const now = Date.now();
    currentSeconds.value = Math.floor(now / 1000);
    currentMs.value = now;
  }, 500);
  setNowDate();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function showToast(msg) {
  toastMsg.value = msg;
  setTimeout(() => { toastMsg.value = ''; }, 2000);
}

function copyVal(val, label) {
  navigator.clipboard.writeText(String(val)).then(() => {
    showToast(props.isEn ? `Copied ${label}` : `已复制 ${label}`);
  });
}

function pad(n) { return n < 10 ? '0' + n : n; }

function formatLocal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function setNowDate() {
  inputDate.value = formatLocal(new Date());
}

function formatRelDiff(diffSec) {
  const abs = Math.abs(diffSec);
  const suffix = diffSec < 0 ? (props.isEn ? ' ago' : '前') : (props.isEn ? '' : '后');
  const prefix = diffSec < 0 ? '' : (props.isEn ? 'in ' : '');

  if (abs < 60) return props.isEn ? `${abs}s${suffix}` : `${abs} 秒${suffix}`;
  if (abs < 3600) {
    const m = Math.floor(abs / 60);
    return props.isEn ? `${prefix}${m}m${suffix}` : `${m} 分钟${suffix}`;
  }
  if (abs < 86400) {
    const h = Math.floor(abs / 3600);
    return props.isEn ? `${prefix}${h}h${suffix}` : `${h} 小时${suffix}`;
  }
  const d = Math.floor(abs / 86400);
  return props.isEn ? `${prefix}${d}d${suffix}` : `${d} 天${suffix}`;
}

const tsConverted = computed(() => {
  const val = inputTs.value.trim();
  if (!val) return { local: '-', utc: '-', relative: '-' };
  let num = parseInt(val, 10);
  if (isNaN(num)) return { local: 'Invalid', utc: '-', relative: '-' };
  if (val.length <= 10) num *= 1000;

  const d = new Date(num);
  if (isNaN(d.getTime())) return { local: 'Invalid Date', utc: '-', relative: '-' };

  const diffSec = Math.floor((num - Date.now()) / 1000);
  return {
    local: formatLocal(d),
    utc: d.toISOString(),
    relative: formatRelDiff(diffSec)
  };
});

const dateConverted = computed(() => {
  const val = inputDate.value.trim();
  if (!val) return { sec: '-', ms: '-' };
  const d = new Date(val.replace(' ', 'T'));
  if (isNaN(d.getTime())) return { sec: 'Invalid Date', ms: '-' };

  const ms = d.getTime();
  return {
    sec: Math.floor(ms / 1000),
    ms
  };
});

// CRON logic
const cronDescription = computed(() => {
  const expr = cronExpr.value.trim();
  if (expr === '* * * * *') return props.isEn ? 'Every minute (every 60 seconds)' : '每分钟执行一次';
  if (expr === '*/5 * * * *') return props.isEn ? 'Every 5 minutes' : '每 5 分钟执行一次';
  if (expr === '0 * * * *') return props.isEn ? 'Every hour on the hour' : '每小时整点执行一次';
  if (expr === '0 2 * * *') return props.isEn ? 'Daily at 02:00 AM' : '每天凌晨 02:00 执行';
  if (expr === '0 0 * * *') return props.isEn ? 'Daily at midnight (00:00)' : '每天午夜 00:00 执行';
  if (expr === '30 9 * * 1-5') return props.isEn ? 'At 09:30 AM, Monday through Friday' : '工作日周一至周五 09:30 执行';
  if (expr === '0 0 1 * *') return props.isEn ? 'Monthly on the 1st at midnight' : '每月 1 日午夜 00:00 执行';
  return props.isEn ? `Custom Schedule: ${expr}` : `自定义执行表达式：${expr}`;
});

const cronParsed = computed(() => {
  const parts = cronExpr.value.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { error: props.isEn ? 'CRON must have 5 fields' : 'CRON 需包含 5 个域 (分 时 日 月 周)', runs: [] };
  }

  const parseField = (pattern) => {
    if (pattern === '*') return () => true;
    if (pattern.startsWith('*/')) {
      const step = parseInt(pattern.slice(2), 10);
      return !isNaN(step) && step > 0 ? (v) => v % step === 0 : null;
    }
    if (pattern.includes(',')) {
      const set = new Set(pattern.split(',').map(p => parseInt(p.trim(), 10)));
      return (v) => set.has(v);
    }
    if (pattern.includes('-')) {
      const [start, end] = pattern.split('-').map(p => parseInt(p, 10));
      return (v) => v >= start && v <= end;
    }
    const single = parseInt(pattern, 10);
    return !isNaN(single) ? (v) => v === single : null;
  };

  const mMin = parseField(parts[0]);
  const mHour = parseField(parts[1]);
  const mDay = parseField(parts[2]);
  const mMonth = parseField(parts[3]);
  const mDow = parseField(parts[4]);

  if (!mMin || !mHour || !mDay || !mMonth || !mDow) {
    return { error: props.isEn ? 'Invalid CRON field syntax' : '包含无法解析的字段语法', runs: [] };
  }

  const runs = [];
  let iter = new Date();
  iter.setSeconds(0);
  iter.setMilliseconds(0);
  iter.setMinutes(iter.getMinutes() + 1);

  const maxMinutes = 60 * 24 * 366;
  const W_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const W_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < maxMinutes && runs.length < 5; i++) {
    const min = iter.getMinutes();
    const hour = iter.getHours();
    const day = iter.getDate();
    const month = iter.getMonth() + 1;
    const dow = iter.getDay();

    if (mMonth(month) && mDay(day) && mDow(dow) && mHour(hour) && mMin(min)) {
      const dCopy = new Date(iter.getTime());
      runs.push({
        formatted: formatLocal(dCopy),
        weekday: props.isEn ? W_EN[dow] : W_ZH[dow],
        relative: formatRelDiff(Math.floor((dCopy.getTime() - Date.now()) / 1000))
      });
    }
    iter.setMinutes(iter.getMinutes() + 1);
  }

  return { error: '', runs };
});

const cronError = computed(() => cronParsed.value.error);
const nextFiveRuns = computed(() => cronParsed.value.runs);
</script>

<style scoped>
.cron-window {
  background: rgba(10, 12, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
}

.cron-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
}

.live-clock-banner {
  display: flex;
  gap: 2rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  flex-wrap: wrap;
}

.clock-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.clock-label {
  font-size: 0.85rem;
  color: var(--text-muted, #94a3b8);
}

.clock-num {
  font-family: var(--font-mono, monospace);
  font-size: 1.25rem;
  color: #f1f5f9;
}

.clock-num.highlight {
  color: #38bdf8;
}

.converters-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.card-box {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  color: #f1f5f9;
}

.input-row {
  display: flex;
  gap: 8px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
  font-family: var(--font-mono, monospace);
}

.result-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding-bottom: 6px;
}

.text-accent {
  color: #38bdf8;
}

.cron-section {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cron-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.presets-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-select {
  width: auto;
  min-width: 220px;
}

.cron-input-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.cron-input-field {
  max-width: 220px;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.cron-desc-box {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  color: #c7d2fe;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.88rem;
  flex: 1;
}

.error-banner {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 6px;
  color: #fca5a5;
  font-size: 0.82rem;
  font-family: var(--font-mono, monospace);
}

.code-tag {
  color: #38bdf8;
}

.weekday-badge {
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.78rem;
}

.rel-countdown {
  color: #818cf8;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
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
  .converters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
