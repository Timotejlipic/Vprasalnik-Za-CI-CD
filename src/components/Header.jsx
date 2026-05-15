import React from 'react';

export default function Header({ isLoggedIn, user, setIsLoggedIn, setUser, setAppState, toggleSidebar, isSidebarOpen }) {
  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button className="btn" onClick={toggleSidebar} style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>☰</span>
        </button>
        <div style={{ fontWeight: 500 }}>Ocenjevanje CI/CD cevovodov</div>
      </div>
      <div className="user-controls">
        <button className="btn">Uvozi</button>
        <button className="btn">Izvozi</button>
        <button className="btn">PDF</button>
        <div style={{ fontSize: '0.9rem', marginLeft: '10px', fontWeight: 600, color: 'var(--accent-color)' }}>
          {isLoggedIn ? `Admin (${user})` : ''}
        </div>
        {isLoggedIn ? (
          <button className="btn btn-primary" onClick={() => { setIsLoggedIn(false); setUser(null); setAppState('landing'); }}>Odjava</button>
        ) : (
          <button className="btn btn-primary" onClick={() => setAppState('landing')}>Prijava</button>
        )}
      </div>
    </div>
  );
}
