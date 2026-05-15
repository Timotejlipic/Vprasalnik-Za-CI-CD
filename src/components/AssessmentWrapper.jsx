import React, { useState } from 'react';
import Assessment1 from './Assessment1.jsx';
import Assessment4 from './Assessment4.jsx';

export default function AssessmentWrapper(props) {
  const [viewType, setViewType] = useState('collapsible'); // 'collapsible' ali 'tabs'

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--panel-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--panel-border)', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, padding: '6px 10px' }}>Izgled ocenjevanja:</span>
        <button className={`btn ${viewType === 'collapsible' ? 'btn-accent' : ''}`} onClick={() => setViewType('collapsible')}>
          Skrčljive teme
        </button>
        <button className={`btn ${viewType === 'tabs' ? 'btn-accent' : ''}`} onClick={() => setViewType('tabs')}>
          Stranski zavihki
        </button>
      </div>

      {viewType === 'collapsible' ? (
        <Assessment1 {...props} />
      ) : (
        <Assessment4 {...props} />
      )}
    </div>
  );
}
