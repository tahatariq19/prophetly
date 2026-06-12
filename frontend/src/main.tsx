import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import './index.css'
import App from './App.tsx'

// eslint-disable-next-line react-refresh/only-export-components
function ErrorFallback({ error }: { error: unknown }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-zinc-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
          <span>⚠</span> Application Error
        </h1>
        <p className="text-zinc-400 mb-4">The application encountered an unexpected error and could not recover.</p>
        <pre className="bg-zinc-950 p-4 rounded-lg text-sm text-red-300 overflow-auto border border-zinc-800">
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <button
          onClick={() => window.location.href = '/'}
          className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
        >
          Restart Application
        </button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
