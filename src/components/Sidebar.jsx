import React from 'react';

export default function Sidebar({ currentView, switchView }) {
  const views = [
    { id: 'dashboard', label: 'Nadzorna plošča' },
    { id: 'assessment', label: 'Nova ocena 1' },
    { id: 'assessment2', label: 'Nova ocena 2' },
    { id: 'assessment3', label: 'Nova ocena 3' },
    { id: 'assessment4', label: 'Nova ocena 4' },
    { id: 'builder', label: 'Form Builder' },
    { id: 'rules', label: 'Pravila zrelosti' },
  ];

  return (
    <div className="sidebar">
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
