import { useState } from "react";

interface LoginViewProps {
  onLogin: (username: string, password: string) => void;
  error: string | null;
  onClearError: () => void;
}

function LoginView({ onLogin, error, onClearError }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    onClearError();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    onClearError();
  };

  return (
    <div className="login-container">
      <h1>Welcome</h1>
      <form data-testid="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            data-testid="username-input"
            value={username}
            onChange={handleUsernameChange}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            data-testid="password-input"
            value={password}
            onChange={handlePasswordChange}
          />
        </div>
        <button type="submit" data-testid="login-button">
          Login
        </button>
        {error && (
          <div className="error-message" data-testid="login-error">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}

export default LoginView;
