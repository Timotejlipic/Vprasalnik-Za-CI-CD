import React, { useState } from 'react';
import { api } from '../api.js';
import { evaluateAssessment, getFlatCategoriesItems, getPipelineCategories, detectPipelineChanges } from '../utils.js';


function UpdateDiffModal({ pipeline, diff, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, color: '#e3b341', display: 'flex', alignItems: 'center', gap: '8px' }}>
            !️ Posodobitev vprašalnika in pravil: {pipeline.name}
          </h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>X</button>
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
                X Odstranjena odvečna vprašanja ({diff.removed.length})
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
                 Napoved spremembe ocene in stopnje
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
      <div className="modal-card" style={{ maxWidth: '660px', maxHeight: '140vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>Novo ocenjevanje</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>X</button>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>
            Vprašalnik (obrazec) *
          </label>

          {questionnaires.length === 0 ? (
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              padding: '12px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              border: '1px dashed var(--panel-border)',
            }}>
              Ni razpoložljivih vprašalnikov.
            </div>
          ) : (
            <select
              className="form-control"
              value={selectedQ || ''}
              onChange={e => setSelectedQ(e.target.value)}
              style={{
                background: 'var(--panel-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--panel-border)',
                borderRadius: '6px',
                padding: '8px 10px',
                width: '100%',
                fontSize: '0.9rem'
              }}
            >
              <option value="" disabled>-- Izberi vprašalnik --</option>
              {questionnaires.map(q => (
                <option key={q.version} value={q.version}>
                  {q.title || `Vprašalnik v${q.version}`} (v{q.version})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>
            Pravila zrelosti *
          </label>

          {rulesVersions.length === 0 ? (
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              padding: '12px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              border: '1px dashed var(--panel-border)',
            }}>
              Ni razpoložljivih pravil zrelosti.
            </div>
          ) : (
            <select
              className="form-control"
              value={selectedR || ''}
              onChange={e => setSelectedR(e.target.value)}
              style={{
                background: 'var(--panel-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--panel-border)',
                borderRadius: '6px',
                padding: '8px 10px',
                width: '100%',
                fontSize: '0.9rem'
              }}
            >
              <option value="" disabled>-- Izberi pravila zrelosti --</option>
              {rulesVersions.map(r => (
                <option key={r.version} value={r.version}>
                  {r.title || `Pravila v${r.version}`} (v{r.version})
                </option>
              ))}
            </select>
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
  onViewHistoricVersion,
  onPreviewAnswers,
  onSyncAssessment
}) {
  const [versionPipeline, setVersionPipeline] = useState(null);
  const [showNewAssessmentModal, setShowNewAssessmentModal] = useState(false);
  const [updatingDiff, setUpdatingDiff] = useState(null); // { pipeline, diff } for the confirmation modal

  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterRepo, setFilterRepo] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const filteredPipelines = pipelines.filter(p => {
    const nameMatch = !filterName || `${p.name || ''} ${p.assessor || ''}`.toLowerCase().includes(filterName.toLowerCase());
    const repoMatch = !filterRepo || `${p.repoLink || ''}`.toLowerCase().includes(filterRepo.toLowerCase());
    const dateMatch = !filterDate || `${p.date || ''}`.includes(filterDate);
    return nameMatch && repoMatch && dateMatch;
  });
  const hasActiveFilters = filterName || filterRepo || filterDate;

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
    
    // 1. Construct new answers map
    const newAnswers = { ...pipeline.answers };
    
    // Remove obsolete answers
    diff.removed.forEach(r => {
      delete newAnswers[r.id];
    });

    // Add new questions with default values (false/NE for checkboxes, empty string for texts)
    diff.added.forEach(a => {
      if (a.type === 'checkbox' || a.type === 'yes_no_na') {
        newAnswers[a.id] = 'NE';
      } else {
        newAnswers[a.id] = '';
      }
    });

    try {
      // 2. Build update payload
      const updatedPayload = {
        ...pipeline,
        answers: newAnswers,
        score: diff.newScore,
        level: diff.newLevel
      };

      // 3. Save to backend (creates a historical version snapshot as well)
      const res = await api.updatePipeline(pipeline.id, updatedPayload, true);
      
      // 4. Update local state
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

  const handleExportQuestionnaire = (p) => {
    const pCats = getPipelineCategories(p, questionnaires);
    if (!pCats || pCats.length === 0) {
      alert('Strukture vprašalnika ni mogoče naložiti.');
      return;
    }

    let textContent = `VPRAŠALNIK IN ODGOVORI ZA CEVOVOD: ${p.name || p.repoLink}\n`;
    textContent += `Datum ocenjevanja: ${p.date}\n`;
    textContent += `Stopnja zrelosti: Stopnja ${p.level} (${p.levelName || ''})\n`;
    textContent += `Skupni rezultat: ${p.score}%\n`;
    textContent += `========================================================================\n\n`;

    pCats.forEach(cat => {
      textContent += `KATEGORIJA: ${cat.title} (${cat.superCategory || ''})\n`;
      if (cat.description) textContent += `Opis: ${cat.description}\n`;
      textContent += `------------------------------------------------------------------------\n`;
      
      const items = cat.items || [];
      items.forEach((item, idx) => {
        const ans = p.answers ? p.answers[item.id] : 'NE';
        textContent += `${idx + 1}. ${item.question || item.label}\n`;
        textContent += `   Odgovor: ${ans}\n`;
        if (item.description) textContent += `   Opis pogoja: ${item.description}\n`;
        textContent += `\n`;
      });
      textContent += `\n`;
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vprasalnik_odgovori_${(p.name || 'cevovod').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {/* Filter bar */}
      {pipelines.length > 0 && (
        <div className="card" style={{ marginBottom: '14px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Ime / ocenjevalec</label>
            <input
              type="text"
              className="form-control"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Filtriraj po imenu…"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Repozitorij (link)</label>
            <input
              type="text"
              className="form-control"
              value={filterRepo}
              onChange={e => setFilterRepo(e.target.value)}
              placeholder="github.com/owner/repo…"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ width: '170px' }}>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Datum</label>
            <input
              type="date"
              className="form-control"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          {hasActiveFilters && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', padding: '8px 12px' }}
              onClick={() => { setFilterName(''); setFilterRepo(''); setFilterDate(''); }}
            >
              X Počisti filtre
            </button>
          )}
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
            Prikazanih {filteredPipelines.length} / {pipelines.length}
          </span>
        </div>
      )}

      <div className="card">
        {pipelines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.3 }}></div>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Ni ocenjenih cevovodov</div>
            <div style={{ fontSize: '0.85rem' }}>
              Kliknite <strong>Novo ocenjevanje</strong> za začetek.
            </div>
          </div>
        ) : filteredPipelines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.3 }}></div>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Noben cevovod ne ustreza filtrom</div>
            <div style={{ fontSize: '0.85rem' }}>Poskusite spremeniti ali počistiti filtre.</div>
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
              {filteredPipelines.map(p => {
                const diff = detectPipelineChanges(p, questionnaires, rulesVersions);
                const badgeClass = p.level <= 2 ? 'badge-red' : p.level <= 4 ? 'badge-orange' : 'badge-green';
                
                // Color progress bar yellow if changes are detected, otherwise use default logic
                const barColor = diff.hasChanges
                  ? '#e3b341'
                  : (p.score < 40 ? '#f85149' : p.score < 75 ? '#d29922' : '#2ea043');
                
                const vCount = totalVersions(p);
                
                // Row background: highlight in yellow/amber if form/rules changed
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
                            !️ Zaznane spremembe v vprašalniku ali pravilih!
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
                            onClick={() => onSyncAssessment(p.id)}
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
                          className="btn btn-ghost"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => onPreviewAnswers(p)}
                          title="Preglej shranjene odgovore (brez urejanja)"
                        >
                          Preglej odgovore
                        </button>
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
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => handleExportQuestionnaire(p)}
                          title="Izvozi vprašalnik in trenutne odgovore v tekstovno datoteko"
                        >
                          Izvozi vprašalnik
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
