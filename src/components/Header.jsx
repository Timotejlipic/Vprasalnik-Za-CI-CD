import React from 'react';

export default function Header({ isLoggedIn, user, setIsLoggedIn, setUser }) {
  return (
    <div className="header">
      <div style={{ fontWeight: 500 }}>Ocenjevanje CI/CD cevovodov</div>
      <div className="user-controls">
        <button className="btn">Uvozi</button>
        <button className="btn">Izvozi</button>
        <button className="btn">PDF</button>
        <div style={{ fontSize: '0.9rem', marginLeft: '10px', fontWeight: 600, color: 'var(--accent-color)' }}>
          {isLoggedIn ? `Admin (${user})` : ''}
        </div>
        {isLoggedIn ? (
          <button className="btn btn-primary" onClick={() => { setIsLoggedIn(false); setUser(null); }}>Odjava</button>
        ) : (
          <button className="btn btn-primary" onClick={() => document.getElementById('login-overlay').classList.remove('hidden')}>Prijava</button>
        )}
      </div>
    </div>
  );
}
