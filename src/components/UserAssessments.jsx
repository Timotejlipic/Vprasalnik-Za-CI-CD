import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api.js';
import ResultsPanel from './ResultsPanel.jsx';

export default function UserAssessments({ user, isLoggedIn, switchView, startAssessmentForRepo }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Results details modal state
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);

  const loggedInUser = useMemo(() => api.getCurrentUser(), []);

  useEffect(() => {
    async function loadData() {
      if (!loggedInUser) return;
      setLoading(true);
      try {
        const data = await api.getUserAssignments(loggedInUser.id);
        setAssignments(data || []);
        
        const catsData = await api.getCategories();
        setCategories(catsData || []);
        
        const rulesData = await api.getRules();
        setRules(rulesData || []);
      } catch (err) {
        console.error('Failed to load assignments:', err);
      }
      setLoading(false);
    }
    loadData();
  }, [loggedInUser]);

  const viewResults = async (asgn) => {
    if (!asgn.answers) return;
    try {
      const results = await api.evaluate(asgn.answers, categories, rules);
      setEvaluationResults(results);
      setSelectedAssignment(asgn);
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
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Vsa dodeljena ocenjevanja', value: metrics.total, color: 'var(--accent-color)', icon: '📋' },
          { label: 'Čaka na oceno', value: metrics.pending, color: metrics.pending > 0 ? 'var(--warning-color)' : 'var(--text-secondary)', icon: '⏳' },
          { label: 'Dokončano', value: metrics.completed, color: 'var(--success-color)', icon: '✅' },
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
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
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
                      🔗 {asgn.repoLink}
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
                        🔍 Preglej oceno
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

      {/* Results Detail Modal */}
      {selectedAssignment && evaluationResults && (
        <ResultsPanel
          results={evaluationResults}
          answers={selectedAssignment.answers || {}}
          categories={categories}
          rules={rules}
          isReadOnly={true}
          onClose={() => { setSelectedAssignment(null); setEvaluationResults(null); }}
        />
      )}
    </div>
  );
}
