import React, { useState } from 'react';
import { api } from '../api.js';
import { evaluateAssessment, getFlatCategoriesItems } from '../utils.js';

<<<<<<< HEAD
=======
// Helper to extract UI-compatible categories for a specific pipeline's version
>>>>>>> 18ff9dc (updates and fixes)
function getPipelineCategories(p, questionnairesList) {
  const version = p.qVersion || p.version || "1.0";
  const qObj = questionnairesList.find(q => q.version === version);
  if (!qObj || !qObj.sections) return [];
  
  const result = [];
  qObj.sections.forEach(section => {
<<<<<<< HEAD
=======
    // Normalise super-category label
>>>>>>> 18ff9dc (updates and fixes)
    const id = (section.id || '').toLowerCase();
    let superCategory = 'Ostalo';
    if (id.includes('build') || id.includes('unit_test') || id.includes('sc_build') || id.includes('sc_test')) {
      superCategory = 'Neprekinjena integracija (CI)';
    } else if (id.includes('deploy') || id.includes('sc_deploy')) {
      superCategory = 'Neprekinjeno nameščanje (CD)';
    }

    if (section.categories && Array.isArray(section.categories)) {
      section.categories.forEach(cat => {
        result.push({
          id: cat.id || section.id,
          title: cat.title || cat.label || section.label || section.id,
          superCategory,
          description: cat.description || '',
          items: cat.items || [],
        });
      });
    } else {
      result.push({
        id: section.id,
        title: section.label || section.id,
        superCategory,
        description: section.description || '',
        items: section.items || [],
      });
    }
  });
  return result;
}

<<<<<<< HEAD
=======
// Helper to detect if form or rules have changed compared to saved pipeline evaluation
>>>>>>> 18ff9dc (updates and fixes)
function detectPipelineChanges(p, questionnairesList, rulesVersionsList) {
  const pCats = getPipelineCategories(p, questionnairesList);
  
  const rVer = p.rulesVersion || p.version || "1.0";
  const rObj = rulesVersionsList.find(r => r.version === rVer);
  const pRules = rObj ? rObj.levels : [];

  if (pCats.length === 0 || pRules.length === 0) {
    return { hasChanges: false, added: [], removed: [], scoreChanged: false };
  }

<<<<<<< HEAD
=======
  // Flatten all active question items recursively
>>>>>>> 18ff9dc (updates and fixes)
  const flatItems = getFlatCategoriesItems(pCats);

  const activeKeys = flatItems.map(item => item.id);
  const answeredKeys = Object.keys(p.answers || {});

<<<<<<< HEAD
=======
  // If the pipeline has no answers saved at all, it is either new, empty,
  // or the database is in an unseeded initial state. We treat it as having no changes.
>>>>>>> 18ff9dc (updates and fixes)
  if (answeredKeys.length === 0) {
    return { hasChanges: false, added: [], removed: [], scoreChanged: false };
  }

<<<<<<< HEAD
  const added = flatItems.filter(item => !answeredKeys.includes(item.id));
  
  const removedKeys = answeredKeys.filter(key => !activeKeys.includes(key));
  const removed = removedKeys.map(key => ({ id: key }));

  const silentEval = evaluateAssessment(p.answers || {}, pCats, pRules);

=======
  // 1. Detect new questions (exist in current version but missing from answers)
  const added = flatItems.filter(item => !answeredKeys.includes(item.id));
  
  // 2. Detect removed questions (exist in answers but removed from current version)
  const removedKeys = answeredKeys.filter(key => !activeKeys.includes(key));
  const removed = removedKeys.map(key => ({ id: key }));

  // 3. Silent re-evaluation using active questionnaire rules
  const silentEval = evaluateAssessment(p.answers || {}, pCats, pRules);

  // Dynamically populate score if database returned 0 due to database schema limitations (lack of score column)
>>>>>>> 18ff9dc (updates and fixes)
  if (p.score === 0 || p.score === undefined) {
    p.score = silentEval.score;
  }

<<<<<<< HEAD
=======
  // Populate dynamic score for historical versions too
>>>>>>> 18ff9dc (updates and fixes)
  if (p.versions && Array.isArray(p.versions)) {
    p.versions.forEach(v => {
      if (v.score === 0 || v.score === undefined) {
        const vCats = getPipelineCategories(v, questionnairesList);
        const vRulesObj = rulesVersionsList.find(r => r.version === (v.rulesVersion || rVer));
        const vRules = vRulesObj ? vRulesObj.levels : [];
        if (vCats.length > 0 && vRules.length > 0) {
          const vEval = evaluateAssessment(v.answers || {}, vCats, vRules);
          v.score = vEval.score;
        }
      }
    });
  }

<<<<<<< HEAD
=======
  // Dynamically correct score/level if there are no questionnaire structural changes
  // to resolve past backend rules-version mismatches or lack of columns
>>>>>>> 18ff9dc (updates and fixes)
  if (added.length === 0 && removed.length === 0) {
    p.score = silentEval.score;
    p.level = silentEval.level;
    p.levelName = silentEval.levelName;
  }

  const scoreChanged = silentEval.score !== p.score || silentEval.level !== p.level;

  const hasChanges = added.length > 0 || removed.length > 0 || scoreChanged;

  return {
    hasChanges,
    added,
    removed,
    scoreChanged,
    newScore: silentEval.score,
    newLevel: silentEval.level,
    newLevelName: silentEval.levelName,
    pCats,
    pRules
  };
}

