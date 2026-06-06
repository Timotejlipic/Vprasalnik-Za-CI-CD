import React, { useState } from 'react';
import { api } from '../api.js';

export default function LandingPage({ enterAsGuest, enterAsAdmin, initialShowLogin, prefillEmail, setPasswordEmail, clearSetPasswordEmail }) {
  const [showAuth, setShowAuth] = React.useState(initialShowLogin || false);
  const [authTab, setAuthTab] = React.useState('login'); // 'login' | 'register'

  // Login state
  const [loginUsername, setLoginUsername] = React.useState(prefillEmail || '');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');

  // Register state
  const [regUsername, setRegUsername] = React.useState('');
  const [regEmail, setRegEmail] = React.useState(prefillEmail || '');
  const [regPassword, setRegPassword] = React.useState('');
  const [regConfirm, setRegConfirm] = React.useState('');
  const [regError, setRegError] = React.useState('');

  // Set password state
  const [newPasswordVal, setNewPasswordVal] = React.useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = React.useState('');
  const [setPasswordError, setSetPasswordError] = React.useState('');
  const [setPasswordSuccess, setSetPasswordSuccess] = React.useState(false);

  React.useEffect(() => {
    if (initialShowLogin) {
      setShowAuth(true);
    }
    if (prefillEmail) {
      setLoginUsername(prefillEmail);
      setRegEmail(prefillEmail);
    }
    if (setPasswordEmail) {
      setAuthTab('set_password');
      setShowAuth(true);
    }
  }, [initialShowLogin, prefillEmail, setPasswordEmail]);

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
    setSetPasswordError('');
    if (clearSetPasswordEmail) clearSetPasswordEmail();
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
      const data = await api.register(regUsername, regEmail, regPassword);
      enterAsAdmin(data.user.username);
    } catch (err) {
      setRegError(err.message || 'Registracija ni uspela.');
    }
  };

  const handleSetPassword = async () => {
    setSetPasswordError('');
    if (!newPasswordVal || !confirmPasswordVal) {
      setSetPasswordError('Izpolnite vsa obvezna polja.');
      return;
    }
    if (newPasswordVal.length < 6) {
      setSetPasswordError('Geslo mora imeti vsaj 6 znakov.');
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      setSetPasswordError('Gesli se ne ujemata.');
      return;
    }
    try {
      await api.setUserPassword(setPasswordEmail, newPasswordVal);
      setSetPasswordSuccess(true);
      setTimeout(() => {
        setAuthTab('login');
        setLoginUsername(setPasswordEmail);
        setSetPasswordSuccess(false);
        setNewPasswordVal('');
        setConfirmPasswordVal('');
        if (clearSetPasswordEmail) clearSetPasswordEmail();
      }, 2000);
    } catch (err) {
      setSetPasswordError(err.message || 'Nastavitev gesla ni uspela.');
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
              {authTab === 'set_password' ? (
                <div style={{ padding: '10px', fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-color)', textAlign: 'center', width: '100%' }}>
                  Nastavitev gesla
                </div>
              ) : (
                <>
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
                </>
              )}
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
            ) : authTab === 'register' ? (
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
            ) : (
              <div>
                <p style={{ marginBottom: '18px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Nastavite svoje novo geslo za e-poštni naslov <strong>{setPasswordEmail}</strong>.
                </p>
                {setPasswordSuccess ? (
                  <div style={{ color: '#2ea043', background: 'rgba(46,160,67,0.1)', padding: '12px', borderRadius: '6px', textAlign: 'center', marginBottom: '14px' }}>
                    Geslo je bilo uspešno nastavljeno! Preusmerjanje na prijavo...
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Novo geslo *</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Vsaj 6 znakov"
                        value={newPasswordVal}
                        onChange={e => setNewPasswordVal(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Potrdi novo geslo *</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="••••••••"
                        value={confirmPasswordVal}
                        onChange={e => setConfirmPasswordVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                      />
                    </div>
                    {setPasswordError && (
                      <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '14px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                        {setPasswordError}
                      </div>
                    )}
                    <div className="flex-between" style={{ gap: '10px' }}>
                      <button className="btn btn-ghost" onClick={closeAuth}>Prekliči</button>
                      <button className="btn btn-accent" onClick={handleSetPassword} style={{ flex: 1 }}>Nastavi geslo →</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
