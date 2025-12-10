import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import LoginView from "./components/LoginView";
import CounterView from "./components/CounterView";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string) => {
    setError(null);
    try {
      // Call real Tauri command - will fail until implemented
      const result = await invoke<boolean>("authenticate", { username, password });
      if (result) {
        setIsLoggedIn(true);
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError(`Login failed: ${err}`);
    }
  };

  const clearError = () => {
    setError(null);
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} error={error} onClearError={clearError} />;
  }

  return <CounterView />;
}

export default App;
