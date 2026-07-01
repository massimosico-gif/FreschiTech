import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isWeb = process.env.VITE_WEB_PREVIEW === 'true' || mode === 'web';
  
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: isWeb ? {
        '@tauri-apps/api/core': path.resolve(__dirname, './src/utils/tauriMock.js'),
        '@tauri-apps/api/event': path.resolve(__dirname, './src/utils/tauriMock.js'),
        '@tauri-apps/api/path': path.resolve(__dirname, './src/utils/tauriMock.js'),
        '@tauri-apps/api/window': path.resolve(__dirname, './src/utils/tauriMock.js'),
        '@tauri-apps/api/app': path.resolve(__dirname, './src/utils/tauriMock.js'),
        '@tauri-apps/plugin-fs': path.resolve(__dirname, './src/utils/tauriMock.js'),
        '@tauri-apps/plugin-dialog': path.resolve(__dirname, './src/utils/tauriMock.js'),
        '@tauri-apps/plugin-process': path.resolve(__dirname, './src/utils/tauriMock.js'),
        '@tauri-apps/plugin-updater': path.resolve(__dirname, './src/utils/tauriMock.js'),
      } : {}
    },
    server: {
      port: 3000,
      strictPort: true,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5050',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
