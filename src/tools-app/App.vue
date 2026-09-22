<template>
  <div class="vue-toolbox-container">
    <!-- Subnav Tabs Bar -->
    <div class="toolbox-tabs-bar" role="tablist" aria-label="Tool Switcher">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tool-tab-btn"
        :class="{ active: currentTab === tab.id }"
        :id="`tab-nav-${tab.id}`"
        role="tab"
        :aria-selected="currentTab === tab.id"
        :aria-controls="`tool-panel-${tab.id}`"
        @click="selectTab(tab.id)"
      >
        <component :is="tab.icon" class="tab-icon" />
        <span>{{ isEn ? tab.nameEn : tab.nameZh }}</span>
      </button>
    </div>

    <!-- Active Tool View Container with KeepAlive -->
    <div class="toolbox-view-wrapper">
      <KeepAlive>
        <component :is="activeComponent" :lang="lang" :is-en="isEn" :key="currentTab" />
      </KeepAlive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent, h } from 'vue';

const props = defineProps({
  lang: {
    type: String,
    default: 'zh'
  }
});

const isEn = computed(() => props.lang === 'en');

// Lazy-loaded Tool Components
const MarkdownStudio = defineAsyncComponent(() => import('./components/MarkdownStudio.vue'));
const Base64Codec = defineAsyncComponent(() => import('./components/Base64Codec.vue'));
const VramCalculator = defineAsyncComponent(() => import('./components/VramCalculator.vue'));
const TokenCalculator = defineAsyncComponent(() => import('./components/TokenCalculator.vue'));
const JsonStudio = defineAsyncComponent(() => import('./components/JsonStudio.vue'));
const JwtDebugger = defineAsyncComponent(() => import('./components/JwtDebugger.vue'));
const TimeCron = defineAsyncComponent(() => import('./components/TimeCron.vue'));
const UrlStudio = defineAsyncComponent(() => import('./components/UrlStudio.vue'));
const CodeCard = defineAsyncComponent(() => import('./components/CodeCard.vue'));

// Inline SVG Icon components
const IconDoc = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [
  h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
  h('polyline', { points: '14 2 14 8 20 8' }),
  h('line', { x1: 16, y1: 13, x2: 8, y2: 13 }),
  h('line', { x1: 16, y1: 17, x2: 8, y2: 17 })
]);

const IconArrows = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [
  h('polyline', { points: '16 18 22 12 16 6' }),
  h('polyline', { points: '8 6 2 12 8 18' }),
  h('line', { x1: 12, y1: 2, x2: 12, y2: 22 })
]);

const IconCpu = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [
  h('rect', { x: 4, y: 4, width: 16, height: 16, rx: 2 }),
  h('rect', { x: 9, y: 9, width: 6, height: 6 }),
  h('line', { x1: 9, y1: 1, x2: 9, y2: 4 }),
  h('line', { x1: 15, y1: 1, x2: 15, y2: 4 }),
  h('line', { x1: 9, y1: 20, x2: 9, y2: 23 }),
  h('line', { x1: 15, y1: 20, x2: 15, y2: 23 })
]);

const IconToken = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('path', { d: 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8' }),
  h('line', { x1: 12, y1: 6, x2: 12, y2: 8 }),
  h('line', { x1: 12, y1: 16, x2: 12, y2: 18 })
]);

const IconJson = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [
  h('polyline', { points: '16 18 22 12 16 6' }),
  h('polyline', { points: '8 6 2 12 8 18' })
]);

const IconShield = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [
  h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
]);

const IconClock = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('polyline', { points: '12 6 12 12 16 14' })
]);

const IconLink = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [
  h('path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }),
  h('path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' })
]);

const IconImage = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [
  h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2, ry: 2 }),
  h('circle', { cx: 8.5, cy: 8.5, r: 1.5 }),
  h('polyline', { points: '21 15 16 10 5 21' })
]);

const tabs = [
  { id: 'markdown', nameZh: 'Markdown 渲染', nameEn: 'Markdown Studio', icon: IconDoc, comp: MarkdownStudio },
  { id: 'base64', nameZh: 'Base64 互转', nameEn: 'Base64 Codec', icon: IconArrows, comp: Base64Codec },
  { id: 'vram', nameZh: '大模型显存计算', nameEn: 'LLM VRAM Sizer', icon: IconCpu, comp: VramCalculator },
  { id: 'token', nameZh: 'Token 与费用对比', nameEn: 'Token & Cost', icon: IconToken, comp: TokenCalculator },
  { id: 'json', nameZh: 'JSON / TS 转换', nameEn: 'JSON / TS Studio', icon: IconJson, comp: JsonStudio },
  { id: 'jwt', nameZh: 'JWT 离线安全解析', nameEn: 'JWT Debugger', icon: IconShield, comp: JwtDebugger },
  { id: 'cron', nameZh: '时间戳与 CRON', nameEn: 'Timestamp & Cron', icon: IconClock, comp: TimeCron },
  { id: 'url', nameZh: 'URL 参数解析', nameEn: 'URL Parameters', icon: IconLink, comp: UrlStudio },
  { id: 'codecard', nameZh: '代码卡片生成', nameEn: 'Code to Card', icon: IconImage, comp: CodeCard }
];

const currentTab = ref('markdown');

const activeComponent = computed(() => {
  const match = tabs.find(t => t.id === currentTab.value);
  return match ? match.comp : MarkdownStudio;
});

function selectTab(tabId, updateHash = true) {
  currentTab.value = tabId;
  if (updateHash) {
    history.replaceState(null, '', `#${tabId}`);
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash && tabs.some(t => t.id === hash)) {
    currentTab.value = hash;
  }
}

onMounted(() => {
  const initialHash = window.location.hash.replace(/^#/, '');
  if (initialHash && tabs.some(t => t.id === initialHash)) {
    currentTab.value = initialHash;
  }
  window.addEventListener('hashchange', handleHashChange);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', handleHashChange);
});
</script>

<style scoped>
.vue-toolbox-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.toolbox-tabs-bar {
  display: flex;
  overflow-x: auto;
  white-space: nowrap;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  background: rgba(18, 20, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 4px;
  gap: 6px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.toolbox-tabs-bar::-webkit-scrollbar {
  display: none;
}

.tool-tab-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--text-muted, #94a3b8);
  border: none;
  border-radius: 7px;
  padding: 8px 16px;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.tool-tab-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
}

.tool-tab-btn.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%);
  color: #ffffff;
  border: 1px solid rgba(99, 102, 241, 0.45);
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
}

.tab-icon {
  flex-shrink: 0;
}

.toolbox-view-wrapper {
  width: 100%;
}
</style>
