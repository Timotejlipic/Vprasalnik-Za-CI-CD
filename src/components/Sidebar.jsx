import React from 'react';

export default function Sidebar({ currentView, switchView, isLoggedIn, isOpen = true }) {
  const views = [
    { id: 'dashboard', label: 'Nadzorna plošča' },
    { id: 'assessment', label: 'Nova ocena' }
  ];

  if (isLoggedIn) {
    views.push({ id: 'builder', label: 'Form Builder' });
    views.push({ id: 'rules', label: 'Pravila zrelosti' });
  }

  return (
    <div className={`sidebar ${!isOpen ? 'closed' : ''}`}>
      <div className="brand">
        <span>Maturity<span className="accent">Vault</span></span>
      </div>
      <div className="nav-menu">
        {views.map(v => (
          <div
            key={v.id}
            className={`nav-item ${currentView === v.id ? 'active' : ''}`}
            onClick={() => switchView(v.id)}
          >
            <span>{v.icon}</span> {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}
