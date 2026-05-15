import React, { useState, useEffect } from 'react';
import { evaluateAssessment } from '../utils.js';

export default function Assessment1({ isLoggedIn, pipelines, setPipelines, currentAssessment, setCurrentAssessment, currentAssessmentId, categories, rules, switchView }) {
  const [name, setName] = useState('');
  const [repoId, setRepoId] = useState('');
  const [assessor, setAssessor] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    // Nalaganje obstoječega cevovoda (način urejanja), sicer ponastavitev na prazen obrazec
    if (currentAssessmentId) {
      const p = pipelines.find(x => x.id === currentAssessmentId);
      if (p) {
        setName(p.name || '');
        setRepoId(p.repoId || '');
        setAssessor(p.assessor || '');
        setRepoLink(p.repoLink || '');
        handleCalculate(p.answers); // Takojšen izračun za obstoječe podatke
      }
    } else {
      setName('');
      setRepoId('');
      setAssessor('');
      setRepoLink('');
      setResults(null);
    }
  }, [currentAssessmentId, pipelines]);

  // Dinamično posodabljanje posameznega odgovora v stanju
  const handleChange = (id, value) => {
    setCurrentAssessment(prev => ({ ...prev, [id]: value }));
  };

  const handleCalculate = (answersToEvaluate = currentAssessment) => {
    const res = evaluateAssessment(answersToEvaluate, categories, rules);
    setResults(res);
  };

  const handleSave = () => {
    if (!isLoggedIn) {
      alert('Za shranjevanje se morate prijaviti.');
      document.getElementById('login-overlay').classList.remove('hidden');
      return;
    }
    if (!name) {
      alert('Prosimo, vnesite ime cevovoda.');
      return;
    }
    const res = evaluateAssessment(currentAssessment, categories, rules);

    let updatedPipelines = [...pipelines];
    if (currentAssessmentId) {
      const idx = updatedPipelines.findIndex(x => x.id === currentAssessmentId);
      if (idx > -1) {
        updatedPipelines[idx] = {
          ...updatedPipelines[idx],
          name, repoId, assessor, repoLink,
          score: res.score, level: res.level, answers: currentAssessment
        };
      }
    } else {
      updatedPipelines.push({
        id: 'p_' + Date.now(),
        name, repoId, assessor, repoLink,
        date: new Date().toISOString().split('T')[0],
        score: res.score, level: res.level, answers: currentAssessment
      });
    }
    setPipelines(updatedPipelines);
    switchView('dashboard');
  };

  return (
    <div>
      <h2 className="page-title">{currentAssessmentId ? 'Uredi ocenjevanje' : 'Novo ocenjevanje CI/CD'}</h2>

      <div className="split-layout">
        <div className="form-container">
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label">Ime cevovoda</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            {categories.map(cat => (
              <details key={cat.id} className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }} open>
                <summary style={{ 
                  background: 'linear-gradient(90deg, rgba(88, 166, 255, 0.1) 0%, var(--panel-bg) 100%)', 
                  padding: '16px 20px', 
                  borderBottom: '1px solid var(--panel-border)', 
                  borderLeft: '4px solid var(--accent-color)',
                  fontWeight: 700, 
                  fontSize: '1.15rem', 
                  color: 'var(--text-primary)',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  listStyle: 'none' 
                }}>
                  {cat.title}
                  <span className="collapse-icon" style={{ transition: 'transform 0.2s', fontSize: '1.2rem', display: 'inline-block' }}>▸</span>
                </summary>
                <div style={{ padding: '10px 20px' }}>
                  {cat.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.9rem', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.label}
                        {item.description && (
                          <span title={item.description} style={{ cursor: 'help', color: 'var(--accent-color)', fontSize: '0.75rem', background: 'rgba(88, 166, 255, 0.15)', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>?</span>
                        )}
                      </div>
                      {item.type === 'yes_no_na' ? (
                        <div style={{ display: 'flex', gap: '15px' }}>
                          {['DA', 'NA'].map(opt => (
                            <label key={opt} className="checkbox-label">
                              <input 
                                type="checkbox" 
                                checked={currentAssessment[item.id] === opt} 
                                onChange={() => handleChange(item.id, currentAssessment[item.id] === opt ? '' : opt)} 
                              />
                              {opt === 'NA' ? '/' : opt}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div style={{ width: '200px' }}>
                          <input type="text" className="form-control" value={currentAssessment[item.id] || ''} onChange={e => handleChange(item.id, e.target.value)} style={{ padding: '4px 8px' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            ))}
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
                <h4>Priporočila</h4>
                <ul>
                  {results.missing.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
