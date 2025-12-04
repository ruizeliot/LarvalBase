import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTerminalStore } from '../stores/terminalStore'
import SupervisorSidebar from './SupervisorSidebar'

export default function Layout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const { supervisorSidebarOpen, toggleSupervisorSidebar } = useTerminalStore()

  const handleLogout = async () => {
    const basePath = import.meta.env.BASE_URL || '/'
    const apiPath = `${basePath}api/auth/logout`.replace(/\/+/g, '/')
    try {
      await fetch(apiPath, { method: 'POST' })
    } catch {
      // Ignore logout API errors
    }
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-xl font-bold text-blue-400">
              Pipeline GUI
            </Link>
            <Link
              to="/"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Pipelines
            </Link>
            <Link
              to="/settings"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Settings
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleSupervisorSidebar}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
              data-testid="supervisor-toggle"
            >
              Supervisor
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
              data-testid="logout-button"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>

        {/* Supervisor Sidebar */}
        {supervisorSidebarOpen && <SupervisorSidebar />}
      </div>
    </div>
  )
}
