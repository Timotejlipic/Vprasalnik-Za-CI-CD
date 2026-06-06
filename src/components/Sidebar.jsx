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
    if (userRole === 'user' || userRole === 'member') {
      return []; // invited users and self-registered members have no admin items
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
          <div className="p-[4px_8px] flex flex-col gap-1">
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
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[0.82rem] text-[var(--text-primary)] overflow-hidden text-ellipsis whitespace-nowrap">{user}</div>
              <div
                className="text-[0.72rem] text-[var(--accent-color)] cursor-pointer"
                onClick={() => setAppState && setAppState('landing')}
              >
                Odjava
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="text-[0.82rem] text-[var(--text-secondary)]">Gost · </span>
            <span
              className="text-[var(--accent-color)] cursor-pointer text-[0.82rem]"
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