function UpdateDiffModal({ pipeline, diff, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, color: '#e3b341', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Posodobitev vprašalnika in pravil: {pipeline.name}
          </h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Obrazec vprašalnika ali pravila zrelosti za to različico ({pipeline.version || "1.0"}) so se spremenili. Spodaj je prikazan pregled sprememb, ki se bodo uveljavile ob posodobitvi:
          </p>

          {/* New questions */}
          {diff.added.length > 0 && (
            <div style={{ background: 'rgba(46,160,67,0.06)', border: '1px solid rgba(46,160,67,0.2)', padding: '12px 14px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--success-color)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ＋ Dodana nova vprašanja ({diff.added.length})
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {diff.added.map(a => (
                  <li key={a.id}>
                    <strong>{a.label}</strong> <code style={{ color: 'var(--accent-color)' }}>({a.id})</code>
                  </li>
                ))}
              </ul>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                * Te vrednosti bodo privzeto nastavljene na NE oz. prazno. Po posodobitvi jih lahko uredite.
              </div>
            </div>
          )}

          {/* Removed questions */}
          {diff.removed.length > 0 && (
            <div style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)', padding: '12px 14px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--danger-color)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✕ Odstranjena odvečna vprašanja ({diff.removed.length})
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {diff.removed.map(r => (
                  <li key={r.id}>
                    ID: <code style={{ color: 'var(--danger-color)' }}>{r.id}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Score / Level changes */}
          {diff.scoreChanged && (
            <div style={{ background: 'rgba(88,166,255,0.06)', border: '1px solid rgba(88,166,255,0.2)', padding: '12px 14px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-color)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Napoved spremembe ocene in stopnje
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'center' }}>
                <div style={{ padding: '8px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Trenutno stanje</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '4px 0' }}>{pipeline.score}%</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 600 }}>Stopnja {pipeline.level}</div>
                </div>
                <div style={{ padding: '8px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Po posodobitvi</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '4px 0', color: diff.newScore > pipeline.score ? 'var(--success-color)' : (diff.newScore < pipeline.score ? 'var(--danger-color)' : 'inherit') }}>{diff.newScore}%</div>
                  <div style={{ fontSize: '0.78rem', color: diff.newLevel > pipeline.level ? 'var(--success-color)' : (diff.newLevel < pipeline.level ? 'var(--danger-color)' : 'var(--accent-color)'), fontWeight: 600 }}>
                    Stopnja {diff.newLevel} ({diff.newLevelName})
                  </div>
                </div>
              </div>
            </div>
          )}

          {!diff.scoreChanged && diff.added.length === 0 && diff.removed.length === 0 && (
            <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Ni zaznanih večjih strukturnih sprememb. Posodobitev bo osvežila sistemsko sinhronizacijo.
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--panel-border)', paddingTop: '12px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Prekliči</button>
          <button className="btn btn-accent" onClick={onConfirm}>Potrdi in posodobi</button>
        </div>
      </div>
    </div>
  );
}

function VersionModal({ pipeline, onClose, onViewHistoricVersion }) {
  const versions = pipeline.versions || [];

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>Zgodovinska verzija — {pipeline.name}</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>X</button>
        </div>

        {versions.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.4 }}></div>
            Ni zgodovinskih verzij. Verzije se beležijo ob vsakem shranjevanju sprememb.
          </div>
        ) : (
          <>
            {/* Current version */}
            <div
              style={{
                background: 'rgba(88,166,255,0.06)',
                border: '1px solid rgba(88,166,255,0.2)',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-blue">Trenutna</span>
                    {pipeline.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                    Datum: {pipeline.date}
                    {pipeline.assessor && <> · Ocenjevalec: {pipeline.assessor}</>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: pipeline.score < 40 ? 'var(--danger-color)' : pipeline.score < 75 ? 'var(--warning-color)' : 'var(--success-hover)' }}>
                    {pipeline.score}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stopnja {pipeline.level}</div>
                </div>
              </div>
            </div>

            {/* History (newest first) */}
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Zgodovina ({versions.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...versions].reverse().map((v, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '7px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>v{v.version}</span>
                      {v.name}
                    </div>
                     <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      Datum: {v.date}
                      {v.assessor && <> · Ocenjevalec: {v.assessor}</>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: v.score < 40 ? 'var(--danger-color)' : v.score < 75 ? 'var(--warning-color)' : 'var(--success-hover)',
                        }}
                      >
                        {v.score}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Stopnja {v.level}</div>
                    </div>
                    <button
                      className="btn"
                      style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: 'var(--accent-color)', color: 'var(--accent-color)', background: 'transparent' }}
                      onClick={() => {
                        onViewHistoricVersion(pipeline.id, v);
                        onClose();
                      }}
                    >
                      Preglej
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-accent" onClick={onClose}>Zapri</button>
        </div>
      </div>
    </div>
  );
}

function NewAssessmentModal({ questionnaires, rulesVersions = [], userRole, onStart, onClose }) {
  const [selectedQ, setSelectedQ] = useState(
    questionnaires.length > 0 ? questionnaires[questionnaires.length - 1].version : null
  );
  const [selectedR, setSelectedR] = useState(
    rulesVersions.length > 0 ? rulesVersions[rulesVersions.length - 1].version : null
  );

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>Novo ocenjevanje</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label className="form-label" style={{ marginBottom: '10px', display: 'block', fontWeight: 600 }}>
            Izberite vprašalnik (obrazec)
          </label>

          {questionnaires.length === 0 ? (
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.88rem',
              padding: '20px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              border: '1px dashed var(--panel-border)',
            }}>
              Ni razpoložljivih vprašalnikov. Obrnite se na administratorja.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {questionnaires.map((q, idx) => {
                const isSelected = q.version === selectedQ;
                return (
                  <div
                    key={q.version}
                    onClick={() => setSelectedQ(q.version)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--panel-border)'}`,
                      background: isSelected ? 'rgba(88,166,255,0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--panel-border)'}`,
                      background: isSelected ? 'var(--accent-color)' : 'transparent',
                      flexShrink: 0,
                      marginTop: '2px',
                      transition: 'all 0.18s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isSelected && (
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}>
                          {q.title || `Vprašalnik v${q.version}`}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)',
                          background: 'rgba(255,255,255,0.06)',
                          padding: '1px 6px',
                          borderRadius: '8px',
                        }}>
                          v{q.version}
                        </span>
                      </div>
                      {q.description && (
                        <div style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                        }}>
                          {q.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label className="form-label" style={{ marginBottom: '10px', display: 'block', fontWeight: 600 }}>
            Izberite pravila zrelosti
          </label>

          {rulesVersions.length === 0 ? (
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.88rem',
              padding: '20px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              border: '1px dashed var(--panel-border)',
            }}>
              Ni razpoložljivih pravil zrelosti. Obrnite se na administratorja.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rulesVersions.map((r, idx) => {
                const isSelected = r.version === selectedR;
                return (
                  <div
                    key={r.version}
                    onClick={() => setSelectedR(r.version)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--panel-border)'}`,
                      background: isSelected ? 'rgba(88,166,255,0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--panel-border)'}`,
                      background: isSelected ? 'var(--accent-color)' : 'transparent',
                      flexShrink: 0,
                      marginTop: '2px',
                      transition: 'all 0.18s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isSelected && (
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}>
                          {r.title || `Pravila v${r.version}`}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)',
                          background: 'rgba(255,255,255,0.06)',
                          padding: '1px 6px',
                          borderRadius: '8px',
                        }}>
                          v{r.version}
                        </span>
                      </div>
                      {r.description && (
                        <div style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                        }}>
                          {r.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-between">
          <button className="btn btn-ghost" onClick={onClose}>Prekliči</button>
          <button
            className="btn btn-accent"
            disabled={!selectedQ || !selectedR}
            onClick={() => { if (selectedQ && selectedR) onStart(selectedQ, selectedR); }}
            style={{ opacity: (selectedQ && selectedR) ? 1 : 0.5 }}
          >
            Začni ocenjevanje →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({
  pipelines,
  setPipelines,
  switchView,
  loadAssessment,
  resetAssessment,
  questionnaires = [],
  rulesVersions = [],
  userRole,
  startNewAssessment,
  onEditAssessment,
  onNewVersionAssessment,
  onViewHistoricVersion
}) {
  const [versionPipeline, setVersionPipeline] = useState(null);
  const [showNewAssessmentModal, setShowNewAssessmentModal] = useState(false);
  const [updatingDiff, setUpdatingDiff] = useState(null); // { pipeline, diff } for the confirmation modal

  const handleDelete = async (id) => {
    if (window.confirm('Ali res želite izbrisati ta popis cevovoda?')) {
      try {
        await api.deletePipeline(id);
        setPipelines(pipelines.filter(p => p.id !== id));
      } catch (err) {
        alert('Napaka pri brisanju: ' + err.message);
      }
    }
  };

  const handleNewAssessment = () => {
    if (questionnaires && questionnaires.length > 0) {
      setShowNewAssessmentModal(true);
    } else {
      resetAssessment();
      switchView('assessment');
    }
  };

  const handleStartWithVersion = (version, rulesVersion) => {
    setShowNewAssessmentModal(false);
    if (startNewAssessment) {
      startNewAssessment(version, rulesVersion);
    } else {
      resetAssessment();
      switchView('assessment');
    }
  };

  const handleConfirmUpdatePipeline = async () => {
    if (!updatingDiff) return;
    const { pipeline, diff } = updatingDiff;
    
<<<<<<< HEAD
    const newAnswers = { ...pipeline.answers };
    
=======
    // 1. Construct new answers map
    const newAnswers = { ...pipeline.answers };
    
    // Remove obsolete answers
>>>>>>> 18ff9dc (updates and fixes)
    diff.removed.forEach(r => {
      delete newAnswers[r.id];
    });

<<<<<<< HEAD
=======
    // Add new questions with default values (false/NE for checkboxes, empty string for texts)
>>>>>>> 18ff9dc (updates and fixes)
    diff.added.forEach(a => {
      if (a.type === 'checkbox' || a.type === 'yes_no_na') {
        newAnswers[a.id] = 'NE';
      } else {
        newAnswers[a.id] = '';
      }
    });

    try {
<<<<<<< HEAD
=======
      // 2. Build update payload
>>>>>>> 18ff9dc (updates and fixes)
      const updatedPayload = {
        ...pipeline,
        answers: newAnswers,
        score: diff.newScore,
        level: diff.newLevel
      };

<<<<<<< HEAD
      const res = await api.updatePipeline(pipeline.id, updatedPayload, true);
      
=======
      // 3. Save to backend (creates a historical version snapshot as well)
      const res = await api.updatePipeline(pipeline.id, updatedPayload, true);
      
      // 4. Update local state
>>>>>>> 18ff9dc (updates and fixes)
      setPipelines(pipelines.map(p => p.id === pipeline.id ? {
        ...p,
        answers: newAnswers,
        score: diff.newScore,
        level: diff.newLevel,
        versions: res.versions || p.versions
      } : p));

      alert(`Cevovod "${pipeline.name}" je bil uspešno posodobljen na trenutno konfiguracijo! Ustvarjena je bila zgodovinska varnostna kopija.`);
    } catch (err) {
      alert('Napaka pri posodabljanju cevovoda: ' + err.message);
    }

    setUpdatingDiff(null);
  };

  const totalVersions = (p) => (p.versions?.length || 0);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '22px' }}>
        <h2 className="page-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>
          Ocenjeni cevovodi
        </h2>
        <button
          className="btn btn-accent"
          onClick={handleNewAssessment}
        >
          + Novo ocenjevanje
        </button>
      </div>

      <div className="card">
        {pipelines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.3 }}></div>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Ni ocenjenih cevovodov</div>
            <div style={{ fontSize: '0.85rem' }}>
              Kliknite <strong>Novo ocenjevanje</strong> za začetek.
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ime cevovoda</th>
                <th>Datum</th>
                <th>Stopnja</th>
                <th>Rezultat</th>
                <th>Verzije</th>
                <th>Dejanja</th>
              </tr>
            </thead>
            <tbody>
              {pipelines.map(p => {
                const diff = detectPipelineChanges(p, questionnaires, rulesVersions);
                const badgeClass = p.level <= 2 ? 'badge-red' : p.level <= 4 ? 'badge-orange' : 'badge-green';
                
<<<<<<< HEAD
=======
                // Color progress bar yellow if changes are detected, otherwise use default logic
>>>>>>> 18ff9dc (updates and fixes)
                const barColor = diff.hasChanges
                  ? '#e3b341'
                  : (p.score < 40 ? '#f85149' : p.score < 75 ? '#d29922' : '#2ea043');
                
                const vCount = totalVersions(p);
                
<<<<<<< HEAD
=======
                // Row background: highlight in yellow/amber if form/rules changed
>>>>>>> 18ff9dc (updates and fixes)
                const rowStyle = diff.hasChanges ? {
                  background: 'rgba(210, 153, 34, 0.05)',
                  borderLeft: '4px solid #e3b341'
                } : {};

                return (
                  <tr key={p.id} style={rowStyle}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.assessor && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Ocenjevalec: {p.assessor}
                        </div>
                      )}
                      
                      {/* Notifications/Details of structural changes */}
                      {diff.hasChanges && (
                        <div style={{
                          marginTop: '8px',
                          background: 'rgba(210,153,34,0.12)',
                          border: '1px solid rgba(210,153,34,0.3)',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '0.75rem',
                          color: '#e3b341',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          maxWidth: '420px',
                          animation: 'fadeIn 0.25s ease'
                        }}>
                          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ⚠️ Zaznane spremembe v vprašalniku ali pravilih!
                          </div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.9, paddingLeft: '2px' }}>
                            {diff.added.length > 0 && <div>• Dodana nova vprašanja ({diff.added.length})</div>}
                            {diff.removed.length > 0 && <div>• Odstranjena stara vprašanja ({diff.removed.length})</div>}
                            {diff.scoreChanged && <div>• Izračun stopnje/rezultata se bo spremenil</div>}
                          </div>
                          <button
                            className="btn"
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              marginTop: '5px',
                              alignSelf: 'flex-start',
                              color: '#fff',
                              background: '#e3b341',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                            onClick={() => setUpdatingDiff({ pipeline: p, diff })}
                          >
                            Posodobi vprašalnik
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{p.date}</td>
                    <td><span className={`badge ${badgeClass}`}>Stopnja {p.level}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px' }}>
                        <div style={{ flex: 1, height: '5px', background: 'var(--panel-border)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${p.score}%`, height: '100%', background: barColor, transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: barColor, minWidth: '34px' }}>
                          {p.score}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge-version"
                        onClick={() => setVersionPipeline(p)}
                        title="Prikaži zgodovino verzij"
                      >
                        {vCount + 1} {vCount === 0 ? 'verzija' : 'verzij'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          className="btn"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => onEditAssessment(p.id)}
                          title="Uredi obstoječo oceno (brez nove verzije)"
                        >
                          Uredi
                        </button>
                        <button
                          className="btn btn-accent"
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          onClick={() => onNewVersionAssessment(p.id)}
                          title="Ustvari novo različico pred urejanjem"
                        >
                          Nova verzija
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => handleDelete(p.id)}
                        >
                          Izbriši
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {versionPipeline && (
        <VersionModal
          pipeline={versionPipeline}
          onClose={() => setVersionPipeline(null)}
          onViewHistoricVersion={onViewHistoricVersion}
        />
      )}

      {showNewAssessmentModal && (
        <NewAssessmentModal
          questionnaires={questionnaires}
          rulesVersions={rulesVersions}
          userRole={userRole}
          onStart={handleStartWithVersion}
          onClose={() => setShowNewAssessmentModal(false)}
        />
      )}

      {updatingDiff && (
        <UpdateDiffModal
          pipeline={updatingDiff.pipeline}
          diff={updatingDiff.diff}
          onConfirm={handleConfirmUpdatePipeline}
          onClose={() => setUpdatingDiff(null)}
        />
      )}
    </div>
  );
}
