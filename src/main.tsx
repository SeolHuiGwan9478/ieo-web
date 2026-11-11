import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ApiError } from './api/client'
import { AuthProvider } from './auth/AuthContext'
import './index.css'

// 서버에서 받은 데이터의 캐시. 같은 화면을 다시 열면 캐시를 먼저 보여 주고 뒤에서 새로 받는다
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 서버가 4xx로 답한 것(권한 없음, 없는 자료 등)은 다시 불러도 같으니 바로 보여 준다. 연결 실패·5xx만 한 번 더 부른다.
      // 4xx도 다시 부르면 오류가 날 때마다 화면이 1초씩 기다린다
      retry: (failureCount, error) => failureCount < 1 && !(error instanceof ApiError && error.status < 500),
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
