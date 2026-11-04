import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

let mcpVersion = '1.2.5';
try {
  const mcpPkgPath = path.resolve(__dirname, '../mcp-server/package.json');
  if (fs.existsSync(mcpPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(mcpPkgPath, 'utf8'));
    if (pkg.version) mcpVersion = pkg.version;
  }
} catch {
  // Safe fallback for isolated container builds
}

export default defineConfig({
  define: {
    __MCP_SERVER_VERSION__: JSON.stringify(mcpVersion),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
