import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

function LevelModal({ levelObj, onSave, onClose, categories }) {
  const [levelNum, setLevelNum] = useState(levelObj?.level !== undefined ? levelObj.level : (levelObj?.id || 1));
  const [name, setName] = useState(levelObj?.name || levelObj?.label || '');
  const [description, setDescription] = useState(levelObj?.description || levelObj?.short_description || '');
  const [fullDescription, setFullDescription] = useState(levelObj?.full_description || '');
  const [minScore, setMinScore] = useState(levelObj?.minScore !== undefined ? levelObj.minScore : '');
  
<<<<<<< HEAD
  const [editorMode, setEditorMode] = useState('visual'); 

=======
  // Choose visual as the default editor view
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' | 'json'

  // Extract all questions recursively from categories
>>>>>>> 18ff9dc (updates and fixes)
  const allQuestions = [];
  const extractQuestionsRecursively = (items, catTitle) => {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      allQuestions.push({
        id: item.id,
        label: item.label,
        category: catTitle
      });
      if (item.items && item.items.length > 0) {
        extractQuestionsRecursively(item.items, catTitle);
      }
    });
  };

  if (categories && Array.isArray(categories)) {
    categories.forEach(cat => {
      extractQuestionsRecursively(cat.items, cat.title);
    });
  }

<<<<<<< HEAD
=======
  // Group questions by category for `<optgroup>`
>>>>>>> 18ff9dc (updates and fixes)
  const groupedQuestions = allQuestions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {});

<<<<<<< HEAD
=======
  // Initialize visual criteria as a structured array
>>>>>>> 18ff9dc (updates and fixes)
  const [visualCriteria, setVisualCriteria] = useState(() => {
    return Array.isArray(levelObj?.criteria) ? levelObj.criteria.map(c => ({
      item_id: c.item_id || '',
      operator: c.operator || 'equals',
      value: c.value !== undefined ? String(c.value) : '',
      custom_id: !allQuestions.some(q => q.id === c.item_id)
    })) : [];
  });

<<<<<<< HEAD
=======
  // Initialize visual suggestions as a structured array
>>>>>>> 18ff9dc (updates and fixes)
  const [visualSuggestions, setVisualSuggestions] = useState(() => {
    if (levelObj?.improvement_suggestions && typeof levelObj.improvement_suggestions === 'object' && !Array.isArray(levelObj.improvement_suggestions)) {
      return Object.entries(levelObj.improvement_suggestions).map(([key, val]) => ({
        item_id: key,
        text: val,
        custom_id: !allQuestions.some(q => q.id === key)
      }));
    }
    return [];
  });

<<<<<<< HEAD
=======
  // JSON strings as fallback/alternative
