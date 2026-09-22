import { createApp } from 'vue';
import App from './App.vue';

export function initToolsApp() {
  const mountEl = document.getElementById('tools-app');
  if (!mountEl) return;

  const lang = mountEl.dataset.lang || (window.location.pathname.startsWith('/en/') ? 'en' : 'zh');
  const app = createApp(App, { lang });
  app.mount(mountEl);
}

// Auto mount if element is already present
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToolsApp);
} else {
  initToolsApp();
}
