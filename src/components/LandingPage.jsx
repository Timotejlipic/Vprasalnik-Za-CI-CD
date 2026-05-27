import React, { useState } from 'react';
import { api } from '../api.js';

export default function LandingPage({ enterAsGuest, enterAsAdmin }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState('login'); 

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');

  const openAuth = (tab = 'login') => {
    setAuthTab(tab);
    setLoginError('');
    setRegError('');
    setShowAuth(true);
  };

  const closeAuth = () => {
    setShowAuth(false);
    setLoginError('');
    setRegError('');
  };

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      setLoginError('Izpolnite vsa polja.');
      return;
    }
    try {
      setLoginError('');
      const data = await api.login(loginUsername, loginPassword);
      enterAsAdmin(data.user.username);
    } catch (err) {
      setLoginError(err.message || 'Napačno uporabniško ime ali geslo.');
    }
  };

  const handleRegister = async () => {
    setRegError('');
    if (!regUsername || !regPassword || !regConfirm) {
      setRegError('Izpolnite vsa obvezna polja.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Geslo mora imeti vsaj 6 znakov.');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Gesli se ne ujemata.');
      return;
    }
    try {
      const data = await api.register(regUsername, regPassword);
      enterAsAdmin(data.user.username);
    } catch (err) {
      setRegError(err.message || 'Registracija ni uspela.');
    }
  };

  return (
    <div className="landing-container">
      <div className="landing-nav">
        <div className="brand">
          <span>Maturity<span className="accent">Vault</span></span>
        </div>
        <div className="landing-nav-actions">
          <button className="btn" onClick={() => openAuth('login')}>Prijava</button>
          <button className="btn btn-accent" onClick={() => openAuth('register')}>Registracija</button>
        </div>
      </div>

      <div className="landing-hero">
        <div style={{ marginBottom: '12px' }}>

        </div>
        <h1 className="landing-title">Ocenite CI/CD zrelost<br />vašega projekta</h1>
        <div className="landing-action-box card">
          <button className="btn btn-accent btn-large pulse-animation" onClick={enterAsGuest}>
            ▶ Oceni cevovod zdaj
          </button>
          <p className="landing-warning-text">
            Gost nima možnosti shranjevanja — <span
              style={{ color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => openAuth('login')}
            >prijavite se</span> za shranjevanje rezultatov.
          </p>
        </div>
      </div>

      {showAuth && (
        <div id="login-overlay" onClick={e => { if (e.target === e.currentTarget) closeAuth(); }}>
          <div className="card login-card">
            <div className="auth-tabs">
              <button
                className={`auth-tab-btn ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthTab('login'); setLoginError(''); setRegError(''); }}
              >
                Prijava
              </button>
              <button
                className={`auth-tab-btn ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthTab('register'); setLoginError(''); setRegError(''); }}
              >
                Registracija
              </button>
            </div>

            {authTab === 'login' ? (
              <div>
                <p style={{ marginBottom: '18px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Prijavite se za shranjevanje in upravljanje CI/CD ocenjevanj.
                </p>
                <div className="form-group">
                  <label className="form-label">Uporabniško ime</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="admin"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Geslo</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                {loginError && (
                  <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '14px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                    {loginError}
                  </div>
                )}
                <div className="flex-between" style={{ gap: '10px' }}>
                  <button className="btn btn-ghost" onClick={closeAuth}>Prekliči</button>
                  <button className="btn btn-accent" onClick={handleLogin} style={{ flex: 1 }}>Prijava →</button>
                </div>
                <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Nimaste računa?{' '}
                  <span style={{ color: 'var(--accent-color)', cursor: 'pointer' }} onClick={() => setAuthTab('register')}>
                    Registrirajte se
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '18px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Ustvarite nov račun za dostop do vseh funkcij platforme.
                </p>
                <div className="form-group">
                  <label className="form-label">Uporabniško ime *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="janez.novak"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-poštni naslov</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="janez@podjetje.si"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                  />
                </div>
                <div className="responsive-grid-2" style={{ gap: '12px', marginBottom: '18px' }}>
                  <div>
                    <label className="form-label">Geslo *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Min. 6 znakov"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Potrdi geslo *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="••••••••"
                      value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRegister()}
                    />
                  </div>
                </div>
                {regError && (
                  <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '14px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                    {regError}
                  </div>
                )}
                <div className="flex-between" style={{ gap: '10px' }}>
                  <button className="btn btn-ghost" onClick={closeAuth}>Prekliči</button>
                  <button className="btn btn-accent" onClick={handleRegister} style={{ flex: 1 }}>Ustvari račun →</button>
                </div>
                <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Že imate račun?{' '}
                  <span style={{ color: 'var(--accent-color)', cursor: 'pointer' }} onClick={() => setAuthTab('login')}>
                    Prijavite se
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
