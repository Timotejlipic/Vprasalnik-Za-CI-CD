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

export default function ResultsPanel({ 
  results, 
  onSave, 
  isLoggedIn, 
  isReadOnly,
  categories = [],
  rules = [],
  answers = {},
  onClose
}) {
  const color = scoreColor(results.score);

<<<<<<< HEAD
=======
  // 1. Find next level and calculate % missing of criteria
>>>>>>> 18ff9dc (updates and fixes)
  const sortedLevels = [...rules].sort((a, b) => {
    const aId = a.level !== undefined ? a.level : a.id;
    const bId = b.level !== undefined ? b.level : b.id;
    return aId - bId;
  });

  const nextLevelObj = sortedLevels.find(l => (l.level !== undefined ? l.level : l.id) === results.level + 1);

  let pctMissing = 0;
  let metCriteriaCount = 0;
  let totalCriteriaCount = 0;

  if (nextLevelObj && Array.isArray(nextLevelObj.criteria)) {
    totalCriteriaCount = nextLevelObj.criteria.length;
    metCriteriaCount = nextLevelObj.criteria.filter(crit => checkCriterion(answers, crit)).length;
    const pctMet = totalCriteriaCount === 0 ? 100 : Math.round((metCriteriaCount / totalCriteriaCount) * 100);
    pctMissing = 100 - pctMet;
  }

<<<<<<< HEAD
=======
  // 2. Helper to calculate section stats recursively
>>>>>>> 18ff9dc (updates and fixes)
  const getCategoryStats = (cat) => {
    let filled = 0;
    let total = 0;
    const itemsList = [];
    
    const traverseItem = (item) => {
      const ans = answers[item.id];
      const hasAnswer = ans !== undefined && ans !== null && ans !== '';
      const isOk = ans === true || ans === 'DA' || (item.type === 'text' && ans && ans.trim() !== '') || (item.type === 'numeric' && hasAnswer && !isNaN(ans)) || (item.type === 'multiselect' && Array.isArray(ans) && ans.length > 0);

      if (item.type === 'checkbox' || item.type === 'yes_no_na') {
        total += 10;
        if (isOk) filled += 10;
        itemsList.push({ id: item.id, label: item.label, type: item.type, val: ans, isOk });
      } else if (item.type === 'text' || item.type === 'numeric' || item.type === 'multiselect') {
        total += 10;
        if (isOk) filled += 10;
        itemsList.push({ id: item.id, label: item.label, type: item.type, val: ans, isOk });
      }

      if (item.items && item.items.length > 0) {
        item.items.forEach(traverseItem);
      }
    };

    if (cat.items) {
      cat.items.forEach(traverseItem);
    }

    const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
    return { filled, total, pct, itemsList };
  };

<<<<<<< HEAD
=======
  // Group categories by superCategory
>>>>>>> 18ff9dc (updates and fixes)
  const superGroups = {};
  categories.forEach(cat => {
    const superTitle = cat.superCategory || "CI/CD Proces";
    if (!superGroups[superTitle]) {
      superGroups[superTitle] = [];
    }
    superGroups[superTitle].push(cat);
  });

<<<<<<< HEAD
=======
  // Calculate stats for all categories beforehand to determine initial open state
>>>>>>> 18ff9dc (updates and fixes)
  const categoriesStats = {};
  categories.forEach(cat => {
    categoriesStats[cat.id] = getCategoryStats(cat);
  });

<<<<<<< HEAD
=======
  // Initialize open state: incomplete categories are OPEN by default, completed ones are CLOSED
>>>>>>> 18ff9dc (updates and fixes)
  const [openSections, setOpenSections] = React.useState(() => {
    const initial = {};
    categories.forEach(cat => {
      const stats = categoriesStats[cat.id];
<<<<<<< HEAD
      initial[cat.id] = stats.pct < 100; 
=======
      initial[cat.id] = stats.pct < 100; // Open only if incomplete!
>>>>>>> 18ff9dc (updates and fixes)
    });
    return initial;
  });

  const toggleSection = (catId) => {
    setOpenSections(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card modal-card-wide" style={{ maxWidth: '920px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
        
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
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '1.1rem' }} onClick={onClose}>✕</button>
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
                <div className="score-value" style={{ fontSize: '1.5rem' }}>{results.score}%</div>
              </div>
              
              <div style={{ width: '100%' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Stopnja {results.level} ({results.levelName})
                </h4>
                
                {nextLevelObj ? (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                      Do stopnje {results.level + 1} ({nextLevelObj.label || nextLevelObj.name}) vam manjka še <strong>{pctMissing}%</strong> pogojev ({totalCriteriaCount - metCriteriaCount} od {totalCriteriaCount} kriterijev).
                    </div>
                    {/* Progress Bar towards next level */}
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
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--success-color)', fontWeight: 600, marginTop: '8px' }}>
                    Čestitamo! Cevovod že dosega najvišjo stopnjo zrelosti.
                  </div>
                )}
              </div>
            </div>

            {/* Improvement Recommendations Card */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '16px 18px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Priporočila za napredek ({results.missing.length})
              </h4>

              {results.missing.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px', background: 'rgba(46,160,67,0.06)', border: '1px solid rgba(46,160,67,0.18)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.3rem', color: 'var(--success-color)' }}>✓</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Vsi pogoji so izpolnjeni!</span>
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {results.missing.map((m, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4, paddingBottom: '6px', borderBottom: i < results.missing.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                      <span style={{ color: 'var(--warning-color)', flexShrink: 0 }}>⚠</span>
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
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: catColor, background: `${catColor}12`, padding: '1px 8px', borderRadius: '10px', border: `1px solid ${catColor}25` }}>
                            {pct}%
                          </span>
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
                                    {item.isOk ? '✓' : '✕'}
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
          <button className="btn btn-ghost" onClick={onClose}>Zapri okence</button>
          
          {isLoggedIn && !isReadOnly && (
            <button className="btn btn-success" onClick={() => { onSave(); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✓ Shrani ocenjevanje
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
