import React, { useState } from 'react';

export default function LandingPage({ enterAsGuest, enterAsAdmin }) {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');

  const handleLogin = () => {
    enterAsAdmin(username);
  };

  return (
    <div className="landing-container">
      <div className="landing-nav">
        <div className="brand">
          <span>Maturity<span className="accent">Vault</span></span>
        </div>
        <div className="landing-nav-actions">
          <button className="btn" onClick={() => setShowLogin(true)}>Prijava / Registracija</button>
        </div>
      </div>

      <div className="landing-hero">
        <h1 className="landing-title">Ocenite CI/CD zrelost vašega projekta</h1>

        <div className="landing-action-box card">
          <button className="btn btn-accent btn-large pulse-animation" onClick={enterAsGuest}>
            Oceni cevovod zdaj
          </button>
          <p className="landing-warning-text">
            Če želiš shraniti cevovode, se moraš prijaviti.
          </p>
        </div>
      </div>

      {showLogin && (
        <div id="login-overlay">
          <div className="card login-card">
            <h3>Prijava v sistem</h3>
            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Prijavite se za shranjevanje in napredno upravljanje CI/CD cevovodov.
            </p>
            <div className="form-group">
              <label className="form-label">Uporabniško ime</label>
              <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Geslo</label>
              <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="flex-between">
              <button className="btn" onClick={() => setShowLogin(false)}>Prekliči</button>
              <button className="btn btn-accent" onClick={handleLogin}>Prijava</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
