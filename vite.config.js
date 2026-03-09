import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/index.html'),
        models: resolve(__dirname, 'models/index.html'),
        // Article pages
        'prompt-engineering-guide': resolve(__dirname, 'articles/prompt-engineering-guide/index.html'),
        'ai-trends-2026': resolve(__dirname, 'articles/ai-trends-2026/index.html'),
        'build-ai-agent': resolve(__dirname, 'articles/build-ai-agent/index.html'),
        'rag-in-practice': resolve(__dirname, 'articles/rag-in-practice/index.html'),
        'multimodal-guide': resolve(__dirname, 'articles/multimodal-guide/index.html'),
        'fine-tuning-guide': resolve(__dirname, 'articles/fine-tuning-guide/index.html'),
        'model-comparison-2026': resolve(__dirname, 'articles/model-comparison-2026/index.html'),
      }
    }
  }
})