>>>>>>> 18ff9dc (updates and fixes)
  const [criteriaStr, setCriteriaStr] = useState(
    levelObj?.criteria ? JSON.stringify(levelObj.criteria, null, 2) : '[]'
  );
  const [suggestionsStr, setSuggestionsStr] = useState(
    levelObj?.improvement_suggestions ? JSON.stringify(levelObj.improvement_suggestions, null, 2) : '{}'
  );
  
  const [error, setError] = useState('');

  const handleSwitchMode = (newMode) => {
    if (newMode === 'visual') {
<<<<<<< HEAD
=======
      // Parse JSON from textareas back to visual states
>>>>>>> 18ff9dc (updates and fixes)
      try {
        const parsedCrit = JSON.parse(criteriaStr);
        if (!Array.isArray(parsedCrit)) {
          setError('Napaka: Kriteriji v JSON-u morajo biti polje (array).');
          return;
        }
        setVisualCriteria(parsedCrit.map(c => ({
          item_id: c.item_id || '',
          operator: c.operator || 'equals',
          value: c.value !== undefined ? String(c.value) : '',
          custom_id: !allQuestions.some(q => q.id === c.item_id)
        })));
      } catch (e) {
        setError('Ne morem preklopiti: Kriteriji imajo neveljaven JSON (' + e.message + ')');
        return;
      }

      try {
        const parsedSugg = JSON.parse(suggestionsStr);
        if (typeof parsedSugg !== 'object' || Array.isArray(parsedSugg)) {
          setError('Napaka: Priporočila v JSON-u morajo biti objekt.');
          return;
        }
        setVisualSuggestions(Object.entries(parsedSugg).map(([key, val]) => ({
          item_id: key,
          text: val,
          custom_id: !allQuestions.some(q => q.id === key)
        })));
      } catch (e) {
        setError('Ne morem preklopiti: Priporočila imajo neveljaven JSON (' + e.message + ')');
        return;
      }

      setError('');
    } else {
<<<<<<< HEAD
=======
      // Serialize visual states to JSON strings
>>>>>>> 18ff9dc (updates and fixes)
      const critPayload = visualCriteria.map(c => {
        let parsedVal = c.value;
        if (c.value === 'true') parsedVal = true;
        else if (c.value === 'false') parsedVal = false;
        else if (c.value.trim() !== '' && !isNaN(c.value)) parsedVal = Number(c.value);

        return {
          item_id: c.item_id,
          operator: c.operator,
          value: parsedVal
        };
      });
      setCriteriaStr(JSON.stringify(critPayload, null, 2));

      const suggPayload = {};
      visualSuggestions.forEach(s => {
        if (s.item_id.trim()) {
          suggPayload[s.item_id.trim()] = s.text;
        }
      });
      setSuggestionsStr(JSON.stringify(suggPayload, null, 2));
    }
    setEditorMode(newMode);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Ime stopnje je obvezno.');
      return;
    }
    
    let finalCriteria = [];
    let finalSuggestions = {};

    if (editorMode === 'visual') {
<<<<<<< HEAD
=======
      // Construct criteria from visual list
>>>>>>> 18ff9dc (updates and fixes)
      for (const c of visualCriteria) {
        if (!c.item_id.trim()) {
          setError('Napaka: Vsi kriteriji morajo imeti izbrano ali vpisano vprašanje.');
          return;
        }
        
        let parsedVal = c.value;
        if (c.value === 'true') parsedVal = true;
        else if (c.value === 'false') parsedVal = false;
        else if (c.value.trim() !== '' && !isNaN(c.value)) parsedVal = Number(c.value);

        finalCriteria.push({
          item_id: c.item_id.trim(),
          operator: c.operator,
          value: parsedVal
        });
      }

<<<<<<< HEAD
=======
      // Construct suggestions from visual list
>>>>>>> 18ff9dc (updates and fixes)
      for (const s of visualSuggestions) {
        if (!s.item_id.trim()) {
          setError('Napaka: Vsa priporočila morajo imeti določen ID vprašanja.');
          return;
        }
        finalSuggestions[s.item_id.trim()] = s.text.trim();
      }
    } else {
<<<<<<< HEAD
=======
      // Validate and parse JSON from textareas
>>>>>>> 18ff9dc (updates and fixes)
      try {
        finalCriteria = JSON.parse(criteriaStr);
        if (!Array.isArray(finalCriteria)) {
          setError('Kriteriji morajo biti JSON polje (array).');
          return;
        }
      } catch (e) {
        setError('Neveljaven JSON za kriterije: ' + e.message);
        return;
      }

      try {
        finalSuggestions = JSON.parse(suggestionsStr);
        if (typeof finalSuggestions !== 'object' || Array.isArray(finalSuggestions)) {
          setError('Priporočila morajo biti JSON objekt.');
          return;
        }
      } catch (e) {
        setError('Neveljaven JSON za priporočila: ' + e.message);
        return;
      }
    }

    const levelInt = parseInt(levelNum, 10);
    const payload = {
      ...levelObj,
      level: levelInt,
<<<<<<< HEAD
      id: levelInt, 
      name: name.trim(),
      label: name.trim(), 
      description: description.trim(),
      short_description: description.trim(), 
=======
      id: levelInt, // keep both for compatibility
      name: name.trim(),
      label: name.trim(), // keep both for compatibility
      description: description.trim(),
      short_description: description.trim(), // keep both for compatibility
>>>>>>> 18ff9dc (updates and fixes)
      full_description: fullDescription.trim(),
      criteria: finalCriteria,
      improvement_suggestions: finalSuggestions
    };

    if (minScore !== '') {
      payload.minScore = parseInt(minScore, 10);
    } else {
      delete payload.minScore;
    }

    onSave(payload);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>{levelObj?.id !== undefined || levelObj?.level !== undefined ? '✎ Uredi stopnjo zrelosti' : '＋ Nova stopnja zrelosti'}</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
          <div className="form-group">
            <label className="form-label">Številka stopnje *</label>
            <input
              type="number"
              className="form-control"
              value={levelNum}
              onChange={e => setLevelNum(e.target.value)}
              min="1"
              max="20"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ime / Oznaka stopnje *</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="npr. Nivo 3 – Konsistenten"
              autoFocus
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
          <div className="form-group">
            <label className="form-label">Minimalni rezultat (%) (samo za navadna pravila)</label>
            <input
              type="number"
              className="form-control"
              value={minScore}
              onChange={e => setMinScore(e.target.value)}
              placeholder="npr. 50"
              min="0"
              max="100"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label className="form-label">Kratek opis</label>
          <textarea
            className="form-control"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Kratek opis stopnje zrelosti"
            style={{ width: '100%', height: '55px', background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '6px', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Podroben opis (neobvezno)</label>
          <textarea
            className="form-control"
            value={fullDescription}
            onChange={e => setFullDescription(e.target.value)}
            placeholder="Podrobnejši opis zrelostnih pogojev"
            style={{ width: '100%', height: '55px', background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '6px', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Tabbed Editor Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <button
            type="button"
            className={`btn ${editorMode === 'visual' ? 'btn-accent' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '6px 12px', fontSize: '0.82rem', borderRadius: '6px' }}
            onClick={() => handleSwitchMode('visual')}
          >
            Vizualni urejevalnik
          </button>
          <button
            type="button"
            className={`btn ${editorMode === 'json' ? 'btn-accent' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '6px 12px', fontSize: '0.82rem', borderRadius: '6px' }}
            onClick={() => handleSwitchMode('json')}
          >
            JSON
          </button>
        </div>

        {/* --- CRITERIA EDITOR --- */}
        {editorMode === 'visual' ? (
          <div style={{ marginBottom: '18px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>Logični pogoji / Kriteriji stopnje</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Filtri za določanje nivoja zrelosti</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', marginBottom: '10px' }}>
              {visualCriteria.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '16px', border: '1px dashed var(--panel-border)', borderRadius: '6px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                  Ni določenih pogojev. Strežnik bo uporabil le minimalni rezultat %.
                </div>
              ) : (
                visualCriteria.map((c, idx) => (
                  <div key={idx} className="builder-item-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', marginBottom: '4px', transition: 'all 0.2s' }}>
                    
                    {/* Item ID selector */}
                    <div style={{ flex: 2.2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {c.custom_id ? (
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '0.8rem', padding: '5px 8px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)' }}
                          value={c.item_id}
                          placeholder="ID vprašanja (npr. b_cache)"
                          onChange={e => {
                            const newCrit = [...visualCriteria];
                            newCrit[idx].item_id = e.target.value;
                            setVisualCriteria(newCrit);
                          }}
                        />
                      ) : (
                        <select
                          className="form-control"
                          style={{ fontSize: '0.8rem', padding: '5px 8px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)' }}
                          value={c.item_id}
                          onChange={e => {
                            const val = e.target.value;
                            const newCrit = [...visualCriteria];
                            if (val === '__custom__') {
                              newCrit[idx].custom_id = true;
                              newCrit[idx].item_id = '';
                            } else {
                              newCrit[idx].item_id = val;
                            }
                            setVisualCriteria(newCrit);
                          }}
                        >
                          <option value="">-- Izberi vprašanje --</option>
                          {Object.entries(groupedQuestions).map(([category, questions]) => (
                            <optgroup key={category} label={category}>
                              {questions.map(q => (
                                <option key={q.id} value={q.id}>
                                  {q.label.length > 40 ? q.label.substring(0, 40) + '...' : q.label} ({q.id})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          <option value="__custom__">✎ Ročni vnos ID-ja...</option>
                        </select>
                      )}
                    </div>

                    {/* Operator */}
                    <select
                      className="form-control"
                      style={{ flex: 1.1, fontSize: '0.8rem', padding: '5px 8px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)' }}
                      value={c.operator}
                      onChange={e => {
                        const newCrit = [...visualCriteria];
                        newCrit[idx].operator = e.target.value;
                        setVisualCriteria(newCrit);
                      }}
                    >
                      <option value="equals">=</option>
                      <option value="not_equals">≠</option>
                      <option value="gte">≥</option>
                      <option value="lte">≤</option>
                      <option value="gt">&gt;</option>
                      <option value="lt">&lt;</option>
                      <option value="contains">vsebuje</option>
                      <option value="contains_all">vsebuje vse</option>
                      <option value="contains_any">vsebuje poljubno</option>
                      <option value="is_checked">je označeno</option>
                      <option value="is_not_empty">ni prazno</option>
                    </select>

                    {/* Value */}
                    <div style={{ flex: 1.3 }}>
                      {c.operator === 'is_checked' || c.operator === 'is_not_empty' ? (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', padding: '6px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                          ni potrebno
                        </div>
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '0.8rem', padding: '5px 8px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)' }}
                          value={c.value}
                          placeholder="Vrednost (npr. DA)"
                          onChange={e => {
                            const newCrit = [...visualCriteria];
                            newCrit[idx].value = e.target.value;
                            setVisualCriteria(newCrit);
                          }}
                        />
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      {c.custom_id && allQuestions.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--accent-color)' }}
                          onClick={() => {
                            const newCrit = [...visualCriteria];
                            newCrit[idx].custom_id = false;
                            newCrit[idx].item_id = '';
                            setVisualCriteria(newCrit);
                          }}
                          title="Nazaj na seznam vprašanj"
                        >
                          Seznam
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--danger-color)' }}
                        onClick={() => {
                          setVisualCriteria(visualCriteria.filter((_, i) => i !== idx));
                        }}
                        title="Odstrani ta pogoj"
                      >
                        ✕
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', padding: '6px 10px', color: 'var(--accent-color)', border: '1px dashed rgba(88,166,255,0.3)', background: 'rgba(88,166,255,0.02)', width: '100%', borderRadius: '6px' }}
              onClick={() => {
                setVisualCriteria([...visualCriteria, { item_id: '', operator: 'equals', value: '', custom_id: allQuestions.length === 0 }]);
              }}
            >
              ＋ Dodaj nov kriterij
            </button>
          </div>
        ) : (
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <div className="flex-between" style={{ marginBottom: '4px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Kriteriji (JSON format)</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Polje objektov z: item_id, operator, value</span>
            </div>
            <textarea
              className="form-control"
              value={criteriaStr}
              onChange={e => setCriteriaStr(e.target.value)}
              style={{ width: '100%', height: '100px', background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '6px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
            />
          </div>
        )}

        {/* --- SUGGESTIONS EDITOR --- */}
        {editorMode === 'visual' ? (
          <div style={{ marginBottom: '20px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>Priporočila za izboljšanje</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Nasveti za ekipe, če ne izpolnijo tega pogoja</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', marginBottom: '10px' }}>
              {visualSuggestions.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '16px', border: '1px dashed var(--panel-border)', borderRadius: '6px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                  Ni določenih priporočil za izboljšanje.
                </div>
              ) : (
                visualSuggestions.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', marginBottom: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Item ID selector */}
                      <div style={{ flex: 1 }}>
                        {s.custom_id ? (
                          <input
                            type="text"
                            className="form-control"
                            style={{ fontSize: '0.8rem', padding: '5px 8px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)' }}
                            value={s.item_id}
                            placeholder="ID vprašanja (npr. b_cache)"
                            onChange={e => {
                              const newSugg = [...visualSuggestions];
                              newSugg[idx].item_id = e.target.value;
                              setVisualSuggestions(newSugg);
                            }}
                          />
                        ) : (
                          <select
                            className="form-control"
                            style={{ fontSize: '0.8rem', padding: '5px 8px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)' }}
                            value={s.item_id}
                            onChange={e => {
                              const val = e.target.value;
                              const newSugg = [...visualSuggestions];
                              if (val === '__custom__') {
                                newSugg[idx].custom_id = true;
                                newSugg[idx].item_id = '';
                              } else {
                                newSugg[idx].item_id = val;
                              }
                              setVisualSuggestions(newSugg);
                            }}
                          >
                            <option value="">-- Izberi vprašanje --</option>
                            {Object.entries(groupedQuestions).map(([category, questions]) => (
                              <optgroup key={category} label={category}>
                                {questions.map(q => (
                                  <option key={q.id} value={q.id}>
                                    {q.label.length > 50 ? q.label.substring(0, 50) + '...' : q.label} ({q.id})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                            <option value="__custom__">✎ Ročni vnos ID-ja...</option>
                          </select>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {s.custom_id && allQuestions.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--accent-color)' }}
                            onClick={() => {
                              const newSugg = [...visualSuggestions];
                              newSugg[idx].custom_id = false;
                              newSugg[idx].item_id = '';
                              setVisualSuggestions(newSugg);
                            }}
                            title="Nazaj na seznam vprašanj"
                          >
                            Seznam
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--danger-color)' }}
                          onClick={() => {
                            setVisualSuggestions(visualSuggestions.filter((_, i) => i !== idx));
                          }}
                          title="Odstrani priporočilo"
                        >
                          ✕ Odstrani
                        </button>
                      </div>
                    </div>

                    {/* Recommendation Text */}
                    <textarea
                      className="form-control"
                      value={s.text}
                      onChange={e => {
                        const newSugg = [...visualSuggestions];
                        newSugg[idx].text = e.target.value;
                        setVisualSuggestions(newSugg);
                      }}
                      placeholder="Besedilo priporočila (kaj naj ekipa stori/popravi...)"
                      style={{ width: '100%', height: '50px', background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '6px', fontSize: '0.82rem', resize: 'vertical' }}
                    />

                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', padding: '6px 10px', color: 'var(--accent-color)', border: '1px dashed rgba(88,166,255,0.3)', background: 'rgba(88,166,255,0.02)', width: '100%', borderRadius: '6px' }}
              onClick={() => {
                setVisualSuggestions([...visualSuggestions, { item_id: '', text: '', custom_id: allQuestions.length === 0 }]);
              }}
            >
              ＋ Dodaj novo priporočilo
            </button>
          </div>
        ) : (
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '4px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Priporočila za izboljšanje (JSON format)</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Objekt ključev vprašanj z besedilom priporočila</span>
            </div>
            <textarea
              className="form-control"
              value={suggestionsStr}
              onChange={e => setSuggestionsStr(e.target.value)}
              style={{ width: '100%', height: '100px', background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '6px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
            />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '12px', background: 'var(--danger-bg)', padding: '7px 10px', borderRadius: '5px' }}>
            {error}
          </div>
        )}

        <div className="flex-between">
          <button className="btn btn-ghost" onClick={onClose}>Prekliči</button>
          <button className="btn btn-accent" onClick={handleSave}>Shrani stopnjo</button>
        </div>
      </div>
    </div>
  );
}

export default function Rules({
  rules,
  setRules,
  rulesVersions = [],
  selectedRulesVersion,
  setSelectedRulesVersion,
  loadRulesForVersion,
  setRulesVersions,
  userRole,
  categories
}) {
  const isAdmin = userRole === 'admin';
<<<<<<< HEAD
  const [editingLevel, setEditingLevel] = useState(null); 
=======
  const [editingLevel, setEditingLevel] = useState(null); // rules object or {} for new
>>>>>>> 18ff9dc (updates and fixes)
  const [localRulesVersion, setLocalRulesVersion] = useState(selectedRulesVersion || '');
  const [openLevels, setOpenLevels] = useState({});

  useEffect(() => {
    if (selectedRulesVersion && selectedRulesVersion !== localRulesVersion) {
      setLocalRulesVersion(selectedRulesVersion);
    }
  }, [selectedRulesVersion]);

  const toggleLevel = (levelId) => {
    setOpenLevels(prev => ({
      ...prev,
      [levelId]: !prev[levelId]
    }));
  };

  const expandAll = () => {
    const next = {};
    rules.forEach(r => {
      const levelId = r.level !== undefined ? r.level : r.id;
      next[levelId] = true;
    });
    setOpenLevels(next);
  };

  const collapseAll = () => {
    const next = {};
    rules.forEach(r => {
      const levelId = r.level !== undefined ? r.level : r.id;
      next[levelId] = false;
    });
    setOpenLevels(next);
  };

  const handleLocalImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          let importedRules = null;
          if (Array.isArray(data)) {
            importedRules = data;
          } else if (data.rules && Array.isArray(data.rules)) {
            importedRules = data.rules;
          } else if (data.levels && Array.isArray(data.levels)) {
            importedRules = data.levels;
          }
          
          if (importedRules) {
            const normalizedRules = importedRules.map(r => {
              const level = r.level !== undefined ? r.level : (r.id !== undefined ? r.id : 0);
              const minScore = r.minScore !== undefined ? r.minScore : (r.min_score !== undefined ? r.min_score : 0);
              const name = r.name || r.label || '';
              const description = r.description || r.short_description || '';
              return {
                level: parseInt(level, 10),
                name: String(name).trim(),
                description: String(description).trim(),
                minScore: parseInt(minScore, 10),
                full_description: r.full_description || '',
                criteria: Array.isArray(r.criteria) ? r.criteria : [],
                improvement_suggestions: r.improvement_suggestions && typeof r.improvement_suggestions === 'object' && !Array.isArray(r.improvement_suggestions) ? r.improvement_suggestions : {}
              };
            });

<<<<<<< HEAD
=======
            // Version support
>>>>>>> 18ff9dc (updates and fixes)
            const version = data.version ? String(data.version) : `import_${Date.now()}`;
            const rulesVersionObj = {
              version,
              title: data.title || `Uvožena pravila ${version}`,
              description: data.description || '',
              levels: normalizedRules
            };

<<<<<<< HEAD
=======
            // Save versioned rules
>>>>>>> 18ff9dc (updates and fixes)
            api.saveRulesVersion(rulesVersionObj)
              .then(() => {
                setRules(normalizedRules);
                setLocalRulesVersion(version);
                if (setSelectedRulesVersion) setSelectedRulesVersion(version);
                if (loadRulesForVersion) loadRulesForVersion(version);
                
<<<<<<< HEAD
=======
                // Refresh rulesVersions list in App
>>>>>>> 18ff9dc (updates and fixes)
                if (api.getRulesVersions && setRulesVersions) {
                  api.getRulesVersions().then(versions => {
                    setRulesVersions(versions || []);
                  });
                }
                alert(`Pravila stopenj zrelosti "${rulesVersionObj.title}" (v${version}) uspešno uvožena in shranjena!`);
              })
              .catch(err => {
                alert('Napaka pri shranjevanju uvoženih pravil: ' + err.message);
              });
          } else {
            alert('Napačen format datoteke za pravila zrelosti.');
          }
        } catch (err) {
          alert('Napaka pri uvozu: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleLocalExport = () => {
    const hasCustomCriteria = rules && rules.some(r => Array.isArray(r.criteria));
    let exportData;

<<<<<<< HEAD
=======
    // Find current rules version object for metadata if available
>>>>>>> 18ff9dc (updates and fixes)
    const currentVersionObj = rulesVersions.find(v => v.version === localRulesVersion);
    const ver = localRulesVersion || "1.0";
    const title = currentVersionObj?.title || "CI/CD Pipeline Maturity Model – Pravila za določanje nivoja zrelosti";
    const description = currentVersionObj?.description || "Pravila za izračun nivoja zrelosti CI/CD cevovoda. Sistem preveri pogoje od nivoja 5 navzdol in dodeli najvišji nivo, pri katerem so izpolnjeni vsi pogoji.";
    
    if (hasCustomCriteria) {
      exportData = {
        version: ver,
        title: title,
        description: description,
        evaluation_strategy: "highest_satisfied",
        rule_operators: {
          "=": "Vrednost je enaka (privzeto za checkbox in tekst)",
          ">=": "Vrednost je večja ali enaka (za numeric)",
          ">": "Vrednost je večja (za numeric)",
          "<=": "Vrednost je manjša ali enaka (za numeric)",
          "<": "Vrednost je manjša (za numeric)",
          "includes": "Multiselect vsebuje dano vrednost; za zahtevo po več vrednostih se navede ločeno pravilo za vsako"
        },
        levels: rules
      };
    } else {
      exportData = {
        version: ver,
        title: title,
        description: description,
        rules: rules
      };
    }
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maturity_rules_export_${ver}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveLevel = async (newLevel) => {
    const levelId = newLevel.level !== undefined ? newLevel.level : newLevel.id;
    
    const normalizedLevel = {
      level: parseInt(levelId, 10),
      name: (newLevel.name || '').trim(),
      description: (newLevel.description || '').trim(),
      minScore: parseInt(newLevel.minScore || 0, 10),
      full_description: (newLevel.full_description || '').trim(),
      criteria: newLevel.criteria || [],
      improvement_suggestions: newLevel.improvement_suggestions || {}
    };

    const exists = rules.some(r => {
      const rId = r.level !== undefined ? r.level : r.id;
      return rId === normalizedLevel.level;
    });

    try {
      let updatedRulesList = [];
      if (exists) {
        updatedRulesList = rules.map(r => {
          const rId = r.level !== undefined ? r.level : r.id;
          return rId === normalizedLevel.level ? normalizedLevel : r;
        });
      } else {
        updatedRulesList = [...rules, normalizedLevel];
      }

      if (localRulesVersion) {
<<<<<<< HEAD
=======
        // If a version is active, find the corresponding version in rulesVersions,
        // update its nested `levels` array, and save it.
>>>>>>> 18ff9dc (updates and fixes)
        const currentVersionObj = rulesVersions.find(v => v.version === localRulesVersion);
        if (currentVersionObj) {
          const updatedVersionObj = {
            ...currentVersionObj,
            levels: updatedRulesList
          };
          await api.saveRulesVersion(updatedVersionObj);
          
<<<<<<< HEAD
=======
          // Refresh rulesVersions list
>>>>>>> 18ff9dc (updates and fixes)
          if (setRulesVersions) {
            const versions = await api.getRulesVersions();
            setRulesVersions(versions || []);
          }
        }
      }

<<<<<<< HEAD
=======
      // Legacy fallback
>>>>>>> 18ff9dc (updates and fixes)
      if (exists) {
        await api.updateRule(
          normalizedLevel.level,
          normalizedLevel.name,
          normalizedLevel.description,
          normalizedLevel.minScore,
          normalizedLevel.full_description,
          normalizedLevel.criteria,
          normalizedLevel.improvement_suggestions
        );
      } else {
        await api.saveRules(updatedRulesList);
      }

      setRules(updatedRulesList);
      alert('Pravilo stopnje zrelosti uspešno shranjeno!');
    } catch (err) {
      alert('Napaka pri shranjevanju pravila: ' + err.message);
    }
    setEditingLevel(null);
  };

  const handleDeleteLevel = async (levelId) => {
    if (!window.confirm(`Ali ste prepričani, da želite izbrisati stopnjo ${levelId}?`)) return;
    try {
      const updatedRulesList = rules.filter(r => {
        const rId = r.level !== undefined ? r.level : r.id;
        return rId !== levelId;
      });

<<<<<<< HEAD
      if (localRulesVersion) {.
=======
      if (localRulesVersion) {
        // If a version is active, find corresponding version in rulesVersions,
        // delete from its nested `levels` array, and save it.
>>>>>>> 18ff9dc (updates and fixes)
        const currentVersionObj = rulesVersions.find(v => v.version === localRulesVersion);
        if (currentVersionObj) {
          const updatedVersionObj = {
            ...currentVersionObj,
            levels: updatedRulesList
          };
          await api.saveRulesVersion(updatedVersionObj);
          
<<<<<<< HEAD
=======
          // Refresh rulesVersions list
>>>>>>> 18ff9dc (updates and fixes)
          if (setRulesVersions) {
            const versions = await api.getRulesVersions();
            setRulesVersions(versions || []);
          }
        }
      }

<<<<<<< HEAD
=======
      // Legacy fallback
>>>>>>> 18ff9dc (updates and fixes)
      await api.deleteRule(levelId);

      setRules(updatedRulesList);
      alert('Stopnja zrelosti uspešno izbrisana!');
    } catch (err) {
      alert('Napaka pri brisanju stopnje: ' + err.message);
    }
  };

  const sortedRules = [...rules].sort((a, b) => {
    const aVal = a.level !== undefined ? a.level : a.id;
    const bVal = b.level !== undefined ? b.level : b.id;
    return bVal - aVal;
  });

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <h2 className="page-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>
          Pravila stopenj zrelosti
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isAdmin ? (
            <>
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={handleLocalImport} title="Uvozi JSON pravila zrelosti">⇩ Uvozi pravila</button>
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={handleLocalExport} title="Izvozi pravila v JSON">⇧ Izvozi pravila</button>
              <button className="btn btn-accent" onClick={() => setEditingLevel({})}>＋ Nova stopnja</button>
            </>
          ) : (
            <span className="badge badge-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Način za branje</span>
          )}
        </div>
      </div>

      {/* Version selector */}
      {rulesVersions.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
          padding: '10px 14px',
          background: 'rgba(88,166,255,0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(88,166,255,0.12)',
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
            Aktivna verzija:
          </span>
          <select
            className="form-control"
            value={localRulesVersion || ''}
            onChange={e => {
              const v = e.target.value;
              setLocalRulesVersion(v);
              if (setSelectedRulesVersion) setSelectedRulesVersion(v);
              if (loadRulesForVersion) loadRulesForVersion(v);
            }}
            style={{
              background: 'var(--panel-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--panel-border)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.85rem',
              maxWidth: '320px',
            }}
          >
            {rulesVersions.map(rv => (
              <option key={rv.version} value={rv.version}>
                {rv.title || `Pravila v${rv.version}`} (v{rv.version})
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Uvozite nova pravila zrelosti za dodajanje verzije
          </span>
        </div>
      )}

      <div style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.4' }}>
        Tukaj lahko določite in prilagodite pravila za izračun nivoja zrelosti CI/CD cevovodov. Pravila lahko temeljijo na minimalnem odstotku točk ali pa na naprednih logičnih kriterijih za posamezna vprašanja.
      </div>

      {/* Stats and Accordion Toggle Actions */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {rules.length} stopenj zrelosti določenih
        </span>
        {rules.length > 0 && (
          <>
            <button className="btn btn-ghost" style={{ fontSize: '0.76rem', padding: '2px 8px' }} onClick={expandAll}>Razširi vse</button>
            <button className="btn btn-ghost" style={{ fontSize: '0.76rem', padding: '2px 8px' }} onClick={collapseAll}>Skrči vse</button>
          </>
        )}
      </div>

      {sortedRules.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.3 }}>⊚</div>
          <div>Ni določenih stopenj zrelosti. Kliknite <strong>＋ Nova stopnja</strong> za dodajanje.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sortedRules.map(r => {
          const levelId = r.level !== undefined ? r.level : r.id;
          const levelName = r.name || r.label;
          const levelDesc = r.description || r.short_description;
          const levelFullDesc = r.full_description;
          const minScore = r.minScore;
          const criteria = r.criteria || [];
          const suggestions = r.improvement_suggestions || {};
          const isOpen = !!openLevels[levelId];

          return (
            <div
              key={levelId}
              className="card builder-section"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isOpen ? '12px' : '0px',
                padding: '0px',
                overflow: 'hidden',
                animation: 'fadeIn 0.3s ease',
                border: '1px solid var(--panel-border)',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Collapsible Accordion Header */}
              <div
                className="builder-section-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '13px 18px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderLeft: '4px solid var(--accent-color)',
                  background: isOpen 
                    ? 'linear-gradient(90deg, rgba(88, 166, 255, 0.08) 0%, var(--panel-bg) 100%)' 
                    : 'var(--panel-bg)'
                }}
                onClick={() => toggleLevel(levelId)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <span style={{ opacity: 0.55, fontSize: '0.85rem', flexShrink: 0 }}>
                    {isOpen ? '▾' : '▸'}
                  </span>
                  <span className="badge badge-blue" style={{ fontSize: '0.8rem', padding: '3px 8px', fontWeight: 'bold', flexShrink: 0 }}>
                    Stopnja {levelId}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {levelName}
                  </h3>
                  
                  {/* Compact quick indicators when collapsed */}
                  {!isOpen && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '12px', flexWrap: 'wrap' }}>
                      {minScore !== undefined && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', background: 'rgba(88, 166, 255, 0.08)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          min. {minScore}%
                        </span>
                      )}
                      {criteria.length > 0 ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--success-color)', background: 'rgba(56, 189, 248, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                          {criteria.length} {criteria.length === 1 ? 'pogoj' : criteria.length >= 2 && criteria.length <= 4 ? 'pogoji' : 'pogojev'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.03)', padding: '2px 6px', borderRadius: '4px' }}>
                          brez pogojev
                        </span>
                      )}
                      {Object.keys(suggestions).length > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--warning-color)', background: 'rgba(234, 179, 8, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                          {Object.keys(suggestions).length} {Object.keys(suggestions).length === 1 ? 'nasvet' : Object.keys(suggestions).length >= 2 && Object.keys(suggestions).length <= 4 ? 'nasveti' : 'nasvetov'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '12px' }} onClick={e => e.stopPropagation()}>
                  {isAdmin && (
                    <>
                      <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => setEditingLevel(r)}>
                        ✎ Uredi
                      </button>
                      <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '4px 8px', color: 'var(--danger-color)' }} onClick={() => handleDeleteLevel(levelId)}>
                        ✕ Izbriši
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Collapsible Accordion Content */}
              {isOpen && (
                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(13, 17, 23, 0.2)', borderTop: '1px solid var(--panel-border)' }}>
                  {minScore !== undefined && (
                    <div style={{ fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 600 }}>
                      Zahtevan minimalen rezultat: <span style={{ color: 'var(--text-primary)' }}>{minScore} %</span>
                    </div>
                  )}

                  {levelDesc && (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {levelDesc}
                    </p>
                  )}

                  {levelFullDesc && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: '1.5' }}>
                      {levelFullDesc}
                    </p>
                  )}

                  {criteria.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Kriteriji za stopnjo ({criteria.length}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {criteria.map((crit, idx) => (
                          <span key={idx} className="badge badge-ghost" style={{ fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '4px 10px', borderRadius: '6px' }}>
                            <code style={{ color: 'var(--accent-color)', marginRight: '4px' }}>{crit.item_id}</code>{' '}
                            <strong style={{ color: 'var(--text-secondary)', marginRight: '4px' }}>{crit.operator || '='}</strong>{' '}
                            <code style={{ color: 'var(--success-color)' }}>{String(crit.value)}</code>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(suggestions).length > 0 && (
                    <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Priporočila za izboljšanje ({Object.keys(suggestions).length}):
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {Object.entries(suggestions).map(([itemId, suggText]) => (
                          <li key={itemId} style={{ lineHeight: '1.4' }}>
                            <code style={{ color: 'var(--accent-color)' }}>{itemId}</code>: {suggText}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingLevel !== null && (
        <LevelModal
          levelObj={editingLevel}
          onSave={handleSaveLevel}
          onClose={() => setEditingLevel(null)}
          categories={categories}
        />
      )}
    </div>
  );
}
