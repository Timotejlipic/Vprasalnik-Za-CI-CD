export function getFlatItems(items) {
  let flat = [];
  if (!items) return flat;
  items.forEach(item => {
    flat.push(item);
    if (item.items && Array.isArray(item.items)) {
      flat = flat.concat(getFlatItems(item.items));
    }
  });
  return flat;
}

// Copy text to the clipboard. The Clipboard API is unavailable over plain HTTP
// (non-secure context), so fall back to a temporary textarea + execCommand.
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function getFlatCategoriesItems(categories) {
  let flat = [];
  if (!categories) return flat;
  categories.forEach(cat => {
    if (cat.items && Array.isArray(cat.items)) {
      flat = flat.concat(getFlatItems(cat.items));
    }
  });
  return flat;
}

export function getMaxScore(categories) {
  const flatItems = getFlatCategoriesItems(categories);
  let max = 0;
  flatItems.forEach(item => {
    if (
      item.type === 'yes_no_na' ||
      item.type === 'checkbox' ||
      item.type === 'text' ||
      item.type === 'numeric' ||
      item.type === 'multiselect'
    ) {
      max += 10;
    }
  });
  return max === 0 ? 100 : max;
}

// Checks a single criterion
export function checkCriterion(answers, crit) {
  const { item_id, operator, value } = crit;
  const ans = answers[item_id];
  const op = operator || '=';

  if (op === '=') {
    if (value === true) {
      return ans === true || ans === 'DA';
    } else if (value === false) {
      return ans === false || ans === 'NE' || ans === undefined || ans === null || ans === '';
    }
    return ans === value;
  }

  if (op === 'includes') {
    if (Array.isArray(ans)) {
      return ans.includes(value);
    }
    if (typeof ans === 'string') {
      return ans.split(',').map(s => s.trim()).includes(value) || ans === value;
    }
    return false;
  }

  const numAns = Number(ans);
  const numVal = Number(value);

  if (isNaN(numAns) || ans === undefined || ans === null || ans === '') return false;

  if (op === '>=') return numAns >= numVal;
  if (op === '>') return numAns > numVal;
  if (op === '<=') return numAns <= numVal;
  if (op === '<') return numAns < numVal;

  return false;
}

// Checks if all criteria for a level are met
function checkLevelCriteria(answers, criteria) {
  if (!criteria || criteria.length === 0) return true;
  return criteria.every(crit => checkCriterion(answers, crit));
}

export function evaluateAssessment(answers, categories, rules) {
  const hasCustomCriteria = rules && rules.some(r => Array.isArray(r.criteria));

  if (hasCustomCriteria) {
    // 1. Calculate a filled score percentage recursively (only count sub-items if parent is checked)
    let filledScore = 0;
    let totalScoreable = 0;

    const traverseScore = (items, parentChecked = true) => {
      items.forEach(item => {
        if (parentChecked) {
          const ans = answers[item.id];
          const isChecked = ans === true || ans === 'DA';
          const isOk = isChecked || 
                       (item.type === 'text' && ans && typeof ans === 'string' && ans.trim() !== '') ||
                       (item.type === 'numeric' && ans !== undefined && ans !== null && ans !== '' && !isNaN(ans)) ||
                       (item.type === 'multiselect' && Array.isArray(ans) && ans.length > 0);

          if (item.type === 'checkbox' || item.type === 'yes_no_na' || item.type === 'text' || item.type === 'numeric' || item.type === 'multiselect') {
            totalScoreable += 10;
            if (isOk) {
              filledScore += 10;
            }
          }

          if (item.items && Array.isArray(item.items)) {
            traverseScore(item.items, isChecked);
          }
        }
      });
    };

    categories.forEach(cat => {
      if (cat.items && Array.isArray(cat.items)) {
        traverseScore(cat.items, true);
      }
    });

    const maxPossible = totalScoreable === 0 ? 100 : totalScoreable;
    const score = Math.min(100, Math.round((filledScore / maxPossible) * 100));

    // 2. Evaluate maturity level from 5 down to 1
    const sortedLevels = [...rules].sort((a, b) => {
      const aId = a.level !== undefined ? a.level : a.id;
      const bId = b.level !== undefined ? b.level : b.id;
      return bId - aId;
    });

    let level = 1;
    let levelName = "Nivo 1 – Regresiven";
    const baseLevel = sortedLevels.find(l => (l.level !== undefined ? l.level : l.id) === 1) || sortedLevels[sortedLevels.length - 1];
    if (baseLevel) {
      level = baseLevel.level !== undefined ? baseLevel.level : baseLevel.id;
      levelName = baseLevel.label || baseLevel.name;
    }

    for (let i = 0; i < sortedLevels.length; i++) {
      const levelObj = sortedLevels[i];
      if (checkLevelCriteria(answers, levelObj.criteria)) {
        level = levelObj.level !== undefined ? levelObj.level : levelObj.id;
        levelName = levelObj.label || levelObj.name;
        break;
      }
    }

    // 3. Compile improvement recommendations (missing items)
    let missing = [];
    const nextLevelObj = sortedLevels.find(l => (l.level !== undefined ? l.level : l.id) === level + 1);

    if (nextLevelObj) {
      missing.push(`Za dosego stopnje ${nextLevelObj.label || nextLevelObj.name} morate izpolniti naslednje pogoje:`);
      
      nextLevelObj.criteria.forEach(crit => {
        if (!checkCriterion(answers, crit)) {
          const itemID = crit.item_id;
          const suggestion = nextLevelObj.improvement_suggestions && nextLevelObj.improvement_suggestions[itemID];
          if (suggestion) {
            missing.push(suggestion);
          } else {
            missing.push(`Zahtevano: ${itemID} mora ustrezati pogoju (${crit.operator || '='} ${crit.value})`);
          }
        }
      });

      if (missing.length === 1) {
        missing.push("Izpolniti morate vse pogoje za naslednjo stopnjo.");
      }
    } else {
      missing = ["Čestitamo! Ste na najvišji stopnji zrelosti."];
    }

    return { score, level, levelName, missing: missing.slice(0, 15) };
  } else {
    // FALLBACK: Old evaluation engine
    let score = 0;
    let effectiveMax = 0;
    let missing = [];

    categories.forEach(cat => {
      cat.items.forEach(item => {
        const ans = answers[item.id];
        if (item.type === 'yes_no_na' || item.type === 'checkbox') {
          if (item.type === 'yes_no_na' && ans === 'NA') {
            // NA doesn't count
          } else {
            effectiveMax += 10;
            if (ans === 'DA' || ans === true) {
              score += 10;
            } else {
              missing.push(`Manjka v ${cat.title}: ${item.label}`);
            }
          }
        } else if (item.type === 'text') {
          effectiveMax += 10;
          if (ans && ans.trim() !== '') {
            score += 10;
          }
        }
      });
    });

    const maxPossible = effectiveMax === 0 ? 100 : effectiveMax;
    const normalizedScore = Math.min(100, Math.round((score / maxPossible) * 100));

    let level = 1;
    let levelName = rules && rules[0] ? rules[0].name : "Začetna";

    for (let i = rules.length - 1; i >= 0; i--) {
      if (normalizedScore >= rules[i].minScore) {
        level = rules[i].level;
        levelName = rules[i].name;
        break;
      }
    }

    const nextLevel = rules.find(r => r.level === level + 1);
    if (nextLevel) {
      missing.unshift(`Za dosego stopnje ${nextLevel.name} potrebujete še ${nextLevel.minScore - normalizedScore} točk.`);
    } else {
      missing = ["Ste na najvišji stopnji zrelosti!"];
    }

    return { score: normalizedScore, level, levelName, missing: missing.slice(0, 15) };
  }
}

