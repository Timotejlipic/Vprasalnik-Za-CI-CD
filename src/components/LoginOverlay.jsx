import React, { useState } from 'react';

export default function LoginOverlay({ isLoggedIn, setIsLoggedIn, setUser }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');

  const handleLogin = () => {
    setUser(username);
    setIsLoggedIn(true);
  };

  return (
    <div id="login-overlay" className={isLoggedIn ? "hidden" : ""}>
      <div className="card login-card">
        <h3>Prijava administratorja</h3>
        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Prijavite se za shranjevanje in upravljanje CI/CD cevovodov.
        </p>
        <div className="form-group">
          <label className="form-label">Uporabniško ime</label>
          <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Geslo</label>
          <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-accent" style={{ width: '100%' }} onClick={handleLogin}>Prijava</button>
      </div>
    </div>
  );
}
