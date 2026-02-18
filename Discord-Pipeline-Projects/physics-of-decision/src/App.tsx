import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './context/UserContext';
import { GraphProvider } from './context/GraphContext';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import PodDefinitionPage from './pages/PodDefinitionPage';

export default function App() {
  const { user } = useUser();

  return (
    <>
      <div className="grid-bg" />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/lobby" replace /> : <LoginPage />} />
        <Route path="/lobby" element={user ? <LobbyPage /> : <Navigate to="/" replace />} />
        <Route
          path="/room/:roomId/definition"
          element={
            user ? (
              <GraphProvider>
                <PodDefinitionPage />
              </GraphProvider>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
