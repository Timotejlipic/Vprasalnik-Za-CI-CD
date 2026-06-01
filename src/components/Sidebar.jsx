import React from 'react';

export default function Sidebar({ currentView, switchView, isLoggedIn, isOpen = true, user, userRole, setAppState, viewType, setViewType, assessmentMeta }) {
  // Dynamically build navigation items based on user role
  const getNavItems = () => {
    if (userRole === 'user') {
      return [{ id: 'user_assessments', label: 'Ocenjevanje cevovoda' }];
    }
    return [
      { id: 'dashboard', label: 'Nadzorna plošča' },
      { id: 'assessment', label: 'Nova ocena' },
    ];
  };

  const getAdminItems = () => {
    if (userRole === 'admin') {
      return [
        { id: 'admin_dashboard', label: 'Admin panel' },
        { id: 'builder', label: 'Form Builder' },
        { id: 'rules', label: 'Pravila zrelosti' },
      ];
    }
    if (userRole === 'user') {
      return []; // standard users have no admin items!
    }
    return [
      { id: 'builder', label: 'Pregled vprašalnika' },
      { id: 'rules', label: 'Pravila zrelosti' },
    ];
  };

  const navItems = getNavItems();
  const adminItems = getAdminItems();

  return (
    <div className={`sidebar ${!isOpen ? 'closed' : ''}`}>
      <div className="brand">
        <span>Maturity<span className="accent">Vault</span></span>
      </div>

      <div className="sidebar-section-label">Navigacija</div>
      <nav className="nav-menu">
        {navItems.map(v => (
          <div
            key={v.id}
            className={`nav-item ${currentView === v.id ? 'active' : ''}`}
            onClick={() => switchView(v.id)}
          >
            {v.label}
          </div>
        ))}
      </nav>

      {isLoggedIn && adminItems.length > 0 && (
        <>
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">
            {userRole === 'admin' ? 'Administracija' : 'Vprašalnik & Pravila'}
          </div>
          <nav className="nav-menu">
            {adminItems.map(v => (
              <div
                key={v.id}
                className={`nav-item ${currentView === v.id ? 'active' : ''}`}
                onClick={() => switchView(v.id)}
              >
                {v.label}
              </div>
            ))}
          </nav>
        </>
      )}



      {currentView === 'assessment' && setViewType && (
        <>
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Izgled</div>
          <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              className={`btn ${viewType === 'collapsible' ? 'btn-accent' : ''}`}
              style={{ fontSize: '0.8rem', textAlign: 'left', width: '100%' }}
              onClick={() => setViewType('collapsible')}
            >
              Skrčljive teme
            </button>
            <button
              className={`btn ${viewType === 'tabs' ? 'btn-accent' : ''}`}
              style={{ fontSize: '0.8rem', textAlign: 'left', width: '100%' }}
              onClick={() => setViewType('tabs')}
            >
              Stranski zavihki
            </button>
          </div>
        </>
      )}

      <div className="sidebar-footer">
        {isLoggedIn ? (
          <>
            <div className="user-avatar">{(user || 'A')[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user}</div>
              <div
                style={{ fontSize: '0.72rem', color: 'var(--accent-color)', cursor: 'pointer' }}
                onClick={() => setAppState && setAppState('landing')}
              >
                Odjava
              </div>
            </div>
          </>
        ) : (
          <>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Gost · </span>
            <span
              style={{ color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.82rem' }}
              onClick={() => setAppState && setAppState('landing')}
            >
              Prijava
            </span>
          </>
        )}
      </div>
    </div>
  );
}
