import React from 'react';

export default function Builder({ categories, setCategories }) {
  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <h2 className="page-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>Form Builder</h2>
        <button className="btn btn-accent">Add Category</button>
      </div>
      <div className="card">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Uredi kategorije ali elemente.</p>
        {categories.map(cat => (
          <div key={cat.id} className="question-block" style={{ background: 'var(--bg-color)', marginBottom: '10px' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '10px', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-color)', fontSize: '1.1rem' }}>{cat.title}</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button className="btn" title="Add item">+ Item</button>
                <button className="btn" title="Edit Category">✎</button>
              </div>
            </div>
            <div style={{ paddingLeft: '20px', fontSize: '0.9rem' }}>
              {cat.items.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span>{i.label}</span>
                  <span className="badge badge-orange">{i.type === 'yes_no_na' ? 'DA / NE / NA' : 'Text Input'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
