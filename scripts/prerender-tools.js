import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');

export async function getToolsSsgHtml() {
  try {
    // Build SSR bundle with identical root so component scope IDs match client CSS
    await build({
      root: resolve(ROOT, '.temp_build'),
      configFile: false,
      plugins: [(await import('@vitejs/plugin-vue')).default()],
      resolve: {
        alias: {
          '/src': resolve(ROOT, 'src')
        }
      },
      build: {
        ssr: resolve(ROOT, 'src/tools-app/entry-server.js'),
        outDir: resolve(ROOT, '.temp_build/ssr'),
        emptyOutDir: true,
        logLevel: 'error'
      }
    });

    const { renderToolsApp } = await import(resolve(ROOT, '.temp_build/ssr/entry-server.js'));
    const zh = await renderToolsApp('zh');
    const en = await renderToolsApp('en');

    return {
      zhHtml: zh.html,
      enHtml: en.html
    };
  } catch (err) {
    console.warn('⚠️ Vue SSG Pre-rendering warning (falling back to CSR shell):', err.message);
    return {
      zhHtml: '',
      enHtml: ''
    };
  }
}
