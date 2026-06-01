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
    // 1. Calculate a filled score percentage
    const flatItems = getFlatCategoriesItems(categories);
    let filledScore = 0;
    let totalScoreable = 0;

    flatItems.forEach(item => {
      const ans = answers[item.id];
      if (item.type === 'checkbox' || item.type === 'yes_no_na') {
        totalScoreable += 10;
        if (ans === true || ans === 'DA') {
          filledScore += 10;
        }
      } else if (item.type === 'text') {
        totalScoreable += 10;
        if (ans && typeof ans === 'string' && ans.trim() !== '') {
          filledScore += 10;
        }
      } else if (item.type === 'numeric') {
        totalScoreable += 10;
        if (ans !== undefined && ans !== null && ans !== '' && !isNaN(ans)) {
          filledScore += 10;
        }
      } else if (item.type === 'multiselect') {
        totalScoreable += 10;
        if (Array.isArray(ans) && ans.length > 0) {
          filledScore += 10;
        }
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
        if (item.type === 'yes_no_na') {
          if (ans === 'NA') {
            // NA doesn't count
          } else {
            effectiveMax += 10;
            if (ans === 'DA') {
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

