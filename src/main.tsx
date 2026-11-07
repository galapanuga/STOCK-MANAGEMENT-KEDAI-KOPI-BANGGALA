import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { PembaruanAplikasi } from './components/PembaruanAplikasi'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <DataProvider>
          <App />
          <PembaruanAplikasi />
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
