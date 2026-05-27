import React from 'react';

export default function Header({ toggleSidebar, isSidebarOpen }) {
  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="btn btn-ghost"
          onClick={toggleSidebar}
          style={{ padding: '5px 9px', fontSize: '1.1rem', lineHeight: 1 }}
          title={isSidebarOpen ? 'Zapri stransko vrstico' : 'Odpri stransko vrstico'}
        >
          ☰
        </button>
        <span className="header-title">Ocenjevanje CI/CD cevovodov</span>
      </div>
    </div>
  );
}
