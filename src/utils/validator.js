export function extractItemIdsFromCriteria(criteria) {
  if (!Array.isArray(criteria)) return new Set();
  const ids = new Set();
  criteria.forEach(c => { if (c.item_id) ids.add(c.item_id); });
  return ids;
}

export function validateRulesAgainstQuestionnaire(categories, rules) {
  const allItemIds = new Set();
  (categories || []).forEach(cat => {
    (cat.items || []).forEach(item => allItemIds.add(item.id));
  });

  const referencedIds = new Set();
  (rules || []).forEach(rule => {
    extractItemIdsFromCriteria(rule.criteria || []).forEach(id => referencedIds.add(id));
    if (rule.improvement_suggestions) {
      Object.keys(rule.improvement_suggestions).forEach(id => referencedIds.add(id));
    }
  });

  return {
    orphanedInRules: [...referencedIds].filter(id => !allItemIds.has(id)),
    missingFromRules: [...allItemIds].filter(id => !referencedIds.has(id)),
  };
}

export function getMissingItemsWithMeta(categories, rules) {
  const { missingFromRules } = validateRulesAgainstQuestionnaire(categories, rules);
  const result = [];
  (categories || []).forEach(cat => {
    (cat.items || []).forEach(item => {
      if (missingFromRules.includes(item.id)) {
        result.push({ id: item.id, label: item.label, categoryTitle: cat.title, type: item.type });
      }
    });
  });
  return result;
}

export function calculateSectionScore(category, answers) {
  const items = category.items || [];
  if (items.length === 0) return { score: 0, answered: 0, total: 0 };

  let filled = 0;
  let total = 0;

  items.forEach(item => {
    const ans = answers[item.id];
    if (item.type === 'yes_no_na' || item.type === 'checkbox') {
      total++;
      if (ans === true || ans === 'DA') filled++;
    } else if (item.type === 'text') {
      total++;
      if (ans && typeof ans === 'string' && ans.trim() !== '') filled++;
    } else if (item.type === 'numeric') {
      total++;
      if (ans !== undefined && ans !== null && ans !== '' && !isNaN(ans)) filled++;
    } else if (item.type === 'multiselect') {
      total++;
      if (Array.isArray(ans) && ans.length > 0) filled++;
    }
  });

  return {
    score: total === 0 ? 0 : Math.round((filled / total) * 100),
    answered: filled,
    total,
  };
}
