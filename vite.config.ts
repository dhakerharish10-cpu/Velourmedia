import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SUPABASE_FUNCTIONS_URL = 'https://dsxsudwjrmwhnpukccly.supabase.co/functions/v1';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/whop-webhook': {
        target: SUPABASE_FUNCTIONS_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/whop-webhook/, '/whop-webhook'),
      },
      '/api/whop-payment': {
        target: SUPABASE_FUNCTIONS_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/whop-payment/, '/whop-payment'),
      },
      '/api/access-links': {
        target: SUPABASE_FUNCTIONS_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/access-links/, '/access-links'),
      },
    },
  },
});
