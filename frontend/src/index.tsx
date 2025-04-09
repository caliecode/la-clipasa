import React from 'react'
import App from './App'
import './index.css'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from 'src/react-query'

import './i18n'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient} /**persistOptions={{ persister }} */>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
