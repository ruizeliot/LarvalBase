import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { COLORS, AVATARS } from '../types';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);
  const { login } = useUser();
  const navigate = useNavigate();

  const isValid = username.trim().length >= 1 && username.trim().length <= 20;

  const handleSubmit = () => {
    if (!isValid) return;
    login({ username: username.trim(), color: selectedColor, avatar: selectedAvatar });
    navigate('/lobby');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="login-view">
      <div className="login-container">
        <div className="login-logo">
          <h1>POD</h1>
          <p>Physics of Decision</p>
        </div>

        <div className="form-group">
          <label className="form-label">Nom d'utilisateur</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ex: alexis.m"
            maxLength={20}
            autoFocus
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Couleur</label>
          <div className="color-picker">
            {COLORS.map(color => (
              <button
                key={color}
                className={`color-swatch${selectedColor === color ? ' selected' : ''}`}
                style={{ background: color }}
                onClick={() => setSelectedColor(color)}
                type="button"
                aria-label={`Couleur ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Avatar</label>
          <div className="avatar-picker">
            {AVATARS.map(avatar => (
              <button
                key={avatar}
                className={`avatar-icon${selectedAvatar === avatar ? ' selected' : ''}`}
                onClick={() => setSelectedAvatar(avatar)}
                type="button"
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn-primary"
          disabled={!isValid}
          onClick={handleSubmit}
        >
          Entrer dans le Lobby
        </button>
      </div>
    </div>
  );
}
