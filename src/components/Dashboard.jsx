import React from 'react';

export default function Dashboard({ pipelines, setPipelines, switchView, loadAssessment, resetAssessment }) {
  const handleDelete = (id) => {
    if (window.confirm('Ali res želite izbrisati ta popis cevovoda?')) {
      setPipelines(pipelines.filter(p => p.id !== id));
    }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <h2 className="page-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>Ocenjeni cevovodi</h2>
        <button className="btn btn-accent" onClick={() => { resetAssessment(); switchView('assessment'); }}>Novo ocenjevanje</button>
      </div>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ime cevovoda</th>
              <th>Datum</th>
              <th>Level</th>
              <th>Rezultat</th>
              <th>Dejanja</th>
            </tr>
          </thead>
          <tbody>
            {pipelines.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Ocenjenih cevovodov še ni.</td></tr>
            ) : (
              pipelines.map(p => {
                const badgeClass = p.level <= 2 ? 'badge-red' : (p.level <= 4 ? 'badge-orange' : 'badge-green');
                const barColor = p.score < 40 ? '#f85149' : (p.score < 75 ? '#d29922' : '#2ea043');
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.date}</td>
                    <td><span className={`badge ${badgeClass}`}>Level {p.level}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--panel-border)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${p.score}%`, height: '100%', background: barColor }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem' }}>{p.score}%</span>
                      </div>
                    </td>
                    <td>
                      <button className="btn" onClick={() => { loadAssessment(p.id); switchView('assessment'); }}>Uredi / Prikaži</button>
                      <button className="btn btn-primary" onClick={() => handleDelete(p.id)} style={{ marginLeft: '5px' }}>Izbriši</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
