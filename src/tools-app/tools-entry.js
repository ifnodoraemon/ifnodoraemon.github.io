import { createSSRApp } from 'vue';
import App from './App.vue';

export function initToolsApp() {
  const mountEl = document.getElementById('tools-app');
  if (!mountEl) return;

  const lang = mountEl.dataset.lang || (window.location.pathname.startsWith('/en/') ? 'en' : 'zh');
  const app = createSSRApp(App, { lang });
  app.mount(mountEl);
}

// Auto mount / hydrate if element is already present
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToolsApp);
} else {
  initToolsApp();
}
