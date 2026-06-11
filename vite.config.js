import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, './src'),
    },
  },
  // server: {
  //   allowedHosts: ['my-local-site.test', 'frontend-web.local','https://sententious-nenita-physoclistous.ngrok-free.dev/', 'localhost']
  // },
  // server: {
  //   proxy: {
  //     // Redirects any frontend requests starting with /api to your Express backend
  //     '/api': {
  //       target: env.VITE_API_TARGET, 
  //       changeOrigin: true,
  //       secure: false,
  //     }
  //   }
  // }
  
});
