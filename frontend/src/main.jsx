import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import './index.css'
// Leaflet's own stylesheet — needed once, globally, for every MapView
// instance (tile layout, marker positioning, zoom controls). Imported here
// rather than per-component so it's never accidentally duplicated or
// forgotten on a page that adds its own map later.
import 'leaflet/dist/leaflet.css'
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
