import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

// ─── Type badge helper ────────────────────────────────────────────────────────
function typeBadge(type) {
  switch (type) {
    case 'yes_no_na':   return { label: 'DA / NA',           cls: 'badge-blue'   };
    case 'checkbox':    return { label: 'Potrditveno polje',  cls: 'badge-green'  };
    case 'multiselect': return { label: 'Večkratni izbor',   cls: 'badge-purple' };
    case 'numeric':     return { label: 'Številka',           cls: 'badge-yellow' };
    case 'text':        return { label: 'Besedilo',           cls: 'badge-orange' };
    default:            return { label: type || 'Besedilo',   cls: 'badge-orange' };
  }
}

// ─── Recursive item-tree helpers ──────────────────────────────────────────────
function addItemInTree(items, parentId, newItem) {
  return items.map(item => {
    if (item.id === parentId) {
      return { ...item, items: [...(item.items || []), newItem] };
    }
    if (item.items && item.items.length > 0) {
      return { ...item, items: addItemInTree(item.items, parentId, newItem) };
    }
    return item;
  });
}

function editItemInTree(items, targetId, updated) {
  return items.map(item => {
    if (item.id === targetId) {
      return { ...item, ...updated };
    }
    if (item.items && item.items.length > 0) {
      return { ...item, items: editItemInTree(item.items, targetId, updated) };
    }
    return item;
  });
}

