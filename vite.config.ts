import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 개발 서버 포트는 기본 5173. 겹치면 .env(커밋 안 됨)의 VITE_PORT로 바꾼다.
// 서버(ieo-server)의 CORS 허용 주소(ieo.cors.allowed-origins)에 같은 포트가 있어야 한다
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    // tsconfig의 "@/*" 경로를 Vite도 알게 한다 (src/components/ui의 컴포넌트가 쓴다)
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: Number(env.VITE_PORT ?? 5173), strictPort: true },
  }
})
