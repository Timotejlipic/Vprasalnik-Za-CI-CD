import React, { useState, useEffect } from 'react';
import { evaluateAssessment } from '../utils.js';

export default function Assessment4({ isLoggedIn, pipelines, setPipelines, currentAssessment, setCurrentAssessment, currentAssessmentId, categories, rules, switchView }) {
  const [name, setName] = useState('');
  const [repoId, setRepoId] = useState('');
  const [assessor, setAssessor] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (currentAssessmentId) {
      const p = pipelines.find(x => x.id === currentAssessmentId);
      if (p) {
        setName(p.name || ''); setRepoId(p.repoId || ''); setAssessor(p.assessor || ''); setRepoLink(p.repoLink || '');
        handleCalculate(p.answers);
      }
    } else {
      setName(''); setRepoId(''); setAssessor(''); setRepoLink(''); setResults(null);
    }
  }, [currentAssessmentId, pipelines]);

  const handleChange = (id, value) => setCurrentAssessment(prev => ({ ...prev, [id]: value }));
  const handleCalculate = (ans = currentAssessment) => setResults(evaluateAssessment(ans, categories, rules));

  const handleSave = () => {
    if (!isLoggedIn) { alert('Za shranjevanje se morate prijaviti.'); return; }
    if (!name) { alert('Prosimo, vnesite ime cevovoda.'); return; }
    const res = evaluateAssessment(currentAssessment, categories, rules);

    let updatedPipelines = [...pipelines];
    if (currentAssessmentId) {
      const idx = updatedPipelines.findIndex(x => x.id === currentAssessmentId);
      if (idx > -1) updatedPipelines[idx] = { ...updatedPipelines[idx], name, repoId, assessor, repoLink, score: res.score, level: res.level, answers: currentAssessment };
    } else {
      updatedPipelines.push({ id: 'p_' + Date.now(), name, repoId, assessor, repoLink, date: new Date().toISOString().split('T')[0], score: res.score, level: res.level, answers: currentAssessment });
    }
    setPipelines(updatedPipelines);
    switchView('dashboard');
  };

  return (
    <div>
      <h2 className="page-title">{currentAssessmentId ? 'Uredi ocenjevanje (Verzija 4 - Stranski meni)' : 'Novo ocenjevanje CI/CD'}</h2>

      <div className="split-layout">
        <div className="form-container">
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label">Ime cevovoda</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="responsive-grid-2" style={{ gap: '15px', marginBottom: '15px' }}>
              <div>
                <label className="form-label">ID repozitorija</label>
                <input type="text" className="form-control" value={repoId} onChange={e => setRepoId(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Ocenjevalec (Ime Priimek)</label>
                <input type="text" className="form-control" value={assessor} onChange={e => setAssessor(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Repozitorij (vstavi link)</label>
              <input type="text" className="form-control" value={repoLink} onChange={e => setRepoLink(e.target.value)} placeholder="https://github.com/..." />
            </div>
          </div>

          <div className="responsive-flex-row">
            <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {categories.map((cat, idx) => (
                <button 
                  key={cat.id} 
                  className={`btn ${activeTab === idx ? 'btn-accent' : ''}`} 
                  style={{ 
                    textAlign: 'left', 
                    padding: '12px 15px', 
                    fontWeight: activeTab === idx ? 700 : 500,
                    borderLeft: activeTab === idx ? '4px solid #fff' : '4px solid transparent',
                    background: activeTab === idx ? 'var(--accent-color)' : 'rgba(255,255,255,0.03)',
                    color: activeTab === idx ? '#fff' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '0 6px 6px 0',
                    transition: 'all 0.2s',
                    boxShadow: activeTab === idx ? '0 2px 8px rgba(88, 166, 255, 0.4)' : 'none'
                  }} 
                  onClick={() => setActiveTab(idx)}
                >
                  {cat.title}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div className="card" style={{ marginTop: 0 }}>
                {categories[activeTab] && (
                  <>
                    <h3 style={{ marginTop: 0, paddingBottom: '10px', borderBottom: '1px solid var(--panel-border)', color: 'var(--accent-color)' }}>{categories[activeTab].title}</h3>
                    {categories[activeTab].items.map(item => (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.label}
                          {item.description && (
                            <span title={item.description} style={{ cursor: 'help', color: 'var(--accent-color)', fontSize: '0.75rem', background: 'rgba(88, 166, 255, 0.15)', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>?</span>
                          )}
                        </div>
                        {item.type === 'yes_no_na' ? (
                          <div style={{ display: 'flex', gap: '20px' }}>
                            {['DA', 'NA'].map(opt => (
                              <label key={opt} className="checkbox-label">
                                <input 
                                  type="checkbox" 
                                  checked={currentAssessment[item.id] === opt} 
                                  onChange={() => handleChange(item.id, currentAssessment[item.id] === opt ? '' : opt)} 
                                /> {opt === 'DA' ? 'DA, izpolnjujemo' : '/ Ni relevantno'}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div><input type="text" className="form-control" value={currentAssessment[item.id] || ''} onChange={e => handleChange(item.id, e.target.value)} style={{ maxWidth: '300px' }} /></div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-accent" onClick={() => handleCalculate(currentAssessment)}>Izračunaj zrelost</button>
            {results && <button className="btn btn-primary" onClick={handleSave}>Shrani ocenjevanje</button>}
          </div>
        </div>

        <div className="results-container">
          {results && (
            <div className="card" style={{ position: 'sticky', top: '80px' }}>
              <h3>Rezultati ocenjevanja</h3>
              <div className="maturity-score" style={{ '--score-color': results.score < 40 ? '#f85149' : (results.score < 75 ? '#d29922' : '#2ea043') }}>
                <div className="score-circle" style={{ '--score': results.score }}>
                  <div className="score-value">{results.score}%</div>
                </div>
                <div className="maturity-level-text">Stopnja {results.level}: {results.levelName}</div>
              </div>
              <div className="missing-items">
                <h4>Priporočila</h4><ul>{results.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
