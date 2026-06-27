import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // lắng nghe mọi interface (cần cho tunnel)
    // Cho phép truy cập qua Cloudflare Tunnel (*.trycloudflare.com) — nếu không
    // Vite sẽ chặn với lỗi "Blocked request. This host is not allowed".
    allowedHosts: ['.trycloudflare.com'],
  },
});
