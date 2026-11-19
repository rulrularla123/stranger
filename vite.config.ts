import { defineConfig, type ViteDevServer } from 'vite';
// @ts-expect-error ESM JS server module
import { attachWsRoomHub } from './server/wsRoomHub.mjs';

function strangerWsPlugin() {
  return {
    name: 'stranger-ws-hub',
    configureServer(server: ViteDevServer) {
      if (server.httpServer) {
        attachWsRoomHub(server.httpServer);
      }
    },
  };
}

export default defineConfig({
  plugins: [strangerWsPlugin()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
