import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './context/UserContext';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';

export default function App() {
  const { user } = useUser();

  return (
    <>
      <div className="grid-bg" />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/lobby" replace /> : <LoginPage />} />
        <Route path="/lobby" element={user ? <LobbyPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