export function getSuperCategory(sectionId) {
  const lowercaseId = (sectionId || '').toLowerCase();
  if (lowercaseId.includes('build') || lowercaseId.includes('gradnja')) {
    return 'Gradnja (Build)';
  } else if (lowercaseId.includes('test') || lowercaseId.includes('testiranje')) {
    return 'Testiranje (Test)';
  } else if (lowercaseId.includes('deploy') || lowercaseId.includes('namestitev')) {
    return 'Namestitev (Deploy)';
  }
  return 'Ostalo';
}

export function convertConfigSectionsToCategories(sections) {
  if (!sections || !Array.isArray(sections)) return [];
  const result = [];
  sections.forEach(section => {
    const superCategory = getSuperCategory(section.id);
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

export function openResultsInNewWindow({ answers, results, categories, rules, isReadOnly, title }) {
  const id = 'cicd_results_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  localStorage.setItem(id, JSON.stringify({
    answers,
    results,
    categories,
    rules,
    isReadOnly,
    title
  }));
  // Open in a new smaller pop-up window with spec sizes instead of a full new tab
  window.open(`/?view=results&id=${id}`, '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
}

export function getPipelineCategories(p, questionnairesList) {
  const version = p.qVersion || p.version || "1.0";
  const qObj = questionnairesList.find(q => q.version === version);
  if (!qObj || !qObj.sections) return [];
  
  const result = [];
  qObj.sections.forEach(section => {
    // Normalise super-category label
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

export function detectPipelineChanges(p, questionnairesList, rulesVersionsList) {
  const pCats = getPipelineCategories(p, questionnairesList);
  
  const rVer = p.rulesVersion || p.version || "1.0";
  const rObj = rulesVersionsList.find(r => r.version === rVer);
  const pRules = rObj ? rObj.levels : [];

  if (pCats.length === 0 || pRules.length === 0) {
    return { hasChanges: false, added: [], removed: [], scoreChanged: false };
  }

  // Flatten all active question items recursively
  const flatItems = getFlatCategoriesItems(pCats);

  const activeKeys = flatItems.map(item => item.id);
  const answeredKeys = Object.keys(p.answers || {});

  // If the pipeline has no answers saved at all, it is either new, empty,
  // or the database is in an unseeded initial state. We treat it as having no changes.
  if (answeredKeys.length === 0) {
    return { hasChanges: false, added: [], removed: [], scoreChanged: false };
  }

  // 1. Detect new questions (exist in current version but missing from answers)
  const added = flatItems.filter(item => !answeredKeys.includes(item.id));
  
  // 2. Detect removed questions (exist in answers but removed from current version)
  const removedKeys = answeredKeys.filter(key => !activeKeys.includes(key));
  const removed = removedKeys.map(key => ({ id: key }));

  // 3. Silent re-evaluation using active questionnaire rules
  const silentEval = evaluateAssessment(p.answers || {}, pCats, pRules);

  // Dynamically populate score if database returned 0 due to database schema limitations (lack of score column)
  if (p.score === 0 || p.score === undefined) {
    p.score = silentEval.score;
  }

  // Populate dynamic score for historical versions too
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

  // Dynamically correct score/level if there are no questionnaire structural changes
  // to resolve past backend rules-version mismatches or lack of columns
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
