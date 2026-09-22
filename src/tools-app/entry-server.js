import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import App from './App.vue';

export async function renderToolsApp(lang = 'zh') {
  const app = createSSRApp(App, { lang });
  const html = await renderToString(app);
  return { html };
}