function deleteItemInTree(items, targetId) {
  return items
    .filter(item => item.id !== targetId)
    .map(item => {
      if (item.items && item.items.length > 0) {
        return { ...item, items: deleteItemInTree(item.items, targetId) };
      }
      return item;
    });
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function ItemModal({ item, onSave, onClose }) {
  const [label, setLabel] = useState(item?.label || '');
  const [type, setType] = useState(item?.type || 'yes_no_na');
  const [description, setDescription] = useState(item?.description || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!label.trim()) { setError('Oznaka je obvezna.'); return; }
    onSave({ label: label.trim(), type, description: description.trim() });
  };

  const types = [
    { value: 'yes_no_na',   label: 'DA / NA' },
    { value: 'checkbox',    label: 'Potrditveno polje' },
    { value: 'multiselect', label: 'Večkratni izbor' },
    { value: 'numeric',     label: 'Številka' },
    { value: 'text',        label: 'Besedilo' },
  ];

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>{item ? '✎ Uredi element' : '＋ Nov element'}</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Oznaka (vprašanje) *</label>
          <input
            type="text"
            className="form-control"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="npr. Explicit build logging"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tip odgovora</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {types.map(t => {
              const badge = typeBadge(t.value);
              return (
                <label
                  key={t.value}
                  className="checkbox-label"
                  style={{
                    border: `1px solid ${type === t.value ? 'var(--accent-color)' : 'var(--panel-border)'}`,
                    borderRadius: '7px',
                    padding: '4px 10px',
                    background: type === t.value ? 'rgba(88,166,255,0.1)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="item-type"
                    checked={type === t.value}
                    onChange={() => setType(t.value)}
                    style={{ marginRight: '5px' }}
                  />
                  <span className={`badge ${badge.cls}`} style={{ fontSize: '0.72rem' }}>{badge.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Opis / pomoč (neobvezno)</label>
          <input
            type="text"
            className="form-control"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Pojasnilo, ki se prikaže ob vprašanju"
          />
        </div>

        {error && (
          <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '12px', background: 'var(--danger-bg)', padding: '7px 10px', borderRadius: '5px' }}>
            {error}
          </div>
        )}

        <div className="flex-between">
          <button className="btn btn-ghost" onClick={onClose}>Prekliči</button>
          <button className="btn btn-accent" onClick={handleSave}>Shrani element</button>
        </div>
      </div>
    </div>
  );
}

function ExportSuperCategoryModal({ categories, onExport, onClose }) {
  const existingSuperCategories = Array.from(
    new Set(categories.map(c => c.superCategory || "CI/CD Proces").filter(Boolean))
  );
  const [selected, setSelected] = useState(existingSuperCategories[0] || 'CI/CD Proces');

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>⇧ Izvozi nadkategorijo</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Izberite nadkategorijo za izvoz *</label>
          <select
            className="form-control"
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{ width: '100%', background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '6px' }}
          >
            {existingSuperCategories.map(sc => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
          </select>
        </div>

        <div className="flex-between">
          <button className="btn btn-ghost" onClick={onClose}>Prekliči</button>
          <button className="btn btn-accent" onClick={() => { onExport(selected); onClose(); }}>Izvozi v JSON</button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ cat, categories = [], onSave, onClose }) {
  const [title, setTitle] = useState(cat?.title || '');
  const [superCategory, setSuperCategory] = useState(cat?.superCategory !== undefined ? cat.superCategory : 'CI/CD Proces');
  const [error, setError] = useState('');

  const existingSuperCategories = Array.from(
    new Set(categories.map(c => c.superCategory).filter(Boolean))
  );
  if (!existingSuperCategories.includes('CI/CD Proces')) {
    existingSuperCategories.push('CI/CD Proces');
  }

  const handleSave = () => {
    if (!title.trim()) { setError('Naslov kategorije je obvezen.'); return; }
    onSave({ title: title.trim(), superCategory: superCategory.trim() });
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3>{cat ? '✎ Uredi kategorijo' : '＋ Nova kategorija'}</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label className="form-label">Naslov kategorije *</label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="npr. Security Scanning"
            autoFocus
          />
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Nadkategorija (Super-category)</label>
          <input
            type="text"
            className="form-control"
            value={superCategory}
            onChange={e => setSuperCategory(e.target.value)}
            placeholder="npr. CI/CD Proces, Splošno..."
            list="super-cats-list"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <datalist id="super-cats-list">
            {existingSuperCategories.map(sc => (
              <option key={sc} value={sc} />
            ))}
          </datalist>
        </div>

        {error && (
          <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '12px', background: 'var(--danger-bg)', padding: '7px 10px', borderRadius: '5px' }}>
            {error}
          </div>
        )}

        <div className="flex-between">
          <button className="btn btn-ghost" onClick={onClose}>Prekliči</button>
          <button className="btn btn-accent" onClick={handleSave}>Shrani kategorijo</button>
        </div>
      </div>
    </div>
  );
}

function ParentModal({ existingName, onSave, onClose }) {
  const [name, setName] = useState(existingName || '');
  const [error, setError] = useState('');

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>{existingName ? '✎ Preimenuj nadkategorijo' : '＋ Nova nadkategorija'}</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Ime nadkategorije *</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="npr. Neprekinjena integracija (CI)"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') { if (!name.trim()) { setError('Ime je obvezno.'); return; } onSave(name.trim()); } }}
          />
          {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.82rem', marginTop: '6px' }}>{error}</div>}
        </div>
        <div className="flex-between">
          <button className="btn btn-ghost" onClick={onClose}>Prekliči</button>
          <button className="btn btn-accent" onClick={() => { if (!name.trim()) { setError('Ime je obvezno.'); return; } onSave(name.trim()); }}>Shrani</button>
        </div>
      </div>
    </div>
  );
}

// ─── Recursive item row for the Builder ──────────────────────────────────────
function BuilderItemRow({ item, depth = 0, onEdit, onDelete, onAddSub, isAdmin }) {
  const [subOpen, setSubOpen] = useState(depth === 0);
  const hasChildren = item.items && item.items.length > 0;
  const badge = typeBadge(item.type);

  return (
    <div style={{
      marginLeft: depth > 0 ? `${depth * 18}px` : 0,
      borderLeft: depth > 0 ? '2px solid rgba(88,166,255,0.18)' : 'none',
      paddingLeft: depth > 0 ? '10px' : 0,
    }}>
      {/* Item row */}
      <div
        className="builder-item-row"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          {hasChildren && (
            <span
              style={{ cursor: 'pointer', opacity: 0.6, fontSize: '0.85rem', flexShrink: 0 }}
              onClick={() => setSubOpen(v => !v)}
              title={subOpen ? 'Skrči' : 'Razširi'}
            >
              {subOpen ? '▾' : '▸'}
            </span>
          )}
          {!hasChildren && <span style={{ width: '14px', flexShrink: 0 }} />}
          <span style={{ fontSize: '0.88rem', flex: 1, minWidth: 0, fontWeight: depth === 0 ? 600 : 400 }}>
            {item.label}
          </span>
          {item.description && (
            <span
              title={item.description}
              style={{
                cursor: 'help',
                color: 'var(--accent-color)',
                fontSize: '0.68rem',
                background: 'rgba(88,166,255,0.15)',
                width: '15px', height: '15px',
                borderRadius: '50%',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', flexShrink: 0,
              }}
            >?</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '10px' }}>
          <span className={`badge ${badge.cls}`} style={{ fontSize: '0.7rem' }}>{badge.label}</span>
          {isAdmin && (
            <>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '2px 7px' }}
                onClick={() => onAddSub(item.id)}
                title="Dodaj pod-element"
              >＋</button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '2px 7px' }}
                onClick={() => onEdit(item)}
                title="Uredi"
              >✎</button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '2px 7px', color: 'var(--danger-color)' }}
                onClick={() => onDelete(item.id)}
                title="Izbriši"
              >✕</button>
            </>
          )}
        </div>
      </div>

      {/* Nested children */}
      {hasChildren && subOpen && (
        <div style={{ marginTop: '2px' }}>
          {item.items.map(child => (
            <BuilderItemRow
              key={child.id}
              item={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSub={onAddSub}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Builder component ───────────────────────────────────────────────────
export default function Builder({
  categories,
  setCategories,
  questionnaires = [],
  selectedVersion,
  setSelectedVersion,
  refreshQuestionnaires,
  loadCategoriesForVersion,
  userRole,
}) {
  const isAdmin = userRole === 'admin';
  const [openSections, setOpenSections] = useState({});
  const [openParents, setOpenParents] = useState({});
  const [itemModal, setItemModal] = useState(null);    // { catIdx, editItem?, parentItemId? }
  const [catModal, setCatModal] = useState(null);
  const [parentModal, setParentModal] = useState(null);
  const [exportModal, setExportModal] = useState(false);
  // Local version shown in the Builder dropdown (independent of App.jsx selectedVersion
  // so imports don't re-trigger App.jsx effects that would override imported categories)
  const [builderVersion, setBuilderVersion] = useState(selectedVersion || '');

  // Sync builderVersion when parent selectedVersion changes (e.g., after startNewAssessment)
  React.useEffect(() => {
    if (selectedVersion && selectedVersion !== builderVersion) {
      setBuilderVersion(selectedVersion);
    }
  }, [selectedVersion]);

  // ── Import: append as new version, keep old ones ──────────────────────────
  const handleLocalImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const data = JSON.parse(ev.target.result);

          // Detect questionnaire_config.json format (has sections array at root)
          if (data.sections && Array.isArray(data.sections)) {
            const version = data.version ? String(data.version) : `import_${Date.now()}`;
            const questionnaire = {
              version,
              title: data.title || `Uvoženi vprašalnik ${version}`,
              description: data.description || '',
              sections: data.sections,
            };

            // 1. Convert imported sections → categories and apply IMMEDIATELY
            //    (use the raw parsed data — most reliable, no backend round-trip)
            const imported = data.sections.map(section => {
              const superCategory = (() => {
                const id = (section.id || '').toLowerCase();
                if (id.includes('build') || id.includes('unit_test')) return 'Neprekinjena integracija (CI)';
                if (id.includes('deploy')) return 'Neprekinjeno nameščanje (CD)';
                return 'Ostalo';
              })();
              return {
                id: section.id,
                title: section.label || section.id,
                superCategory,
                description: section.description || '',
                items: section.items || [],
              };
            });
            setCategories(imported);

            // 2. Update Builder's local version selector (does NOT trigger App.jsx effects)
            setBuilderVersion(version);

            // 3. Save to backend and refresh version list in background
            //    We do NOT call setSelectedVersion here to avoid triggering any App.jsx
            //    useEffect that might override the categories we just set.
            api.saveQuestionnaire(questionnaire)
              .then(() => refreshQuestionnaires && refreshQuestionnaires())
              .catch(err => console.warn('Questionnaire save warning:', err));

            alert(`Vprašalnik "${questionnaire.title}" (v${version}) uspešno uvožen!`);
            return;
          }

          // Legacy: plain array of categories or {categories: []}
          let importedCats = null;
          if (Array.isArray(data)) {
            importedCats = data;
          } else if (data.categories && Array.isArray(data.categories)) {
            importedCats = data.categories;
          }

          if (importedCats) {
            setCategories(importedCats);
            alert('Kategorije uspešno uvožene!');
          } else {
            alert('Napačen format datoteke za vprašalnik.');
          }
        } catch (err) {
          alert('Napaka pri uvozu: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportSuperCategory = (superCatName) => {
    const catsToExport = categories.filter(c => (c.superCategory || "CI/CD Proces") === superCatName);
    if (catsToExport.length === 0) {
      alert(`Ni kategorij v nadkategoriji "${superCatName}"`);
      return;
    }
    const sections = catsToExport.map(c => ({
      id: c.id,
      label: c.title,
      description: c.description || '',
      items: c.items || []
    }));
    const exportData = {
      version: selectedVersion || "1.0",
      title: `CI/CD Pipeline Maturity Assessment – ${superCatName}`,
      description: `Vprašalnik in ocena zrelosti CI/CD cevovodov za nadkategorijo "${superCatName}".`,
      sections
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${superCatName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveQuestionnaireVersion = async (updatedCategories) => {
    const sections = updatedCategories.map(c => ({
      id: c.id,
      label: c.title,
      description: c.description || '',
      items: c.items || []
    }));

    const currentQ = questionnaires.find(q => q.version === builderVersion);
    const questionnaireObj = {
      version: builderVersion || "1.0",
      title: currentQ?.title || `Vprašalnik v${builderVersion || "1.0"}`,
      description: currentQ?.description || "",
      sections
    };

    try {
      await api.saveQuestionnaire(questionnaireObj);
      if (refreshQuestionnaires) {
        await refreshQuestionnaires();
      }
    } catch (err) {
      console.error('Failed to auto-save questionnaire version:', err);
    }
  };

  const toggleSection = (catId) => setOpenSections(prev => ({ ...prev, [catId]: !prev[catId] }));
  const toggleParent = (superTitle) => setOpenParents(prev => ({ ...prev, [superTitle]: !prev[superTitle] }));

  const saveParent = (name, existingName) => {
    let nextCats;
    if (existingName) {
      nextCats = categories.map(c => c.superCategory === existingName ? { ...c, superCategory: name } : c);
      setCategories(nextCats);
      setOpenParents(prev => {
        const next = { ...prev };
        if (existingName in next) { next[name] = next[existingName]; delete next[existingName]; }
        return next;
      });
    } else {
      const newCat = { id: 'cat_' + Date.now(), title: 'Nova podkategorija', superCategory: name, items: [] };
      nextCats = [...categories, newCat];
      setCategories(nextCats);
      setOpenParents(prev => ({ ...prev, [name]: true }));
      setOpenSections(prev => ({ ...prev, [newCat.id]: false }));
    }
    setParentModal(null);
    saveQuestionnaireVersion(nextCats);
  };

  const expandAll = () => {
    const next = {};
    categories.forEach(c => { next[c.id] = true; });
    setOpenSections(next);
  };

  const collapseAll = () => {
    const next = {};
    categories.forEach(c => { next[c.id] = false; });
    setOpenSections(next);
  };

  const saveCategory = async ({ title, superCategory }) => {
    try {
      let updatedCats = [];
      if (catModal?.catIdx !== undefined) {
        const cat = categories[catModal.catIdx];
        await api.updateCategory(cat.id, title);
        updatedCats = categories.map((c, i) => i === catModal.catIdx ? { ...c, title, superCategory } : c);
      } else {
        const newCat = await api.createCategory(title);
        updatedCats = [...categories, { ...newCat, superCategory, items: [] }];
      }
      setCategories(updatedCats);
      await saveQuestionnaireVersion(updatedCats);
    } catch (err) {
      alert('Napaka pri shranjevanju kategorije: ' + err.message);
    }
    setCatModal(null);
  };

  const deleteCategory = async (catIdx) => {
    if (!window.confirm('Izbrisati to kategorijo in vse njene elemente?')) return;
    const cat = categories[catIdx];
    try {
      await api.deleteCategory(cat.id);
      const updatedCats = categories.filter((_, i) => i !== catIdx);
      setCategories(updatedCats);
      await saveQuestionnaireVersion(updatedCats);
      setOpenSections(prev => {
        const next = { ...prev };
        delete next[cat.id];
        return next;
      });
    } catch (err) {
      alert('Napaka pri brisanju kategorije: ' + err.message);
    }
  };

  // ── Item CRUD (recursive-aware) ────────────────────────────────────────────
  const openAddItem = (catIdx, parentItemId = null) => {
    setItemModal({ catIdx, parentItemId, editItem: null });
  };

  const openEditItem = (catIdx, item) => {
    setItemModal({ catIdx, editItem: item, parentItemId: null });
  };

  const saveItem = async ({ label, type, description }) => {
    const { catIdx, editItem, parentItemId } = itemModal;
    const cat = categories[catIdx];
    const newId = `${cat.id}_item_${Date.now()}`;
    let updatedCats = [];

    if (editItem) {
      // Edit existing item (recursive tree update, no flat API for nested items)
      const newItems = editItemInTree(cat.items || [], editItem.id, { label, type, description });
      updatedCats = categories.map((c, i) => i === catIdx ? { ...c, items: newItems } : c);
      setCategories(updatedCats);
      // If item is top-level, also sync with backend
      const isTopLevel = (cat.items || []).some(it => it.id === editItem.id);
      if (isTopLevel) {
        try {
          await api.updateCategoryItem(cat.id, editItem.id, label, type, description);
        } catch (err) {
          console.warn('Could not sync edit to backend:', err);
        }
      }
    } else if (parentItemId) {
      // Add nested sub-item (local tree operation only — backend /api/categories doesn't support nesting)
      const newItem = { id: newId, label, type, description };
      const newItems = addItemInTree(cat.items || [], parentItemId, newItem);
      updatedCats = categories.map((c, i) => i === catIdx ? { ...c, items: newItems } : c);
      setCategories(updatedCats);
    } else {
      // Add top-level item to category
      try {
        const newItem = await api.createCategoryItem(cat.id, label, type, description);
        const newItems = [...(cat.items || []), { ...newItem, label, type, description }];
        updatedCats = categories.map((c, i) => i === catIdx ? { ...c, items: newItems } : c);
        setCategories(updatedCats);
      } catch (err) {
        alert('Napaka pri dodajanju vprašanja: ' + err.message);
        setItemModal(null);
        return;
      }
    }
    await saveQuestionnaireVersion(updatedCats);
    setItemModal(null);
  };

  const deleteItem = async (catIdx, itemId) => {
    if (!window.confirm('Izbrisati ta element?')) return;
    const cat = categories[catIdx];
    const isTopLevel = (cat.items || []).some(it => it.id === itemId);
    let updatedCats = [];

    if (isTopLevel) {
      try {
        await api.deleteCategoryItem(cat.id, itemId);
        const newItems = cat.items.filter(it => it.id !== itemId);
        updatedCats = categories.map((c, i) => i === catIdx ? { ...c, items: newItems } : c);
        setCategories(updatedCats);
      } catch (err) {
        alert('Napaka pri brisanju elementa: ' + err.message);
        return;
      }
    } else {
      // Nested item — delete from tree locally
      const newItems = deleteItemInTree(cat.items || [], itemId);
      updatedCats = categories.map((c, i) => i === catIdx ? { ...c, items: newItems } : c);
      setCategories(updatedCats);
    }
    await saveQuestionnaireVersion(updatedCats);
  };

  // ── Count all items recursively ────────────────────────────────────────────
  function countItems(items) {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + 1 + countItems(item.items), 0);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <h2 className="page-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>
          {isAdmin ? '⊞ Form Builder' : '⊞ Pregled vprašalnika'}
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isAdmin ? (
            <>
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={handleLocalImport} title="Uvozi JSON vprašalnik">⇩ Uvozi konfiguracijo</button>
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setExportModal(true)} title="Izvozi nadkategorijo v JSON">⇧ Izvozi nadkategorijo</button>
              <button className="btn btn-accent" onClick={() => setParentModal({})}>＋ Nova kategorija</button>
            </>
          ) : (
            <span className="badge badge-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Način za branje</span>
          )}
        </div>
      </div>

      {/* Version selector */}
      {questionnaires.length > 0 && (
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
            value={builderVersion || ''}
            onChange={e => {
              const v = e.target.value;
              setBuilderVersion(v);
              // Update App.jsx selectedVersion AND explicitly load categories for that version
              if (setSelectedVersion) setSelectedVersion(v);
              if (loadCategoriesForVersion) loadCategoriesForVersion(v);
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
            {questionnaires.map(q => (
              <option key={q.version} value={q.version}>
                {q.title || `Vprašalnik v${q.version}`} (v{q.version})
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Uvozite novo konfiguracijo za dodajanje verzije
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {categories.length} kategorij · {categories.reduce((s, c) => s + countItems(c.items), 0)} elementov skupaj
        </span>
        {categories.length > 0 && (
          <>
            <button className="btn btn-ghost" style={{ fontSize: '0.76rem', padding: '2px 8px' }} onClick={expandAll}>Razširi vse</button>
            <button className="btn btn-ghost" style={{ fontSize: '0.76rem', padding: '2px 8px' }} onClick={collapseAll}>Skrči vse</button>
          </>
        )}
      </div>

      {categories.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.3 }}>⊞</div>
          <div>Ni kategorij. Uvozite JSON konfiguracijo ali dodajte kategorijo.</div>
        </div>
      )}

      {/* Category groups */}
      {(() => {
        const superGroups = {};
        categories.forEach((cat, index) => {
          const superTitle = cat.superCategory || "CI/CD Proces";
          if (!superGroups[superTitle]) superGroups[superTitle] = [];
          superGroups[superTitle].push({ cat, originalIndex: index });
        });

        return Object.keys(superGroups).map(superTitle => {
          const groupCats = superGroups[superTitle];
          const isParentOpen = !!openParents[superTitle];
          return (
            <div key={superTitle} style={{ marginBottom: '16px', border: '1px solid rgba(88,166,255,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
              {/* Parent accordion header */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px',
                  background: 'rgba(88,166,255,0.06)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => toggleParent(superTitle)}
              >
                <span style={{ fontSize: '1rem', color: 'var(--accent-color)' }}>⬢</span>
                <span style={{ flex: 1, fontWeight: 800, fontSize: '1rem', color: 'var(--accent-color)' }}>{superTitle}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                  {groupCats.length} podkat.
                </span>
                {isAdmin && (
                  <>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      onClick={e => { e.stopPropagation(); setParentModal({ superTitle, existing: superTitle }); }}
                      title="Preimenuj nadkategorijo"
                    >✎</button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      onClick={e => { e.stopPropagation(); setCatModal({ superCategory: superTitle }); }}
                      title="Dodaj podkategorijo"
                    >＋ Podkat.</button>
                  </>
                )}
                <span style={{ opacity: 0.5, fontSize: '0.9rem', marginLeft: '4px' }}>{isParentOpen ? '▾' : '▸'}</span>
              </div>

              {/* Children (sub-categories) */}
              {isParentOpen && (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {groupCats.map(({ cat, originalIndex }) => {
                    const isOpen = !!openSections[cat.id];
                    const itemCount = countItems(cat.items);
                    return (
                      <div key={cat.id} className="builder-section">
                        {/* Section header */}
                        <div className="builder-section-header" onClick={() => toggleSection(cat.id)}>
                          <div className="builder-section-title">
                            <span style={{ opacity: 0.55, fontSize: '0.85rem' }}>{isOpen ? '▾' : '▸'}</span>
                            {cat.title}
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 400,
                              color: 'var(--text-secondary)',
                              background: 'rgba(255,255,255,0.06)',
                              padding: '2px 7px', borderRadius: '10px',
                            }}>
                              {itemCount} elem.
                            </span>
                          </div>
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                              <button
                                className="btn"
                                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                onClick={() => openAddItem(originalIndex)}
                                title="Dodaj element"
                              >＋ Element</button>
                              <button
                                className="btn"
                                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                onClick={() => setCatModal({ catIdx: originalIndex })}
                                title="Uredi kategorijo"
                              >✎</button>
                              <button
                                className="btn btn-primary"
                                style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                                onClick={() => deleteCategory(originalIndex)}
                                title="Izbriši kategorijo"
                              >✕</button>
                            </div>
                          )}
                        </div>

                        {/* Section body with recursive items */}
                        {isOpen && (
                          <div className="builder-section-body">
                            {(!cat.items || cat.items.length === 0) ? (
                              <div style={{
                                color: 'var(--text-secondary)', fontSize: '0.83rem',
                                padding: '12px 0', textAlign: 'center',
                                borderTop: '1px dashed var(--panel-border)',
                              }}>
                                Ni elementov — {isAdmin ? 'kliknite ＋ Element za dodajanje.' : 'Ta kategorija je trenutno prazna.'}
                              </div>
                            ) : (
                              <div style={{ paddingTop: '4px' }}>
                                {cat.items.map(item => (
                                  <BuilderItemRow
                                    key={item.id}
                                    item={item}
                                    depth={0}
                                    onEdit={(it) => openEditItem(originalIndex, it)}
                                    onDelete={(id) => deleteItem(originalIndex, id)}
                                    onAddSub={(parentId) => openAddItem(originalIndex, parentId)}
                                    isAdmin={isAdmin}
                                  />
                                ))}
                              </div>
                            )}

                            {isAdmin && cat.items && cat.items.length > 0 && (
                              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: '0.8rem', width: '100%' }}
                                  onClick={() => openAddItem(originalIndex)}
                                >
                                  ＋ Dodaj element v "{cat.title}"
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        });
      })()}

      {/* Modals */}
      {itemModal && (
        <ItemModal
          item={itemModal.editItem}
          onSave={saveItem}
          onClose={() => setItemModal(null)}
        />
      )}
      {catModal !== null && (
        <CategoryModal
          cat={catModal.catIdx !== undefined ? categories[catModal.catIdx] : null}
          categories={categories}
          onSave={saveCategory}
          onClose={() => setCatModal(null)}
        />
      )}
      {parentModal !== null && (
        <ParentModal
          existingName={parentModal.existing}
          onSave={(name) => saveParent(name, parentModal.existing)}
          onClose={() => setParentModal(null)}
        />
      )}
      {exportModal && (
        <ExportSuperCategoryModal
          categories={categories}
          onExport={handleExportSuperCategory}
          onClose={() => setExportModal(false)}
        />
      )}
    </div>
  );
}
