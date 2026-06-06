import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api.js';
import { openResultsInNewWindow } from '../utils.js';

export default function UserAssessments({ user, isLoggedIn, switchView, startAssessmentForRepo, onPreviewAnswers }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Results details modal state
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);

  // Account upgrade (invited "user" -> registered "member")
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgPassword, setUpgPassword] = useState('');
  const [upgConfirm, setUpgConfirm] = useState('');
  const [upgError, setUpgError] = useState('');
  const [upgLoading, setUpgLoading] = useState(false);

  const loggedInUser = api.getCurrentUser();

  const handleUpgrade = async () => {
    setUpgError('');
    if (!upgPassword || !upgConfirm) { setUpgError('Izpolnite obe polji.'); return; }
    if (upgPassword.length < 6) { setUpgError('Geslo mora imeti vsaj 6 znakov.'); return; }
    if (upgPassword !== upgConfirm) { setUpgError('Gesli se ne ujemata.'); return; }
    setUpgLoading(true);
    try {
      await api.upgradeAccount(upgPassword);
      // New "member" session is stored; reload so the app re-initialises on the
      // dashboard with the upgraded role.
      window.location.reload();
    } catch (err) {
      setUpgError(err.message || 'Nadgradnja ni uspela.');
      setUpgLoading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!loggedInUser) return;
      setLoading(true);
      try {
        const data = await api.getUserAssignments(loggedInUser.id);
        const catsData = await api.getCategories();
        setCategories(catsData || []);
        
        const rulesData = await api.getRules();
        setRules(rulesData || []);

        // Dynamic synchronization with user's saved pipelines (online & offline)
        let assignmentsData = data || [];
        try {
          const pipelinesData = await api.getPipelines();
          const pipelinesList = pipelinesData || [];
          
          let changed = false;
          const normalizeRepo = (u) => (u || '').trim().toLowerCase()
            .replace(/^(https?:\/\/)?(www\.)?github\.com\//, '')
            .replace(/\.git$/, '')
            .replace(/\/$/, '');

          const syncedAssignments = assignmentsData.map(asg => {
            if (asg.status === 'completed') return asg;
            
            // Find if there is a matching pipeline saved for this repository
            const matchingPipe = pipelinesList.find(p => 
              normalizeRepo(p.repoLink) === normalizeRepo(asg.repoLink)
            );
            
            if (matchingPipe) {
              changed = true;
              return {
                ...asg,
                status: 'completed',
                score: matchingPipe.score || 0,
                level: matchingPipe.level || 1,
                pipelineId: matchingPipe.id,
                answers: matchingPipe.answers || null,
                completedAt: matchingPipe.date || new Date().toISOString().split('T')[0]
              };
            }
            return asg;
          });

          if (changed) {
            const allAssignments = JSON.parse(localStorage.getItem('cicdq_offline_assignments')) || [];
            syncedAssignments.forEach(synced => {
              const idx = allAssignments.findIndex(a => a.id === synced.id);
              if (idx > -1) {
                allAssignments[idx] = synced;
              }
            });
            localStorage.setItem('cicdq_offline_assignments', JSON.stringify(allAssignments));
            assignmentsData = syncedAssignments;
          }
        } catch (pipelineErr) {
          console.warn('Failed to sync assignments with pipelines:', pipelineErr);
        }

        setAssignments(assignmentsData);
      } catch (err) {
        console.error('Failed to load assignments:', err);
      }
      setLoading(false);
    }
    loadData();
  }, [isLoggedIn, user]);

  const viewResults = async (asgn) => {
    if (!asgn.answers) return;
    try {
      const results = await api.evaluate(asgn.answers, categories, rules);
      if (onPreviewAnswers) {
        onPreviewAnswers({
          answers: asgn.answers,
          version: asgn.formVersion || '1.0',
          rulesVersion: asgn.rulesVersion || '1.0',
          name: asgn.repoName || asgn.repoLink || ''
        });
      } else {
        openResultsInNewWindow({
          answers: asgn.answers,
          results: results,
          categories,
          rules,
          isReadOnly: true,
          title: asgn.repoName || asgn.repoLink || ''
        });
      }
    } catch (err) {
      alert('Napaka pri nalaganju rezultatov: ' + err.message);
    }
  };

  const metrics = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [assignments]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="pulse-animation" style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Nalagam dodeljena ocenjevanja…
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '4px' }}>
      {/* Welcome Banner */}
      <div className="card" style={{ 
        padding: '24px', 
        marginBottom: '24px', 
        background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.12) 0%, rgba(22, 27, 34, 0.7) 100%)',
        border: '1px solid rgba(88, 166, 255, 0.2)' 
      }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Pozdravljeni, {loggedInUser?.name || loggedInUser?.username || 'Ocenjevalec'}!
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
          Tukaj so zbrani vsi GitHub repozitoriji, ki so vam bili dodeljeni s strani administratorja.
          Prosimo, da za vsak repozitorij spodaj izvedete podrobno oceno zrelosti CI/CD cevovoda.
        </p>
        {loggedInUser?.role === 'user' && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-accent"
              style={{ fontSize: '0.85rem' }}
              onClick={() => { setShowUpgrade(true); setUpgError(''); setUpgPassword(''); setUpgConfirm(''); }}
            >
              Postani registriran uporabnik
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Nastavite svoje geslo in se v prihodnje prijavljajte z njim.
            </span>
          </div>
        )}
      </div>

      {showUpgrade && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !upgLoading) setShowUpgrade(false); }}>
          <div className="modal-card" style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem' }}>Postani registriran uporabnik</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 0 }}>
              Nastavite geslo za svoj račun. Po nastavitvi se boste prijavljali z uporabniškim imenom
              <strong> {loggedInUser?.username || loggedInUser?.email}</strong> in tem geslom.
            </p>
            <div className="form-group">
              <label className="form-label">Novo geslo *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Min. 6 znakov"
                value={upgPassword}
                onChange={e => setUpgPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Potrdi geslo *</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={upgConfirm}
                onChange={e => setUpgConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUpgrade()}
              />
            </div>
            {upgError && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', margin: '8px 0', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                {upgError}
              </div>
            )}
            <div className="flex-between" style={{ gap: '10px', marginTop: '14px' }}>
              <button className="btn btn-ghost" onClick={() => setShowUpgrade(false)} disabled={upgLoading}>Prekliči</button>
              <button className="btn btn-accent" onClick={handleUpgrade} disabled={upgLoading} style={{ flex: 1 }}>
                {upgLoading ? 'Shranjujem…' : 'Potrdi in nadgradi račun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Vsa dodeljena ocenjevanja', value: metrics.total, color: 'var(--accent-color)', icon: '' },
          { label: 'Čaka na oceno', value: metrics.pending, color: metrics.pending > 0 ? 'var(--warning-color)' : 'var(--text-secondary)', icon: '' },
          { label: 'Dokončano', value: metrics.completed, color: 'var(--success-color)', icon: '✓' },
        ].map((card, idx) => (
          <div key={idx} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '2rem', background: 'rgba(255,255,255,0.03)', width: '50px', height: '50px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContents: 'center', textAlign: 'center', lineHeight: '50px', justifyContent: 'center' }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: card.color, lineHeight: 1.1 }}>{card.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main List */}
      <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        Seznam repozitorijev ({assignments.length})
      </h3>

      {assignments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}></div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Nimate dodeljenih nalog</div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Trenutno nimate aktivnih dodelitev za ocenjevanje CI/CD cevovodov.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {assignments.map(asgn => {
            const isCompleted = asgn.status === 'completed';
            return (
              <div key={asgn.id} className="card hover-card" style={{ 
                padding: '20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '16px',
                borderLeft: `4px solid ${isCompleted ? 'var(--success-color)' : 'var(--warning-color)'}`
              }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {asgn.repoName || asgn.repoLink}
                    </h4>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 600, 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      background: 'rgba(255,255,255,0.04)', 
                      color: 'var(--text-secondary)' 
                    }}>
                      Skupina: {asgn.groupName || 'Brez skupine'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <a href={asgn.repoLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>
                       {asgn.repoLink}
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {isCompleted ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        <span className="badge badge-green" style={{ fontSize: '0.78rem' }}>Stopnja {asgn.level || 1}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--success-color)' }}>{asgn.score || 0}%</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Ocenjeno {asgn.completedAt || asgn.createdAt}</div>
                    </div>
                  ) : (
                    <div>
                      <span className="badge badge-orange" style={{ fontSize: '0.78rem' }}>Čaka na oceno</span>
                    </div>
                  )}

                  <div>
                    {isCompleted ? (
                      <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={() => viewResults(asgn)}>
                         Preglej oceno
                      </button>
                    ) : (
                      <button className="btn btn-accent" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => startAssessmentForRepo(asgn.repoLink, asgn.id)}>
                        ▶ Začni ocenjevanje
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
}
