import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import PipelinesListPage from './pages/PipelinesListPage'
import PipelineGraphPage from './pages/PipelineGraphPage'
import PipelineAnalyticsPage from './pages/PipelineAnalyticsPage'
import WorkerViewPage from './pages/WorkerViewPage'
import SettingsPage from './pages/SettingsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)

  // Wait for store to rehydrate from localStorage
  if (!hasHydrated) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const basePath = import.meta.env.BASE_URL || '/'

  return (
    <BrowserRouter basename={basePath}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<PipelinesListPage />} />
          <Route path="pipeline/:id" element={<PipelineGraphPage />} />
          <Route path="pipeline/:id/analytics" element={<PipelineAnalyticsPage />} />
          <Route path="pipeline/:id/phase/:phase" element={<WorkerViewPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
