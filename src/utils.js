export function getMaxScore(categories) {
  let max = 0;
  categories.forEach(cat => {
    cat.items.forEach(item => {
      // Skupno število točk se določi glede na tipe vprašanj (DA/NE prinese 10, besedilo 5 točk)- treba zamenjat da je vse enakovredno
      if (item.type === 'yes_no_na') max += 10;
      if (item.type === 'text') max += 5;
    });
  });
  return max === 0 ? 100 : max;
}

export function evaluateAssessment(answers, categories, rules) {
  let score = 0;
  let missing = [];

  categories.forEach(cat => {
    let catMax = 0;
    cat.items.forEach(item => {
      const ans = answers[item.id];
      if (item.type === 'yes_no_na') {
        catMax += 10;
        if (ans === 'DA') {
          score += 10;
        } else if (ans === 'NE' || !ans) {
          // Beležimo manjkajoče zahteve za kasnejši prikaz priporočil
          missing.push(`Manjka v ${cat.title}: ${item.label}`);
        } else if (ans === 'NA') {
          // Odgovor "Ni relevantno" (NA) zmanjša maksimalno možno število točk v kategoriji
          catMax -= 10;
        }
      } else if (item.type === 'text') {
        if (ans && ans.trim() !== '') {
          score += 5;
        }
      }
    });
  });

  const maxPossible = getMaxScore(categories);
  // Izračunamo odstotek doseženih točk, navzgor omejeno na največ 100%
  const normalizedScore = Math.min(100, Math.round((score / maxPossible) * 100));

  let level = 1;
  let levelName = rules[0].name;

  // Določanje stopnje zrelosti: preverjamo od najvišje zahtevane proti najnižji
  for (let i = rules.length - 1; i >= 0; i--) {
    if (normalizedScore >= rules[i].minScore) {
      level = rules[i].level;
      levelName = rules[i].name;
      break;
    }
  }

  // Izračun koliko točk manjka do naslednje stopnje in to dodamo na vrh seznama priporočil
  const nextLevel = rules.find(r => r.level === level + 1);
  if (nextLevel) {
    missing.unshift(`Za dosego stopnje ${nextLevel.name} potrebujete še ${nextLevel.minScore - normalizedScore} točk.`);
  } else {
    missing = ["Ste na najvišji stopnji zrelosti!"];
  }

  // Vrnemo največ prvih 15 priporočil, da ni prepolno
  return { score: normalizedScore, level, levelName, missing: missing.slice(0, 15) };
}
