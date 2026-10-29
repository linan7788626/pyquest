import { defineConfig } from 'vite';
import { prepareRuntimeAssets, runtimeDir } from './scripts/lib/runtime-assets.mjs';
export default defineConfig(async () => {
  await prepareRuntimeAssets();
  return {
    base: './', publicDir: runtimeDir,
    server: { host: true, port: 5173 },
    build: { chunkSizeWarningLimit: 1500 },
  };
});
