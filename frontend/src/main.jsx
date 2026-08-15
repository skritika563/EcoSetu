import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import './index.css'
import App from './App.jsx'

/**
 * Provider order:
 *   ErrorBoundary — outermost, so it also catches provider failures
 *   ThemeProvider — independent of auth; paints correctly even when signed out
 *   AuthProvider  — everything else depends on it
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
