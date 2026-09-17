import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'assets', // CC0 素材（/cc0/... 运行时可访问）；TinySwordsFreePack 在 .gitignore 单独排除
  server: {
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
