<template>
  <div class="vue-toolbox-container">
    <!-- Subnav Tabs Bar with Horizontal Cyber Scroll & Dragging -->
    <div class="toolbox-tabs-nav-wrap">
      <!-- Left Scroll Button -->
      <button
        v-show="canScrollLeft"
        type="button"
        class="tabs-scroll-btn btn-left"
        :aria-label="isEn ? 'Scroll Left' : '向左滑动'"
        @click="scrollTabs('left')"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      <!-- Left Gradient Overflow Indicator -->
      <div v-show="canScrollLeft" class="scroll-shadow shadow-left" aria-hidden="true"></div>

      <!-- Scrollable Tabs Track -->
      <div
        ref="tabsBarRef"
        class="toolbox-tabs-bar"
        :class="{ 'is-dragging': isDragging }"
        role="tablist"
        aria-label="Tool Switcher"
        @scroll="updateScrollState"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
      >
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

      <!-- Right Gradient Overflow Indicator -->
      <div v-show="canScrollRight" class="scroll-shadow shadow-right" aria-hidden="true"></div>

      <!-- Right Scroll Button -->
      <button
        v-show="canScrollRight"
        type="button"
        class="tabs-scroll-btn btn-right"
        :aria-label="isEn ? 'Scroll Right' : '向右滑动'"
        @click="scrollTabs('right')"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
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
import { ref, computed, onMounted, onUnmounted, nextTick, defineAsyncComponent, h } from 'vue';

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
const tabsBarRef = ref(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

const activeComponent = computed(() => {
  const match = tabs.find(t => t.id === currentTab.value);
  return match ? match.comp : MarkdownStudio;
});

// Scroll state checker
function updateScrollState() {
  if (!tabsBarRef.value) return;
  const { scrollLeft, scrollWidth, clientWidth } = tabsBarRef.value;
  canScrollLeft.value = scrollLeft > 4;
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 6;
}

// Arrow Button Scroll
function scrollTabs(direction) {
  if (!tabsBarRef.value) return;
  const delta = direction === 'left' ? -280 : 280;
  tabsBarRef.value.scrollBy({ left: delta, behavior: 'smooth' });
  setTimeout(updateScrollState, 350);
}

// Mouse Wheel Conversion (Y -> X)
function handleWheel(e) {
  if (!tabsBarRef.value) return;
  if (e.deltaY !== 0) {
    e.preventDefault();
    tabsBarRef.value.scrollLeft += e.deltaY;
    updateScrollState();
  }
}

// Mouse Drag to Scroll
let isMouseDown = false;
let startX = 0;
let startScrollLeft = 0;
let draggedDistance = 0;
const isDragging = ref(false);

function handleMouseDown(e) {
  if (!tabsBarRef.value) return;
  isMouseDown = true;
  draggedDistance = 0;
  startX = e.pageX - tabsBarRef.value.offsetLeft;
  startScrollLeft = tabsBarRef.value.scrollLeft;
}

function handleMouseMove(e) {
  if (!isMouseDown || !tabsBarRef.value) return;
  const x = e.pageX - tabsBarRef.value.offsetLeft;
  const walk = x - startX;
  draggedDistance = Math.abs(walk);
  if (draggedDistance > 5) {
    isDragging.value = true;
    tabsBarRef.value.scrollLeft = startScrollLeft - walk;
    updateScrollState();
  }
}

function handleMouseUp() {
  isMouseDown = false;
  setTimeout(() => {
    isDragging.value = false;
    draggedDistance = 0;
  }, 60);
}

function handleMouseLeave() {
  isMouseDown = false;
  isDragging.value = false;
}

function centerActiveTab(tabId) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(`tab-nav-${tabId}`);
  if (el && tabsBarRef.value) {
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    setTimeout(updateScrollState, 350);
  }
}

function selectTab(tabId, updateHash = true) {
  if (isDragging.value || draggedDistance > 5) return;
  currentTab.value = tabId;
  if (updateHash && typeof history !== 'undefined') {
    history.replaceState(null, '', `#${tabId}`);
  }
  nextTick(() => {
    centerActiveTab(tabId);
  });
}

function handleHashChange() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash.replace(/^#/, '');
  if (hash && tabs.some(t => t.id === hash)) {
    currentTab.value = hash;
    nextTick(() => {
      centerActiveTab(hash);
    });
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    const initialHash = window.location.hash.replace(/^#/, '');
    if (initialHash && tabs.some(t => t.id === initialHash)) {
      currentTab.value = initialHash;
    }
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('resize', updateScrollState);

    if (tabsBarRef.value) {
      tabsBarRef.value.addEventListener('wheel', handleWheel, { passive: false });
    }

    nextTick(() => {
      updateScrollState();
      centerActiveTab(currentTab.value);
    });
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('hashchange', handleHashChange);
    window.removeEventListener('resize', updateScrollState);
    if (tabsBarRef.value) {
      tabsBarRef.value.removeEventListener('wheel', handleWheel);
    }
  }
});
</script>

<style scoped>
.vue-toolbox-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.toolbox-tabs-nav-wrap {
  position: relative;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.toolbox-tabs-bar {
  display: flex !important;
  align-items: center;
  flex-wrap: nowrap !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  white-space: nowrap !important;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  overscroll-behavior-x: contain;
  padding: 6px 12px;
  gap: 8px;
  border-radius: 12px;
  background: rgba(14, 17, 26, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(99, 102, 241, 0.5) rgba(255, 255, 255, 0.04);
  cursor: grab;
  user-select: none;
}

.toolbox-tabs-bar.is-dragging {
  cursor: grabbing;
  scroll-behavior: auto !important;
}

.toolbox-tabs-bar::-webkit-scrollbar {
  height: 5px;
  display: block !important;
}

.toolbox-tabs-bar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 999px;
}

.toolbox-tabs-bar::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.5);
  border-radius: 999px;
  transition: background 0.2s ease;
}

.toolbox-tabs-bar::-webkit-scrollbar-thumb:hover {
  background: #818cf8;
}

.tabs-scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(99, 102, 241, 0.5);
  color: #c7d2fe;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6), 0 0 12px rgba(99, 102, 241, 0.35);
  transition: all 0.2s ease;
}

.tabs-scroll-btn:hover {
  background: #6366f1;
  color: #ffffff;
  border-color: #a5b4fc;
  transform: translateY(-50%) scale(1.1);
}

.tabs-scroll-btn.btn-left {
  left: -14px;
}

.tabs-scroll-btn.btn-right {
  right: -14px;
}

@media (max-width: 768px) {
  .tabs-scroll-btn.btn-left {
    left: 4px;
  }
  .tabs-scroll-btn.btn-right {
    right: 4px;
  }
}

.scroll-shadow {
  position: absolute;
  top: 1px;
  bottom: 1px;
  width: 36px;
  pointer-events: none;
  z-index: 5;
  border-radius: 12px;
}

.scroll-shadow.shadow-left {
  left: 0;
  background: linear-gradient(to right, rgba(14, 17, 26, 0.95), transparent);
}

.scroll-shadow.shadow-right {
  right: 0;
  background: linear-gradient(to left, rgba(14, 17, 26, 0.95), transparent);
}

.tool-tab-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--text-muted, #94a3b8);
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.tool-tab-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.12);
}

.tool-tab-btn.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
  color: #ffffff;
  border: 1px solid rgba(99, 102, 241, 0.55);
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.25);
}

.tab-icon {
  flex-shrink: 0;
}

.toolbox-view-wrapper {
  width: 100%;
}
</style>
