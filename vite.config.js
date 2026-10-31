import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public', // 运行时素材（/nli-preview/... 由 public/nli-preview 提供；浏览器 URL 不变）
  server: {
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
