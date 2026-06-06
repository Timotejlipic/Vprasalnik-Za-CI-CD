import React from 'react';
import { checkCriterion } from '../utils.js';

const LEVEL_COLORS = {
  low:  '#f85149',
  mid:  '#d29922',
  high: '#2ea043',
};

function scoreColor(score) {
  return score < 40 ? LEVEL_COLORS.low : score < 75 ? LEVEL_COLORS.mid : LEVEL_COLORS.high;
}

function renderMissingPogojevText(count) {
  if (count === 1) return <>Manjka še <strong>1</strong> pogoj</>;
  if (count === 2) return <>Manjkata še <strong>2</strong> pogoja</>;
  if (count === 3) return <>Manjkajo še <strong>3</strong> pogoji</>;
  if (count === 4) return <>Manjkajo še <strong>4</strong> pogoji</>;
  return <>Manjka še <strong>{count}</strong> pogojev</>;
}

export default function ResultsPanel({ 
  results, 
  onSave, 
  isLoggedIn, 
  isReadOnly,
  categories = [],
  rules = [],
  answers = {},
  onClose,
  isInline = false
}) {
  const color = scoreColor(results.score);

  // 1. Sort levels and setup inspect level state
  const sortedLevels = [...rules].sort((a, b) => {
    const aId = a.level !== undefined ? a.level : a.id;
    const bId = b.level !== undefined ? b.level : b.id;
    return aId - bId;
  });

  const availableLevels = sortedLevels.map(l => l.level !== undefined ? l.level : l.id);
  const maxLevel = availableLevels.length > 0 ? Math.max(...availableLevels) : 5;
  const defaultInspectLevel = results.level < maxLevel ? results.level + 1 : maxLevel;

  const [selectedInspectLevel, setSelectedInspectLevel] = React.useState(defaultInspectLevel);

  React.useEffect(() => {
    const freshSortedLevels = [...rules].sort((a, b) => {
      const aId = Number(a.level !== undefined ? a.level : a.id);
      const bId = Number(b.level !== undefined ? b.level : b.id);
      return aId - bId;
    });
    const freshAvailableLevels = freshSortedLevels.map(l => Number(l.level !== undefined ? l.level : l.id));
    const freshMaxLevel = freshAvailableLevels.length > 0 ? Math.max(...freshAvailableLevels) : 5;
    const freshDefaultInspectLevel = Number(results.level) < freshMaxLevel ? Number(results.level) + 1 : freshMaxLevel;
    setSelectedInspectLevel(freshDefaultInspectLevel);
  }, [results, rules]);

  const targetLevelObj = sortedLevels.find(l => Number(l.level !== undefined ? l.level : l.id) === Number(selectedInspectLevel)) || sortedLevels[0];

  let pctMissing = 0;
  let metCriteriaCount = 0;
  let totalCriteriaCount = 0;
  let levelMissingList = [];

  if (targetLevelObj && Array.isArray(targetLevelObj.criteria)) {
    totalCriteriaCount = targetLevelObj.criteria.length;
    metCriteriaCount = targetLevelObj.criteria.filter(crit => checkCriterion(answers, crit)).length;
    const pctMet = totalCriteriaCount === 0 ? 100 : Math.round((metCriteriaCount / totalCriteriaCount) * 100);
    pctMissing = 100 - pctMet;

    targetLevelObj.criteria.forEach(crit => {
      if (!checkCriterion(answers, crit)) {
        const itemID = crit.item_id;
        const suggestion = targetLevelObj.improvement_suggestions && targetLevelObj.improvement_suggestions[itemID];
        if (suggestion) {
          levelMissingList.push(suggestion);
        } else {
          levelMissingList.push(`Zahtevano: ${itemID} mora ustrezati pogoju (${crit.operator || '='} ${crit.value})`);
        }
      }
    });
  }

  // 2. Helper to calculate section stats recursively
  const getCategoryStats = (cat) => {
    let filled = 0;
    let total = 0;
    const itemsList = [];
    
    const traverseItem = (item, parentChecked = true) => {
      if (!parentChecked) return;

      const ans = answers[item.id];
      const hasAnswer = ans !== undefined && ans !== null && ans !== '';
      const isOk = ans === true || ans === 'DA' || (item.type === 'text' && ans && ans.trim() !== '') || (item.type === 'numeric' && hasAnswer && !isNaN(ans)) || (item.type === 'multiselect' && Array.isArray(ans) && ans.length > 0);

      if (item.type === 'checkbox' || item.type === 'yes_no_na' || item.type === 'text' || item.type === 'numeric' || item.type === 'multiselect') {
        total += 10;
        if (isOk) filled += 10;
        itemsList.push({ id: item.id, label: item.label, type: item.type, val: ans, isOk });
      }

      if (item.items && item.items.length > 0) {
        const isChecked = ans === true || ans === 'DA';
        item.items.forEach(child => traverseItem(child, isChecked));
      }
    };

    if (cat.items) {
      cat.items.forEach(child => traverseItem(child, true));
    }

    const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
    return { filled, total, pct, itemsList };
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

  // Calculate stats for all categories beforehand to determine initial open state
  const categoriesStats = {};
  categories.forEach(cat => {
    categoriesStats[cat.id] = getCategoryStats(cat);
  });

  // Initialize open state: incomplete categories are OPEN by default, completed ones are CLOSED
  const [openSections, setOpenSections] = React.useState(() => {
    const initial = {};
    categories.forEach(cat => {
      const stats = categoriesStats[cat.id];
      initial[cat.id] = stats.pct < 100; // Open only if incomplete!
    });
    return initial;
  });

  const toggleSection = (catId) => {
    setOpenSections(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const mainContent = (
    <div className={isInline ? "results-printable" : "modal-card modal-card-wide results-printable"} style={isInline ? { width: '100%', padding: 0 } : { maxWidth: '920px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
      {/* Premium Modal Header */}
        <div
          style={{
            background: `linear-gradient(90deg, ${color}1a 0%, var(--panel-bg) 100%)`,
            borderBottom: `1px solid var(--panel-border)`,
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Podrobna analiza zrelosti</span>
            <span
              style={{
                background: `${color}22`,
                color,
                border: `1px solid ${color}55`,
                borderRadius: '20px',
                padding: '3px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              Stopnja {results.level} — {results.levelName}
            </span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '1.1rem' }} onClick={onClose}>X</button>
        </div>

        {/* Modal Content - Split two columns to prevent scrolling */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.22fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Main Stats & Recommendations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Main Stats Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '10px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
              <div
                className="score-circle"
                style={{ '--score': results.score, '--score-color': color, margin: '0 auto 6px', width: '100px', height: '100px' }}
              >
                <div className="score-value" style={{ fontSize: '1.02rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', opacity: 0.8 }}>Stopnja</span>
                  <span style={{ fontSize: '1.7rem', fontWeight: 800 }}>{results.level}</span>
                </div>
              </div>
              
              <div style={{ width: '100%' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Stopnja {results.level} ({results.levelName})
                </h4>
                
                {/* Level selector tabs */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Pregled pogojev za stopnjo:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {sortedLevels.map(lvlObj => {
                      const lvlNum = Number(lvlObj.level !== undefined ? lvlObj.level : lvlObj.id);
                      const isAchieved = lvlNum <= Number(results.level);
                      const isSelected = lvlNum === Number(selectedInspectLevel);
                      
                      return (
                        <button
                          key={lvlNum}
                          className="btn"
                          style={{
                            fontSize: '0.74rem',
                            padding: '4px 10px',
                            minWidth: '32px',
                            borderRadius: '6px',
                            background: isSelected 
                              ? 'var(--accent-color)' 
                              : (isAchieved ? 'rgba(46,160,67,0.15)' : 'rgba(255,255,255,0.03)'),
                            color: isSelected 
                              ? '#fff' 
                              : (isAchieved ? 'var(--success-color)' : 'var(--text-primary)'),
                            border: isSelected 
                              ? '1px solid var(--accent-color)' 
                              : `1px solid ${isAchieved ? 'rgba(46,160,67,0.3)' : 'var(--panel-border)'}`,
                            cursor: 'pointer',
                            fontWeight: isSelected || isAchieved ? 700 : 500,
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => setSelectedInspectLevel(lvlNum)}
                        >
                          {lvlNum}{isAchieved ? ' ✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic level requirements progress */}
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--panel-border)', paddingTop: '14px', textAlign: 'left', width: '100%' }}>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Stopnja {selectedInspectLevel} ({targetLevelObj?.label || targetLevelObj?.name || targetLevelObj?.levelName || ''})
                  </h5>
                  
                  {Number(selectedInspectLevel) <= Number(results.level) ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--success-color)', fontWeight: 600, lineHeight: 1.4 }}>
                      Čestitamo! Ta stopnja zrelosti je že v celoti dosežena. Izpolnjeni pogoji:
                      {targetLevelObj && Array.isArray(targetLevelObj.criteria) && targetLevelObj.criteria.length > 0 && (
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', fontWeight: 'normal' }}>
                          {targetLevelObj.criteria.map((crit, idx) => (
                            <div key={idx} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}>
                              <span style={{ color: 'var(--success-color)' }}>✓</span>
                              <span>
                                <code>{crit.item_id}</code> {crit.operator || '='} <code style={{ color: 'var(--success-color)' }}>{String(crit.value)}</code>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                        {renderMissingPogojevText(totalCriteriaCount - metCriteriaCount)} ({metCriteriaCount} od {totalCriteriaCount} izpolnjeno).
                      </div>
                      {/* Progress Bar towards selected inspect level */}
                      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${100 - pctMissing}%`,
                            background: 'linear-gradient(90deg, var(--accent-color), #8b5cf6)',
                            borderRadius: '3px',
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Improvement Recommendations Card */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '16px 18px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Priporočila za stopnjo {selectedInspectLevel} ({levelMissingList.length})
              </h4>

              {levelMissingList.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(46,160,67,0.06)', border: '1px solid rgba(46,160,67,0.18)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success-color)', fontWeight: 700 }}>
                    <span>✓</span>
                    <span>Vsi pogoji za to stopnjo so izpolnjeni!</span>
                  </div>
                  {targetLevelObj && Array.isArray(targetLevelObj.criteria) && targetLevelObj.criteria.length > 0 && (
                    <div style={{ marginTop: '4px', borderTop: '1px solid rgba(46,160,67,0.12)', paddingTop: '6px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Izpolnjeni kriteriji:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {targetLevelObj.criteria.map((crit, idx) => (
                          <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--success-color)' }}>✓</span>
                            <span>
                              <code style={{ color: 'var(--accent-color)', marginRight: '2px' }}>{crit.item_id}</code>{' '}
                              <strong>{crit.operator || '='}</strong>{' '}
                              <code style={{ color: 'var(--success-color)' }}>{String(crit.value)}</code>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {levelMissingList.map((m, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4, paddingBottom: '6px', borderBottom: i < levelMissingList.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                      <span style={{ color: 'var(--warning-color)', flexShrink: 0 }}>!</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Grouped Section Accordions (NO nested scrollbars!) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Popis po sekcijah (kliknite za razširitev)
            </h4>

            {Object.entries(superGroups).map(([superTitle, groupCats]) => (
              <div key={superTitle} style={{ border: '1px solid rgba(88,166,255,0.15)', borderRadius: '10px', overflow: 'hidden', background: 'rgba(13,17,23,0.2)' }}>
                
                {/* Supercategory header */}
                <div style={{ background: 'rgba(88,166,255,0.06)', padding: '8px 14px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(88,166,255,0.1)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{superTitle}</span>
                </div>

                {/* Section Accordions */}
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {groupCats.map(cat => {
                    const { pct, itemsList } = categoriesStats[cat.id];
                    const catColor = scoreColor(pct);
                    const isSectionOpen = !!openSections[cat.id];
                    
                    return (
                      <div 
                        key={cat.id} 
                        style={{ 
                          background: 'rgba(255,255,255,0.01)', 
                          border: '1px solid var(--panel-border)', 
                          borderRadius: '8px', 
                          overflow: 'hidden',
                          transition: 'all 0.2s ease',
                          boxShadow: isSectionOpen ? '0 4px 10px rgba(0,0,0,0.12)' : 'none'
                        }}
                      >
                        {/* Accordion Card Header */}
                        <div 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '10px 12px', 
                            background: 'var(--panel-bg)',
                            borderBottom: isSectionOpen ? '1px solid var(--panel-border)' : 'none',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                          onClick={() => toggleSection(cat.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.8rem', opacity: 0.6, display: 'inline-block', width: '12px' }}>{isSectionOpen ? '▾' : '▸'}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cat.title}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                              ({itemsList.length})
                            </span>
                          </div>
                        </div>

                        {/* Category progress bar */}
                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: catColor }} />
                        </div>

                        {/* Category items checklist - Collapsible and fully fluid (NO scroll hell!) */}
                        {isSectionOpen && (
                          <div style={{ padding: '10px 12px', background: 'rgba(13,17,23,0.15)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {itemsList.map(item => (
                              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', fontSize: '0.76rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', color: item.isOk ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                  <span style={{ color: item.isOk ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 'bold', flexShrink: 0 }}>
                                    {item.isOk ? '✓' : 'X'}
                                  </span>
                                  <span>{item.label}</span>
                                </div>
                                <span style={{ color: item.isOk ? 'var(--success-color)' : 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                                  {item.isOk ? 'DA' : (item.val === 'NA' ? '/' : 'NE')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer Actions */}
        <div
          style={{
            background: 'var(--panel-bg)',
            borderTop: '1px solid var(--panel-border)',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={onClose}>Zapri okence</button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                const printStyle = document.createElement('style');
                printStyle.innerHTML = `
                  @media print {
                    body * { visibility: hidden; }
                    .results-printable, .results-printable * { visibility: visible; }
                    .results-printable { position: absolute; left: 0; top: 0; width: 100% !important; max-width: 100% !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; border: none !important; background: #fff !important; color: #000 !important; }
                    .btn, button, .modal-overlay { display: none !important; }
                    .score-circle { border: 4px solid var(--score-color) !important; background: transparent !important; }
                  }
                `;
                document.head.appendChild(printStyle);
                window.print();
                document.head.removeChild(printStyle);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🖨️ Izvozi PDF
            </button>
          </div>
          
          {!isReadOnly && (
            <button
              className="btn btn-success"
              onClick={() => {
                if (window.opener && typeof window.opener.triggerSaveFromResults === 'function') {
                  window.opener.triggerSaveFromResults();
                  window.close();
                } else if (onSave) {
                  onSave();
                  onClose();
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ✓ Shrani ocenjevanje
            </button>
          )}
        </div>

    </div>
  );

  if (isInline) {
    return (
      <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px', overflow: 'hidden' }}>
        {mainContent}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {mainContent}
    </div>
  );
}
