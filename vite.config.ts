import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, _req, _res) => {
              // APIキーをヘッダーに追加
              const apiKey = env.VITE_ANTHROPIC_API_KEY
              if (apiKey) {
                proxyReq.setHeader('x-api-key', apiKey)
                proxyReq.setHeader('anthropic-version', '2023-06-01')
                console.log('Proxy: Added API key header')
              } else {
                console.warn('VITE_ANTHROPIC_API_KEY is not set in environment variables')
              }
            })
            proxy.on('error', (err, _req, _res) => {
              console.error('Proxy error:', err)
            })
          }
        }
      }
    }
  }
})
