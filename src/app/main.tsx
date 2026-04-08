import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import '@/shared/styles/global.css'
import { App } from './router'
import { AuthProvider } from '@/shared/contexts'

// Configuración del QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
        <ReactQueryDevtools initialIsOpen={true} />
      </AuthProvider>
    </QueryClientProvider>
  //</StrictMode>,
)
