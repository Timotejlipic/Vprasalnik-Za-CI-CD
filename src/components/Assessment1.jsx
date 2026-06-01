import React, { useState, useEffect } from 'react';
import { evaluateAssessment, getFlatCategoriesItems } from '../utils.js';
import { api } from '../api.js';
import GitHubYamlViewer from './GitHubYamlViewer.jsx';
import ResultsPanel from './ResultsPanel.jsx';

function QuestionItem({ item, depth = 0, parentDisabled = false, currentAssessment, handleChange, toggleDesc, expandedDescs, isReadOnly = false }) {
  const val = currentAssessment[item.id];
  const isChecked = val === true || val === 'DA';
  const isDisabled = parentDisabled || isReadOnly;

  const handleValueChange = (newVal) => {
    if (isDisabled) return;
    handleChange(item.id, newVal);
  };

  return (
    <div
      style={{
        padding: '10px 2px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        marginLeft: `${depth * 18}px`,
        borderLeft: depth > 0 ? '2px solid rgba(88, 166, 255, 0.18)' : 'none',
        paddingLeft: depth > 0 ? '12px' : '2px',
        opacity: isDisabled ? 0.6 : 1,
        pointerEvents: isDisabled ? 'none' : 'auto',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '0.88rem', fontWeight: depth === 0 ? '600' : '400', flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{item.label}</span>
          {item.description && (
            <span
              onClick={() => toggleDesc(item.id)}
              style={{
                cursor: 'pointer',
                color: expandedDescs[item.id] ? '#fff' : 'var(--accent-color)',
                fontSize: '0.7rem',
                background: expandedDescs[item.id] ? 'var(--accent-color)' : 'rgba(88,166,255,0.15)',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                flexShrink: 0,
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              ?
            </span>
          )}
        </div>

        {(item.type === 'yes_no_na' || item.type === 'checkbox') && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {['DA', 'NA'].map(opt => {
              const isChecked = opt === 'DA'
                ? (val === 'DA' || val === true)
                : (val === 'NA');
              return (
                <label key={opt} className="checkbox-label" style={{ pointerEvents: isDisabled ? 'none' : 'auto' }}>
                  <input
                    type="checkbox"
                    disabled={isDisabled}
                    checked={isChecked}
                    onChange={() => handleValueChange(isChecked ? '' : opt)}
                  />
                  {opt === 'NA' ? '/' : 'DA'}
                </label>
              );
            })}
          </div>
        )}

        {item.type === 'multiselect' && item.options && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '340px' }}>
            {item.options.map(opt => {
              const selected = Array.isArray(val) ? val.includes(opt.value) : false;
              return (
                <label key={opt.value} className="checkbox-label" style={{
                  background: selected ? 'rgba(88,166,255,0.12)' : 'rgba(255,255,255,0.02)',
                  borderColor: selected ? 'var(--accent-color)' : 'var(--panel-border)',
                  border: '1px solid',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  pointerEvents: isDisabled ? 'none' : 'auto',
                }}>
                  <input
                    type="checkbox"
                    disabled={isDisabled}
                    checked={selected}
                    onChange={() => {
                      const current = Array.isArray(val) ? val : [];
                      const next = current.includes(opt.value)
                        ? current.filter(v => v !== opt.value)
                        : [...current, opt.value];
                      handleValueChange(next);
                    }}
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        )}

        {item.type === 'numeric' && (
          <div style={{ width: '100px', flexShrink: 0 }}>
            <input
              type="number"
              disabled={isDisabled}
              className="form-control"
              value={val !== undefined && val !== null ? val : ''}
              onChange={e => handleValueChange(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              style={{ padding: '4px 8px', fontSize: '0.82rem' }}
            />
          </div>
        )}

        {item.type === 'text' && !item.options && (
          <div style={{ width: '180px', flexShrink: 0 }}>
            <input
              type="text"
              disabled={isDisabled}
              className="form-control"
              value={val || ''}
              onChange={e => handleValueChange(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '0.82rem' }}
              placeholder="Vpišite odgovor..."
            />
          </div>
        )}
      </div>

      {item.description && expandedDescs[item.id] && (
        <div style={{
          marginTop: '7px',
          padding: '8px 12px',
          background: 'rgba(88,166,255,0.07)',
          borderLeft: '3px solid var(--accent-color)',
          borderRadius: '0 5px 5px 0',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          {item.description}
        </div>
      )}

      {item.items && item.items.length > 0 && (
        <div style={{ marginTop: '6px' }}>
          {item.items.map(subItem => (
            <QuestionItem
              key={subItem.id}
              item={subItem}
              depth={depth + 1}
              parentDisabled={isDisabled || !isChecked}
              currentAssessment={currentAssessment}
              handleChange={handleChange}
              toggleDesc={toggleDesc}
              expandedDescs={expandedDescs}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Assessment1({
  user,
  isLoggedIn,
  pipelines,
  setPipelines,
  currentAssessment,
  setCurrentAssessment,
  currentAssessmentId,
  categories,
  rules,
  switchView,
  onRepoLinkChange,
  initialName = '',
  initialRepoLink = '',
  isReadOnly = false,
  createNewVersionMode = false,
  historicVersion = null,
  assessmentVersion,
  rulesVersion,
  isSidebarOpen,
  assessmentMeta = null,
  isLocked = false,
}) {
  const [name, setName] = useState(initialName);
  const [repoId, setRepoId] = useState('');
  const [repoLink, setRepoLink] = useState(initialRepoLink);
  const [results, setResults] = useState(null);
  const [expandedDescs, setExpandedDescs] = useState({});
  const [openCategories, setOpenCategories] = useState({});
  const [showYaml, setShowYaml] = useState(false);

  useEffect(() => {
    if (categories && categories.length > 0) {
      const initial = {};
      categories.forEach((cat, idx) => {
        initial[cat.id] = (idx === 0);
      });
      setOpenCategories(initial);
    }
  }, [categories, currentAssessmentId]);

  // Assessor is automatically derived from logged-in user
  const assessor = typeof user === 'object' && user ? (user.name || user.username || '') : (user || '');

  const toggleDesc = (id) =>
    setExpandedDescs(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    if (currentAssessmentId) {
      const p = pipelines.find(x => String(x.id) === String(currentAssessmentId));
      if (p) {
        setName(p.name || '');
        setRepoId(p.repoId || '');
        const link = p.repoLink || '';
        setRepoLink(link);
        onRepoLinkChange?.(link);
        handleCalculate(p.answers);
      }
    } else {
      setName(initialName);
      setRepoId('');
      setRepoLink(initialRepoLink);
      onRepoLinkChange?.(initialRepoLink);
      setResults(null);
    }
  }, [currentAssessmentId, pipelines, initialName, initialRepoLink]);

  const handleRepoLinkChange = (val) => {
    setRepoLink(val);
    onRepoLinkChange?.(val);
  };

  const handleChange = (id, value) => {
    if (isReadOnly) return;
    setCurrentAssessment(prev => ({ ...prev, [id]: value }));
  };

  const handleCalculate = async (answersToEvaluate = currentAssessment) => {
    try {
      const res = await api.evaluate(answersToEvaluate, categories, rules);
      setResults(res);
    } catch (err) {
      console.warn('Backend evaluation failed, using local fallback:', err);
      const res = evaluateAssessment(answersToEvaluate, categories, rules);
      setResults(res);
    }
  };

  const handleSave = async () => {
    if (!isLoggedIn) {
      alert('Za shranjevanje se morate prijaviti.');
      return;
    }
    if (!name) {
      alert('Prosimo, vnesite ime cevovoda.');
      return;
    }
    try {
      // Fill in default values for all unanswered question items
      const finalAnswers = { ...currentAssessment };
      const flatItems = getFlatCategoriesItems(categories);
      flatItems.forEach(item => {
        if (!(item.id in finalAnswers) || finalAnswers[item.id] === undefined || finalAnswers[item.id] === null) {
          if (item.type === 'checkbox' || item.type === 'yes_no_na') {
            finalAnswers[item.id] = 'NE';
          } else {
            finalAnswers[item.id] = '';
          }
        }
      });

      const res = await api.evaluate(finalAnswers, categories, rules);
      const finalScore = res.score;
      const finalLevel = res.level;

      // Encode assessor and score into repoId so the backend stores it in project_name.
      // This allows the admin dashboard to match pipelines to assignments even when
      // the user is in a different browser session (e.g. Incognito vs Normal window).
      const encodedRepoId = `${assessor}|${finalScore}`;

      let savedPipe = null;
      if (currentAssessmentId) {
        savedPipe = await api.updatePipeline(
          currentAssessmentId,
          {
            name,
            repoId: encodedRepoId,
            repoLink,
            assessor,
            score: finalScore,
            level: finalLevel,
            answers: finalAnswers,
            version: assessmentVersion,
            rulesVersion,
          },
          createNewVersionMode
        );
      } else {
        savedPipe = await api.createPipeline({
          name,
          repoId: encodedRepoId,
          repoLink,
          assessor,
          score: finalScore,
          level: finalLevel,
          answers: finalAnswers,
          version: assessmentVersion,
          rulesVersion,
        });

        // Automatically complete the assignment if it was launched from an assigned task
        if (assessmentMeta && assessmentMeta.assignmentId) {
          try {
            await api.completeAssignment(
              assessmentMeta.assignmentId,
              finalScore,
              finalLevel,
              savedPipe.id,
              finalAnswers
            );
          } catch (err) {
            console.error('Failed to complete assignment:', err);
          }
        }
      }
      
      const latestPipelines = await api.getPipelines();
      setPipelines(latestPipelines);
      
      // Redirect standard user back to user assessments, and admins to dashboard
      if (assessmentMeta && assessmentMeta.assignmentId) {
        switchView('user_assessments');
      } else {
        switchView('dashboard');
      }
    } catch (err) {
      alert('Napaka pri shranjevanju: ' + err.message);
    }
  };

  // Group categories by superCategory
  const superGroups = {};
  categories.forEach(cat => {
    const superTitle = cat.superCategory || "CI/CD Proces";
    if (!superGroups[superTitle]) {
      superGroups[superTitle] = [];
    }
    superGroups[superTitle].push(cat);
  });

  const renderCategoryCard = (cat) => {
    const presenceItem = cat.items.find(item => item.id.endsWith('_present'));
    const isPresenceChecked = presenceItem 
      ? (currentAssessment[presenceItem.id] === 'DA' || currentAssessment[presenceItem.id] === true)
      : true;
    const isOpen = !!openCategories[cat.id] && isPresenceChecked;

    return (
      <details
        key={cat.id}
        className="card"
        style={{ marginBottom: 0, padding: 0, overflow: 'hidden', transition: 'all 0.3s ease' }}
        open={isOpen}
        onToggle={(e) => {
          setOpenCategories(prev => ({ ...prev, [cat.id]: e.target.open }));
        }}
      >
        <summary
          onClick={(e) => {
            if (presenceItem && !isPresenceChecked) {
              e.preventDefault();
              alert(`Najprej morate označiti "DA", da je "${cat.title}" prisoten v cevovodu, če želite urejati podrobnosti.`);
            }
          }}
          style={{
            background: 'linear-gradient(90deg, rgba(88,166,255,0.09) 0%, var(--panel-bg) 100%)',
            padding: '14px 18px',
            borderBottom: '1px solid var(--panel-border)',
            borderLeft: '4px solid var(--accent-color)',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--text-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            listStyle: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>{cat.title}</span>
            {presenceItem && (
              <div 
                style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', marginLeft: '12px', fontSize: '0.85rem', fontWeight: 500, background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}
                onClick={e => e.stopPropagation()} // prepreči zlaganje/odpiranje accordion-a ob kliku na checkbox
              >
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                  Prisoten v cevovodu:
                </span>
                {['DA', 'NA'].map(opt => {
                  const presenceVal = currentAssessment[presenceItem.id];
                  const isChecked = opt === 'DA'
                    ? (presenceVal === 'DA' || presenceVal === true)
                    : (presenceVal === 'NA');
                  
                  return (
                    <label 
                      key={opt} 
                      className="checkbox-label" 
                      style={{ 
                        margin: 0, 
                        padding: '2px 6px', 
                        fontSize: '0.78rem',
                        pointerEvents: isReadOnly ? 'none' : 'auto',
                        cursor: isReadOnly ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={isChecked}
                        onChange={() => {
                          if (isReadOnly) return;
                          handleChange(presenceItem.id, isChecked ? '' : opt);
                        }}
                      />
                      {opt === 'NA' ? '/' : 'DA'}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <span
            className="collapse-icon"
            style={{
              transition: 'transform 0.2s',
              fontSize: '1.1rem',
              display: 'inline-block',
              opacity: 0.6,
              transform: isOpen ? 'rotate(90deg)' : 'none'
            }}
          >
            ▸
          </span>
        </summary>
        <div style={{ padding: '6px 16px 10px' }}>
          {(presenceItem ? (presenceItem.items || []) : cat.items).map(item => (
            <QuestionItem
              key={item.id}
              item={item}
              depth={0}
              parentDisabled={!isPresenceChecked}
              currentAssessment={currentAssessment}
              handleChange={handleChange}
              toggleDesc={toggleDesc}
              expandedDescs={expandedDescs}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      </details>
    );
  };

  return (
    <div>
      {/* Top Banners */}
      {isReadOnly && historicVersion && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(54, 162, 235, 0.15) 0%, rgba(54, 162, 235, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(54, 162, 235, 0.25)',
            borderLeft: '5px solid #36a2eb',
            padding: '14px 20px',
            borderRadius: '8px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <strong style={{ color: '#fff', fontSize: '0.95rem' }}>NAČIN SAMO ZA BRANJE</strong>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '2px' }}>
              Pregledujete zgodovinsko različico <strong>v{historicVersion.version}</strong> (verzija z dne {historicVersion.date}). Spremembe so onemogočene.
            </div>
          </div>
        </div>
      )}

      {createNewVersionMode && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(153, 102, 255, 0.15) 0%, rgba(153, 102, 255, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(153, 102, 255, 0.25)',
            borderLeft: '5px solid #9966ff',
            padding: '14px 20px',
            borderRadius: '8px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <strong style={{ color: '#fff', fontSize: '0.95rem' }}>USTVARJANJE NOVE VERZIJE</strong>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '2px' }}>
              Shranjevanje bo ustvarilo novo verzijo prejšnjega stanja.
            </div>
          </div>
        </div>
      )}

      {/* Metadata card */}
      <div className="card" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: '220px', flexShrink: 0 }}>
            <label className="form-label">Ime cevovoda</label>
            <input
              type="text"
              disabled={isReadOnly || isLocked}
              className="form-control"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="npr. Backend Service API"
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label className="form-label">Repozitorij (link)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                disabled={isReadOnly || isLocked}
                className="form-control"
                value={repoLink}
                onChange={e => handleRepoLinkChange(e.target.value)}
                placeholder="https://github.com/owner/repo"
                style={{ flex: 1 }}
              />
              {repoLink && (
                <button
                  className={`btn ${showYaml ? 'btn-accent' : 'btn-ghost'}`}
                  style={{ flexShrink: 0, fontSize: '0.78rem', padding: '6px 10px', whiteSpace: 'nowrap' }}
                  onClick={() => setShowYaml(v => !v)}
                  title={showYaml ? 'Skrij YAML datoteke' : 'Prikaži YAML datoteke'}
                >
                  {showYaml ? 'Skrij YAML' : 'Prikaži YAML'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showYaml && repoLink ? (isSidebarOpen ? '1fr 480px' : '1fr 720px') : '1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Form column */}
        <div>
          {/* Super categories and categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.keys(superGroups).map(superTitle => {
              const groupCats = superGroups[superTitle];
              const leftCats = groupCats.filter((_, idx) => idx % 2 === 0);
              const rightCats = groupCats.filter((_, idx) => idx % 2 === 1);

              return (
                <div key={superTitle} style={{ background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--accent-color)',
                      marginBottom: '16px',
                      borderBottom: '2px solid rgba(88, 166, 255, 0.15)',
                      paddingBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {superTitle}
                  </h3>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: groupCats.length > 1 ? '1fr 1fr' : '1fr',
                      gap: '20px',
                      alignItems: 'start'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {leftCats.map(cat => renderCategoryCard(cat))}
                    </div>
                    {groupCats.length > 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {rightCats.map(cat => renderCategoryCard(cat))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-accent" disabled={isReadOnly} onClick={() => handleCalculate(currentAssessment)}>
              Izračunaj zrelost
            </button>
            <button className="btn btn-ghost" onClick={() => switchView('dashboard')}>
              Nazaj
            </button>
          </div>
        </div>

        {/* YAML viewer — sticky sidebar, right of the form */}
        {showYaml && repoLink && (
          <div style={{ position: 'sticky', top: '76px' }}>
            <GitHubYamlViewer repoLink={repoLink} />
          </div>
        )}
      </div>

      {/* Results — full width below the form */}
      {results && (
        <ResultsPanel 
          results={results} 
          onSave={handleSave} 
          isLoggedIn={isLoggedIn} 
          isReadOnly={isReadOnly} 
          categories={categories}
          rules={rules}
          answers={currentAssessment}
          onClose={() => setResults(null)}
        />
      )}
    </div>
  );
}
