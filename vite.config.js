import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

function getVersion() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim().replace(/^v/, '')
  } catch {
    return JSON.parse(readFileSync('./package.json', 'utf-8')).version
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3333'

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(getVersion()),
      __WS_TARGET__: JSON.stringify(apiTarget !== 'http://localhost:3333' ? apiTarget : ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      }
    },
    build: {
      outDir: 'dist'
    }
  }
})
