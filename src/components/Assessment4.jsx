import React, { useState, useEffect } from 'react';
import { evaluateAssessment } from '../utils.js';

export default function Assessment4({ isLoggedIn, pipelines, setPipelines, currentAssessment, setCurrentAssessment, currentAssessmentId, categories, rules, switchView }) {
  const [name, setName] = useState('');
  const [repoId, setRepoId] = useState('');
  const [assessor, setAssessor] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (currentAssessmentId) {
      const p = pipelines.find(x => x.id === currentAssessmentId);
      if (p) {
        setName(p.name || ''); setRepoId(p.repoId || ''); setAssessor(p.assessor || '');
        handleCalculate(p.answers);
      }
    } else {
      setName(''); setRepoId(''); setAssessor(''); setResults(null);
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
      if (idx > -1) updatedPipelines[idx] = { ...updatedPipelines[idx], name, repoId, assessor, score: res.score, level: res.level, answers: currentAssessment };
    } else {
      updatedPipelines.push({ id: 'p_' + Date.now(), name, repoId, assessor, date: new Date().toISOString().split('T')[0], score: res.score, level: res.level, answers: currentAssessment });
    }
    setPipelines(updatedPipelines);
    switchView('dashboard');
  };

  return (
    <div>
      <h2 className="page-title">{currentAssessmentId ? 'Uredi ocenjevanje (Verzija 4 - Stranski meni)' : 'Novo ocenjevanje (Verzija 4 - Stranski meni)'}</h2>
      
      <div className="split-layout">
        <div className="form-container">
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label">Ime cevovoda / projekta</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {categories.map((cat, idx) => (
                <button key={cat.id} className={`btn ${activeTab === idx ? 'btn-accent' : ''}`} style={{ textAlign: 'left', padding: '10px' }} onClick={() => setActiveTab(idx)}>{cat.title}</button>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div className="card" style={{ marginTop: 0 }}>
                {categories[activeTab] && (
                  <>
                    <h3 style={{ marginTop: 0, paddingBottom: '10px', borderBottom: '1px solid var(--panel-border)', color: 'var(--accent-color)' }}>{categories[activeTab].title}</h3>
                    {categories[activeTab].items.map(item => (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '8px' }}>{item.label}</div>
                        {item.type === 'yes_no_na' ? (
                          <div style={{ display: 'flex', gap: '20px' }}>
                            {['DA', 'NE', 'NA'].map(opt => (
                              <label key={opt} className="radio-label">
                                <input type="radio" name={`${item.id}_4`} value={opt} checked={currentAssessment[item.id] === opt} onChange={() => handleChange(item.id, opt)} /> {opt === 'DA' ? 'DA, izpolnjujemo' : (opt === 'NE' ? 'NE, še manjka' : '/ Ni relevantno')}
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
