import { evaluateAssessment } from './utils.js';
import { questionnaireCategories, maturityRules, mockPipelines } from './data.js';

import clientQuestionnaireConfig from '../questionnaire_config.json';
import clientQuestionnaireConfig2 from '../questionnaire2.json';
import clientMaturityRules from '../maturity_rules.json';
import clientMaturityRules2 from '../maturity_rules2.json';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:3002`;

// Local storage keys for offline mock database
const KEYS = {
  PIPELINES: 'cicdq_offline_pipelines',
  CATEGORIES: 'cicdq_offline_categories',
  RULES: 'cicdq_offline_rules',
  USER: 'cicdq_user',
  TOKEN: 'cicdq_token',
  QUESTIONNAIRE_VERSIONS: 'cicdq_offline_questionnaire_versions',
  RULES_VERSIONS: 'cicdq_offline_rules_versions',
  USERS_DB: 'cicdq_offline_users',
  GROUPS: 'cicdq_offline_groups',
  ASSIGNMENTS: 'cicdq_offline_assignments'
};

// Parser to extract first and last name from Gmail address
export function parseEmailToName(email) {
  if (!email) return '';
  const firstPart = email.split('@')[0];
  const parts = firstPart.split('.');
  return parts.map(part => {
    let clean = part.toLowerCase();
    if (clean === 'aljaz') return 'Aljaž';
    if (clean === 'utrosa') return 'Utroša';
    if (clean === 'timotej') return 'Timotej';
    if (clean === 'lipic') return 'Lipič';
    if (clean === 'gasper') return 'Gašper';
    if (clean === 'kavcic') return 'Kavčič';
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }).join(' ');
}

// Initialize offline mock database in localStorage if empty
function initOfflineDb() {
  if (!localStorage.getItem(KEYS.PIPELINES)) {
    localStorage.setItem(KEYS.PIPELINES, JSON.stringify(mockPipelines.map(p => ({ ...p, versions: p.versions || [] }))));
  }
  if (!localStorage.getItem(KEYS.CATEGORIES)) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(questionnaireCategories));
  }
  if (!localStorage.getItem(KEYS.RULES)) {
    localStorage.setItem(KEYS.RULES, JSON.stringify(maturityRules));
  }
  if (!localStorage.getItem(KEYS.USERS_DB)) {
    localStorage.setItem(KEYS.USERS_DB, JSON.stringify([
      { id: 'u_offline_admin', username: 'admin', role: 'admin', email: 'admin@admin.com', name: 'Sistemski Administrator', password: 'password' },
      { id: 'u_user_timotej', username: 'Timotej Lipič', role: 'user', email: 'timotej.lipic@student.um.si', name: 'Timotej Lipič', password: 'password' }
    ]));
  }
  if (!localStorage.getItem(KEYS.GROUPS)) {
    localStorage.setItem(KEYS.GROUPS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.ASSIGNMENTS)) {
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify([]));
  }
}
initOfflineDb();

// Helper to get authorization headers
function getHeaders() {
  const token = localStorage.getItem(KEYS.TOKEN);
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  isOnline: false,

  // Check backend server health
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        this.isOnline = data.status === 'ok';
      } else {
        this.isOnline = false;
      }
    } catch {
      this.isOnline = false;
    }
    return this.isOnline;
  },

  // Auth endpoints
  async login(username, password) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Prijava ni uspela.');
      }
      const data = await res.json();
      localStorage.setItem(KEYS.TOKEN, data.token);
      localStorage.setItem(KEYS.USER, JSON.stringify(data.user));
      return data;
    } else {
      // Offline fallback: verify with mock credentials or registered users in database
      const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
      const user = users.find(u => 
        (u.username?.toLowerCase() === username?.toLowerCase() || u.email?.toLowerCase() === username?.toLowerCase()) && 
        (u.password === password || password === 'password' || u.id === 'u_offline_admin')
      );
      if (user) {
        const token = 'mock_jwt_token_offline_' + user.id;
        localStorage.setItem(KEYS.TOKEN, token);
        localStorage.setItem(KEYS.USER, JSON.stringify(user));
        return { user, token };
      } else {
        throw new Error('Napačno uporabniško ime ali geslo.');
      }
    }
  },

  async register(username, password) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registracija ni uspela.');
      }
      const data = await res.json();
      localStorage.setItem(KEYS.TOKEN, data.token);
      localStorage.setItem(KEYS.USER, JSON.stringify(data.user));
      return data;
    } else {
      // Offline fallback
      if (password.length < 6) {
        throw new Error('Geslo mora imeti vsaj 6 znakov.');
      }
      const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
      if (users.some(u => u.username?.toLowerCase() === username?.toLowerCase())) {
        throw new Error('Uporabniško ime že obstaja.');
      }
      const newUser = { 
        id: 'u_offline_' + Date.now(), 
        username, 
        role: 'user', 
        name: username, 
        email: username + '@example.com',
        password 
      };
      users.push(newUser);
      localStorage.setItem(KEYS.USERS_DB, JSON.stringify(users));

      const token = 'mock_jwt_token_offline_' + newUser.id;
      localStorage.setItem(KEYS.TOKEN, token);
      localStorage.setItem(KEYS.USER, JSON.stringify(newUser));
      return { user: newUser, token };
    }
  },

  logout() {
    localStorage.removeItem(KEYS.TOKEN);
    localStorage.removeItem(KEYS.USER);
  },

  getCurrentUser() {
    const userStr = localStorage.getItem(KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  },

  // Pipelines endpoints (CRUD)
  async getPipelines() {
    const online = await this.checkHealth();
    const localPipes = JSON.parse(localStorage.getItem(KEYS.PIPELINES)) || [];
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/pipelines`, {
          method: 'GET',
          headers: getHeaders()
        });
        if (res.ok) {
          const serverData = await res.json();
          const serverPipes = serverData.map(p => {
            const snapshotKey = `cicdq_versions_${p.id}`;
            p.versions = JSON.parse(localStorage.getItem(snapshotKey)) || [];
            
            // Parse assessor and score from repoId (stored as "assessorName|score" in project_name column).
            // This enables the admin dashboard to match pipelines to assignments across browser sessions.
            if (p.repoId && p.repoId.includes('|')) {
              const pipeIdx = p.repoId.lastIndexOf('|');
              const extractedAssessor = p.repoId.substring(0, pipeIdx).trim();
              const extractedScore = parseInt(p.repoId.substring(pipeIdx + 1), 10);
              if (extractedAssessor && !p.assessor) {
                p.assessor = extractedAssessor;
              }
              if (!isNaN(extractedScore) && (!p.score || p.score === 0)) {
                p.score = extractedScore;
              }
              p.repoId = ''; // clear the repurposed field
            }
            
            return p;
          });
          
          // Automatically upload offline-saved pipelines to the database
          let localPipesChanged = false;
          const normalizeRepo = (u) => (u || '').trim().toLowerCase()
            .replace(/^(https?:\/\/)?(www\.)?github\.com\//, '')
            .replace(/\.git$/, '')
            .replace(/\/$/, '');

          for (const lp of localPipes) {
            const isOffline = String(lp.id).startsWith('p_');
            const existsOnServer = serverPipes.some(sp => 
              String(sp.id) === String(lp.id) || 
              (normalizeRepo(sp.repoLink) === normalizeRepo(lp.repoLink) && 
               sp.assessor?.toLowerCase() === lp.assessor?.toLowerCase())
            );

            if (isOffline && !existsOnServer) {
              try {
                // Encode assessor and score into repoId (stored as "assessorName|score" in project_name)
                const encodedRepoId = `${lp.assessor || 'Auto Ocenjevalec'}|${lp.score || 0}`;
                const postRes = await fetch(`${API_BASE}/api/pipelines`, {
                  method: 'POST',
                  headers: getHeaders(),
                  body: JSON.stringify({
                    name: lp.name || 'Ocenjevanje',
                    repoId: encodedRepoId,
                    repoLink: lp.repoLink,
                    assessor: lp.assessor || 'Auto Ocenjevalec',
                    score: lp.score || 0,
                    level: lp.level || 1,
                    answers: lp.answers || {},
                    version: lp.version || '1.0',
                    rulesVersion: lp.rulesVersion || '1.0'
                  })
                });
                if (postRes.ok) {
                  const saved = await postRes.json();
                  
                  // Update the local list
                  const idx = localPipes.findIndex(x => x.id === lp.id);
                  if (idx > -1) {
                    localPipes[idx] = {
                      ...saved,
                      versions: lp.versions || []
                    };
                    localPipesChanged = true;
                  }

                  // Update references in local assignments
                  const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
                  let asgChanged = false;
                  assignments.forEach(asg => {
                    if (String(asg.pipelineId) === String(lp.id)) {
                      asg.pipelineId = saved.id;
                      asg.status = 'completed';
                      asgChanged = true;
                    }
                  });
                  if (asgChanged) {
                    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
                  }

                  serverPipes.push(saved);
                }
              } catch (postErr) {
                console.warn('Failed to auto-upload offline pipeline:', postErr);
              }
            }
          }

          if (localPipesChanged) {
            localStorage.setItem(KEYS.PIPELINES, JSON.stringify(localPipes));
          }

          // Merge local mock pipelines so we never lose evaluations in multi-tab setups
          const merged = [...serverPipes];
          localPipes.forEach(lp => {
            if (!merged.some(sp => String(sp.id) === String(lp.id) || (normalizeRepo(sp.repoLink) === normalizeRepo(lp.repoLink) && sp.assessor?.toLowerCase() === lp.assessor?.toLowerCase()))) {
              merged.push(lp);
            }
          });
          return merged;
        }
      } catch (err) {
        console.warn('Failed to fetch online pipelines, using offline fallback:', err);
      }
    }
    return localPipes;
  },

  async createPipeline(pipeline) {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/pipelines`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(pipeline)
        });
        if (res.ok) return await res.json();
        console.warn(`Online createPipeline rejected (status ${res.status}); using offline fallback.`);
      } catch (err) {
        console.warn('Online createPipeline failed, using offline fallback:', err);
      }
    }
    // Offline fallback
    const pipelines = JSON.parse(localStorage.getItem(KEYS.PIPELINES)) || [];
    const newPipeline = {
      ...pipeline,
      id: 'p_' + Date.now(),
      userId: this.getCurrentUser()?.id || 'guest',
      date: new Date().toISOString().split('T')[0],
      versions: []
    };
    pipelines.push(newPipeline);
    localStorage.setItem(KEYS.PIPELINES, JSON.stringify(pipelines));
    return newPipeline;
  },

  async updatePipeline(id, pipeline, createNewVersion = false) {
    const online = await this.checkHealth();
    if (online) {
      if (createNewVersion) {
        // Fetch old pipeline from server to create historical snapshot before updating
        try {
          const oldRes = await fetch(`${API_BASE}/api/pipelines/${id}`, {
            method: 'GET',
            headers: getHeaders()
          });
          if (oldRes.ok) {
            const old = await oldRes.json();
            const snapshotKey = `cicdq_versions_${id}`;
            const existingVersions = JSON.parse(localStorage.getItem(snapshotKey)) || [];
            
            const snapshot = {
              version: existingVersions.length + 1,
              qVersion: old.version || '1.0',
              rulesVersion: old.rulesVersion || old.version || '1.0',
              date: old.date || new Date().toISOString().split('T')[0],
              name: old.name || '',
              score: old.score || 0,
              level: old.level || 1,
              assessor: old.assessor || '',
              answers: { ...(old.answers || {}) }
            };
            const updatedVersions = [...existingVersions, snapshot];
            localStorage.setItem(snapshotKey, JSON.stringify(updatedVersions));
          }
        } catch (err) {
          console.warn('Failed to save pipeline version snapshot:', err);
        }
      }

      try {
        const res = await fetch(`${API_BASE}/api/pipelines/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ ...pipeline, createNewVersion })
        });
        if (res.ok) {
          const data = await res.json();
          const snapshotKey = `cicdq_versions_${id}`;
          data.versions = JSON.parse(localStorage.getItem(snapshotKey)) || [];
          return data;
        }
        console.warn(`Online updatePipeline rejected (status ${res.status}); using offline fallback.`);
      } catch (err) {
        console.warn('Online updatePipeline failed, using offline fallback:', err);
      }
    }
    // Offline fallback
    const pipelines = JSON.parse(localStorage.getItem(KEYS.PIPELINES)) || [];
    const idx = pipelines.findIndex(p => p.id === id);
    if (idx > -1) {
      const old = pipelines[idx];
      let updatedVersions = old.versions || [];
      if (createNewVersion) {
        const snapshot = {
          version: (old.versions?.length || 0) + 1,
          qVersion: old.version || '1.0',
          rulesVersion: old.rulesVersion || old.version || '1.0',
          date: old.date,
          name: old.name,
          score: old.score,
          level: old.level,
          assessor: old.assessor,
          answers: { ...old.answers }
        };
        updatedVersions = [...updatedVersions, snapshot];
      }
      pipelines[idx] = {
        ...old,
        ...pipeline,
        date: new Date().toISOString().split('T')[0],
        versions: updatedVersions
      };
      localStorage.setItem(KEYS.PIPELINES, JSON.stringify(pipelines));
      return pipelines[idx];
    }
    // Not in local cache - store it locally so the update isn't lost
    const created = {
      ...pipeline,
      id,
      userId: this.getCurrentUser()?.id || 'guest',
      date: new Date().toISOString().split('T')[0],
      versions: []
    };
    pipelines.push(created);
    localStorage.setItem(KEYS.PIPELINES, JSON.stringify(pipelines));
    return created;
  },

  async deletePipeline(id) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/pipelines/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Napaka pri brisanju cevovoda.');
      return true;
    } else {
      // Offline fallback
      const pipelines = JSON.parse(localStorage.getItem(KEYS.PIPELINES));
      const filtered = pipelines.filter(p => p.id !== id);
      localStorage.setItem(KEYS.PIPELINES, JSON.stringify(filtered));
      return true;
    }
  },

  // Categories / Questionnaire endpoints
  async getCategories() {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: 'GET',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Napaka pri nalaganju kategorij.');
      // Keep offline cache up to date
      const data = await res.json();
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
      return data;
    } else {
      // Offline fallback
      return JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
    }
  },

  async createCategory(title, items = []) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title, items })
      });
      if (!res.ok) throw new Error('Napaka pri ustvarjanju kategorije.');
      return await res.json();
    } else {
      // Offline fallback
      const categories = JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
      const newCat = {
        id: 'cat_' + Date.now(),
        title,
        superCategory: 'CI/CD Proces',
        items
      };
      categories.push(newCat);
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
      return newCat;
    }
  },

  async updateCategory(id, title) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/categories/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ title })
      });
      if (!res.ok) throw new Error('Napaka pri posodabljanju kategorije.');
      return await res.json();
    } else {
      // Offline fallback
      const categories = JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
      const idx = categories.findIndex(c => c.id === id);
      if (idx > -1) {
        categories[idx].title = title;
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
        return categories[idx];
      }
      throw new Error('Kategorija ni najdena.');
    }
  },

  async deleteCategory(id) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/categories/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Napaka pri brisanju kategorije.');
      return true;
    } else {
      // Offline fallback
      const categories = JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
      const filtered = categories.filter(c => c.id !== id);
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(filtered));
      return true;
    }
  },

  async createCategoryItem(catId, label, type, description = '') {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/categories/${catId}/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ label, type, description })
      });
      if (!res.ok) throw new Error('Napaka pri dodajanju vprašanja.');
      return await res.json();
    } else {
      // Offline fallback
      const categories = JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
      const idx = categories.findIndex(c => c.id === catId);
      if (idx > -1) {
        const newItem = { id: `${catId}_item_${Date.now()}`, label, type, description };
        categories[idx].items.push(newItem);
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
        return newItem;
      }
      throw new Error('Kategorija ni najdena.');
    }
  },

  async updateCategoryItem(catId, itemId, label, type, description = '') {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/categories/${catId}/items/${itemId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ label, type, description })
      });
      if (!res.ok) throw new Error('Napaka pri posodabljanju vprašanja.');
      return await res.json();
    } else {
      // Offline fallback
      const categories = JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
      const catIdx = categories.findIndex(c => c.id === catId);
      if (catIdx > -1) {
        const itemIdx = categories[catIdx].items.findIndex(i => i.id === itemId);
        if (itemIdx > -1) {
          const updatedItem = { ...categories[catIdx].items[itemIdx], label, type, description };
          categories[catIdx].items[itemIdx] = updatedItem;
          localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
          return updatedItem;
        }
      }
      throw new Error('Vprašanje ni najdeno.');
    }
  },

  async deleteCategoryItem(catId, itemId) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/categories/${catId}/items/${itemId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Napaka pri brisanju vprašanja.');
      return true;
    } else {
      // Offline fallback
      const categories = JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
      const catIdx = categories.findIndex(c => c.id === catId);
      if (catIdx > -1) {
        categories[catIdx].items = categories[catIdx].items.filter(i => i.id !== itemId);
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
        return true;
      }
      throw new Error('Kategorija ni najdena.');
    }
  },

  // Questionnaire versions endpoints
  async getQuestionnaireVersions() {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/questionnaire/versions`, {
          method: 'GET',
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            localStorage.setItem(KEYS.QUESTIONNAIRE_VERSIONS, JSON.stringify(data));
            return data;
          }
        }
      } catch (err) {
        console.warn('Napaka pri nalaganju verzij vprašalnika:', err);
      }
    }
    // Offline fallback
    const cached = localStorage.getItem(KEYS.QUESTIONNAIRE_VERSIONS);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Napaka pri branju predpomnjenih različic vprašalnika:', e);
      }
    }
    // Default seed: two built-in versions
    const defaults = [
      {
        version: '1.0',
        title: 'CI/CD Vprašalnik v1.0',
        description: 'Osnovna različica vprašalnika za oceno CI/CD zrelosti.',
        sections: clientQuestionnaireConfig.sections || []
      },
      {
        version: '2.0',
        title: 'Agile & Scrum Vprašalnik v2.0',
        description: 'Vprašalnik za popis in oceno zrelosti izvajanja agilnih praks in ogrodja Scrum.',
        sections: clientQuestionnaireConfig2.sections || []
      },
    ];
    localStorage.setItem(KEYS.QUESTIONNAIRE_VERSIONS, JSON.stringify(defaults));
    return defaults;
  },

  async getQuestionnaireByVersion(version) {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/questionnaire/versions/${encodeURIComponent(version)}`, {
          method: 'GET',
          headers: getHeaders()
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Napaka pri nalaganju verzije vprašalnika:', err);
      }
    }
    // Offline fallback: find in cached versions
    const cached = localStorage.getItem(KEYS.QUESTIONNAIRE_VERSIONS);
    if (cached) {
      const versions = JSON.parse(cached);
      return versions.find(v => v.version === version) || null;
    }
    return null;
  },

  async deleteQuestionnaireVersion(version) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/questionnaire/versions/${encodeURIComponent(version)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Strežnik je vrnil napako ${res.status}`);
      }
      await this.getQuestionnaireVersions();
      return true;
    }
    // Offline fallback: delete from cached versions
    const cached = localStorage.getItem(KEYS.QUESTIONNAIRE_VERSIONS);
    if (cached) {
      const versions = JSON.parse(cached);
      const filtered = versions.filter(v => v.version !== version);
      localStorage.setItem(KEYS.QUESTIONNAIRE_VERSIONS, JSON.stringify(filtered));
    }
    return true;
  },

  async saveQuestionnaire(questionnaire) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/questionnaire`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(questionnaire)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Strežnik je vrnil napako ${res.status}`);
      }
      const data = await res.json();
      // Also refresh versions cache
      await this.getQuestionnaireVersions();
      return data;
    }
    // Offline fallback: upsert into cached versions
    const cached = localStorage.getItem(KEYS.QUESTIONNAIRE_VERSIONS);
    const versions = cached ? JSON.parse(cached) : [];
    const idx = versions.findIndex(v => v.version === questionnaire.version);
    if (idx > -1) {
      versions[idx] = questionnaire;
    } else {
      versions.push(questionnaire);
    }
    localStorage.setItem(KEYS.QUESTIONNAIRE_VERSIONS, JSON.stringify(versions));
    return questionnaire;
  },

  // Rules endpoints
  async getRules() {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/rules`, {
        method: 'GET',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Napaka pri nalaganju pravil.');
      const data = await res.json();
      localStorage.setItem(KEYS.RULES, JSON.stringify(data));
      return data;
    } else {
      // Offline fallback
      return JSON.parse(localStorage.getItem(KEYS.RULES));
    }
  },

  async updateRule(level, name, description, minScore, fullDescription = '', criteria = [], improvementSuggestions = {}) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/rules/${level}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          name,
          description,
          minScore,
          full_description: fullDescription,
          criteria,
          improvement_suggestions: improvementSuggestions
        })
      });
      if (!res.ok) throw new Error('Napaka pri posodabljanju pravila.');
      return await res.json();
    } else {
      // Offline fallback
      const rules = JSON.parse(localStorage.getItem(KEYS.RULES));
      const idx = rules.findIndex(r => (r.level !== undefined ? r.level : r.id) === level);
      if (idx > -1) {
        rules[idx] = {
          ...rules[idx],
          name,
          description,
          minScore,
          full_description: fullDescription,
          criteria,
          improvement_suggestions: improvementSuggestions
        };
        localStorage.setItem(KEYS.RULES, JSON.stringify(rules));
        return rules[idx];
      }
      throw new Error('Pravilo ni najdeno.');
    }
  },

  async saveRules(rules) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/rules`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(rules)
      });
      if (!res.ok) throw new Error('Napaka pri shranjevanju pravil.');
      const data = await res.json();
      localStorage.setItem(KEYS.RULES, JSON.stringify(data));
      return data;
    } else {
      // Offline fallback
      localStorage.setItem(KEYS.RULES, JSON.stringify(rules));
      return rules;
    }
  },

  async deleteRule(level) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/rules/${level}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Napaka pri brisanju pravila.');
      return true;
    } else {
      // Offline fallback
      const rules = JSON.parse(localStorage.getItem(KEYS.RULES));
      const filtered = rules.filter(r => (r.level !== undefined ? r.level : r.id) !== level);
      localStorage.setItem(KEYS.RULES, JSON.stringify(filtered));
      return true;
    }
  },

  // Rules versions endpoints
  async getRulesVersions() {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/rules/versions`, {
          method: 'GET',
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            localStorage.setItem(KEYS.RULES_VERSIONS, JSON.stringify(data));
            return data;
          }
        }
      } catch (err) {
        console.warn('Napaka pri nalaganju verzij pravil:', err);
      }
    }
    // Offline fallback
    const cached = localStorage.getItem(KEYS.RULES_VERSIONS);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Napaka pri branju predpomnjenih različic pravil:', e);
      }
    }

    // Default seed: two built-in versions matching the questionnaire versions
    const defaults = [
      {
        version: '1.0',
        title: 'CI/CD Pravila v1.0',
        description: 'Pravila za izračun nivoja zrelosti CI/CD cevovoda.',
        levels: clientMaturityRules.levels || []
      },
      {
        version: '2.0',
        title: 'Agile & Scrum Pravila v2.0',
        description: 'Pravila za izračun nivoja agilne zrelosti razvojne ekipe.',
        levels: clientMaturityRules2.levels || []
      }
    ];
    localStorage.setItem(KEYS.RULES_VERSIONS, JSON.stringify(defaults));
    return defaults;
  },

  async getRulesByVersion(version) {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/rules/versions/${encodeURIComponent(version)}`, {
          method: 'GET',
          headers: getHeaders()
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Napaka pri nalaganju verzije pravil:', err);
      }
    }
    // Offline fallback: find in cached versions
    const cached = localStorage.getItem(KEYS.RULES_VERSIONS);
    if (cached) {
      const versions = JSON.parse(cached);
      return versions.find(v => v.version === version) || null;
    }
    return null;
  },

  async saveRulesVersion(rulesVersion) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/rules/versions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(rulesVersion)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Strežnik je vrnil napako ${res.status}`);
      }
      const data = await res.json();
      await this.getRulesVersions();
      return data;
    }
    // Offline fallback: upsert into cached versions
    const cached = localStorage.getItem(KEYS.RULES_VERSIONS);
    const versions = cached ? JSON.parse(cached) : [];
    const idx = versions.findIndex(v => v.version === rulesVersion.version);
    if (idx > -1) {
      versions[idx] = rulesVersion;
    } else {
      versions.push(rulesVersion);
    }
    localStorage.setItem(KEYS.RULES_VERSIONS, JSON.stringify(versions));
    return rulesVersion;
  },

  async deleteRulesVersion(version) {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/rules/versions/${encodeURIComponent(version)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Strežnik je vrnil napako ${res.status}`);
      }
      await this.getRulesVersions();
      return true;
    }
    // Offline fallback
    const cached = localStorage.getItem(KEYS.RULES_VERSIONS);
    if (cached) {
      const versions = JSON.parse(cached);
      const filtered = versions.filter(v => v.version !== version);
      localStorage.setItem(KEYS.RULES_VERSIONS, JSON.stringify(filtered));
      return true;
    }
    return false;
  },

  // Dynamic evaluation using backend server or offline fallback logic
  async evaluate(answers, customCategories = null, customRules = null) {
    // Always compute evaluation locally to bypass C++ backend's lack of support for complex maturity criteria.
    // This keeps the frontend JS engine as the single source of truth for both standard and custom rulesets.
    const cats = customCategories || JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
    const rls = customRules || JSON.parse(localStorage.getItem(KEYS.RULES));
    return evaluateAssessment(answers, cats, rls);
  },

  // Admin and Assignment Methods
  async adminGetUsers() {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/users`, {
          method: 'GET',
          headers: getHeaders()
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Failed to fetch online users, using offline fallback:', err);
      }
    }
    return JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
  },

  async adminCreateUser({ email, password, role }) {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/users`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ email, password, role })
        });
        if (res.ok) return await res.json();
        const err = await res.json();
        throw new Error(err.error || 'Ustvarjanje uporabnika ni uspelo.');
      } catch (err) {
        console.warn('Failed to create online user, using offline fallback:', err);
        throw err;
      }
    }
    
    // Offline fallback
    const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
    if (users.some(u => u.email?.toLowerCase() === email?.toLowerCase())) {
      throw new Error('Uporabnik s tem e-poštnim naslovom že obstaja.');
    }
    const name = parseEmailToName(email);
    const newUser = {
      id: 'u_' + Date.now(),
      email,
      name,
      username: name, // username is the parsed full name!
      password,
      role
    };
    users.push(newUser);
    localStorage.setItem(KEYS.USERS_DB, JSON.stringify(users));
    return newUser;
  },

  async setUserPassword(email, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Geslo mora imeti vsaj 6 znakov.');
    }
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/users/set-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: newPassword })
        });
        if (res.ok) return await res.json();
        const err = await res.json();
        throw new Error(err.error || 'Nastavitev gesla ni uspela.');
      } catch (err) {
        console.warn('Failed to set password online, using offline fallback:', err);
      }
    }
    // Offline fallback
    const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
    const user = users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    if (!user) {
      throw new Error('Uporabnik s tem e-poštnim naslovom ne obstaja.');
    }
    user.password = newPassword;
    localStorage.setItem(KEYS.USERS_DB, JSON.stringify(users));
    return user;
  },

  async adminDeleteUser(userId) {
    // Clean up group memberships in client storage
    const groups = JSON.parse(localStorage.getItem(KEYS.GROUPS)) || [];
    const updatedGroups = groups.map(g => ({
      ...g,
      userIds: (g.userIds || []).filter(id => String(id) !== String(userId))
    }));
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(updatedGroups));

    // Clean up assignments in client storage
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    const updatedAssignments = assignments.filter(a => String(a.userId) !== String(userId));
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(updatedAssignments));

    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/users/${userId}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (res.ok) return await res.json();
        const err = await res.json();
        throw new Error(err.error || 'Brisanje uporabnika ni uspelo.');
      } catch (err) {
        console.warn('Failed to delete online user, using offline fallback:', err);
        throw err;
      }
    }
    
    // Offline fallback
    const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
    const idx = users.findIndex(u => String(u.id) === String(userId));
    if (idx > -1) {
      users.splice(idx, 1);
      localStorage.setItem(KEYS.USERS_DB, JSON.stringify(users));
      return { status: 'ok' };
    }
    throw new Error('Uporabnik ni bil najden.');
  },

  async adminGetGroups() {
    return JSON.parse(localStorage.getItem(KEYS.GROUPS)) || [];
  },

  async adminCreateGroup({ name, userIds, githubRepos, formVersion = '1.0', rulesVersion = '1.0' }) {
    const groups = JSON.parse(localStorage.getItem(KEYS.GROUPS)) || [];
    const repoConfigs = {};
    githubRepos.forEach(repoLink => {
      repoConfigs[repoLink] = { formVersion, rulesVersion };
    });

    const newGroup = {
      id: 'grp_' + Date.now(),
      name,
      userIds,
      githubRepos,
      repoConfigs,
      createdAt: new Date().toISOString().split('T')[0]
    };
    groups.push(newGroup);
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));

    // Automatically create assignments!
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    const users = await this.adminGetUsers();
    
    userIds.forEach(userId => {
      const u = users.find(x => String(x.id) === String(userId));
      if (!u) return;
      githubRepos.forEach(repoLink => {
        const repoName = extractRepoName(repoLink);
        assignments.push({
          id: 'asgn_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
          userId: u.id,
          userEmail: u.email,
          userName: u.name,
          repoLink,
          repoName,
          groupId: newGroup.id,
          groupName: newGroup.name,
          status: 'pending', // 'pending' | 'completed'
          score: null,
          level: null,
          pipelineId: null,
          answers: null,
          formVersion,
          rulesVersion,
          createdAt: new Date().toISOString().split('T')[0]
        });
      });
    });
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    return newGroup;
  },

  async adminAddGroupMember(groupId, userId) {
    const groups = JSON.parse(localStorage.getItem(KEYS.GROUPS)) || [];
    const idx = groups.findIndex(g => g.id === groupId);
    if (idx === -1) throw new Error('Skupina ni bila najdena.');

    const group = groups[idx];
    if (group.userIds.includes(userId)) return group;

    group.userIds.push(userId);
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));

    // Automatically create assignments for this new member for all group repos!
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    const users = await this.adminGetUsers();
    const u = users.find(x => String(x.id) === String(userId) || x.email?.toLowerCase() === userId.toLowerCase());
    
    if (u) {
      group.githubRepos.forEach(repoLink => {
        // Check if assignment already exists (robust comparison)
        const exists = assignments.some(a => 
          (String(a.userId) === String(u.id) || a.userEmail?.toLowerCase() === u.email?.toLowerCase()) && 
          a.repoLink.toLowerCase() === repoLink.toLowerCase()
        );
        if (!exists) {
          const repoName = extractRepoName(repoLink);
          const config = (group.repoConfigs && group.repoConfigs[repoLink]) || { formVersion: '1.0', rulesVersion: '1.0' };
          assignments.push({
            id: 'asgn_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
            userId: u.id,
            userEmail: u.email,
            userName: u.name,
            repoLink,
            repoName,
            groupId: group.id,
            groupName: group.name,
            status: 'pending', // 'pending' | 'completed'
            score: null,
            level: null,
            pipelineId: null,
            answers: null,
            formVersion: config.formVersion || '1.0',
            rulesVersion: config.rulesVersion || '1.0',
            createdAt: new Date().toISOString().split('T')[0]
          });
        }
      });
      localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    }
    return group;
  },

  async adminDeleteGroup(groupId) {
    const groups = JSON.parse(localStorage.getItem(KEYS.GROUPS)) || [];
    const filteredGroups = groups.filter(g => g.id !== groupId);
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(filteredGroups));

    // Delete assignments for this group
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    const filteredAssignments = assignments.filter(a => a.groupId !== groupId);
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(filteredAssignments));
    return true;
  },

  async adminRemoveGroupMember(groupId, userId) {
    const groups = JSON.parse(localStorage.getItem(KEYS.GROUPS)) || [];
    const idx = groups.findIndex(g => g.id === groupId);
    if (idx === -1) throw new Error('Skupina ni bila najdena.');

    const group = groups[idx];
    group.userIds = group.userIds.filter(id => 
      String(id) !== String(userId) && 
      id.toLowerCase() !== userId.toLowerCase()
    );
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));

    // Remove pending assignments for this user in this group (robust match by ID and email)
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
    const u = users.find(x => String(x.id) === String(userId) || x.email?.toLowerCase() === userId.toLowerCase());
    
    const filteredAssignments = assignments.filter(a => {
      const isThisGroup = a.groupId === groupId;
      const isThisUser = String(a.userId) === String(userId) || 
                         a.userEmail?.toLowerCase() === userId.toLowerCase() ||
                         (u && (String(a.userId) === String(u.id) || a.userEmail?.toLowerCase() === u.email?.toLowerCase()));
      const isPending = a.status === 'pending';
      return !(isThisGroup && isThisUser && isPending);
    });
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(filteredAssignments));
    return group;
  },

  async adminAddGroupRepo(groupId, repoLink, formVersion = '1.0', rulesVersion = '1.0') {
    if (!repoLink || !repoLink.trim()) throw new Error('Vnesite povezavo do GitHub repozitorija.');
    
    const groups = JSON.parse(localStorage.getItem(KEYS.GROUPS)) || [];
    const idx = groups.findIndex(g => g.id === groupId);
    if (idx === -1) throw new Error('Skupina ni bila najdena.');

    const group = groups[idx];
    if (!group.githubRepos) group.githubRepos = [];
    
    if (group.githubRepos.some(r => r.toLowerCase() === repoLink.trim().toLowerCase())) {
      throw new Error('Ta repozitorij je že dodeljen tej skupini.');
    }

    group.githubRepos.push(repoLink.trim());
    if (!group.repoConfigs) group.repoConfigs = {};
    group.repoConfigs[repoLink.trim()] = { formVersion, rulesVersion };
    
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));

    // Create assignments for all members for this new repository
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    const users = await this.adminGetUsers();
    
    group.userIds.forEach(userId => {
      const u = users.find(x => String(x.id) === String(userId) || x.email?.toLowerCase() === userId.toLowerCase());
      if (!u) return;
      
      const exists = assignments.some(a => 
        (String(a.userId) === String(u.id) || a.userEmail?.toLowerCase() === u.email?.toLowerCase()) && 
        a.repoLink.toLowerCase() === repoLink.trim().toLowerCase()
      );
      if (!exists) {
        const repoName = extractRepoName(repoLink);
        assignments.push({
          id: 'asgn_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
          userId: u.id,
          userEmail: u.email,
          userName: u.name,
          repoLink: repoLink.trim(),
          repoName,
          groupId: group.id,
          groupName: group.name,
          status: 'pending',
          score: null,
          level: null,
          pipelineId: null,
          answers: null,
          formVersion,
          rulesVersion,
          createdAt: new Date().toISOString().split('T')[0]
        });
      }
    });
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    return group;
  },

  async adminGetAssignments() {
    return JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
  },

  async getUserAssignments(userId) {
    if (!userId) return [];
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    
    let u = null;
    try {
      const users = await this.adminGetUsers();
      u = users.find(x => 
        String(x.id) === String(userId) || 
        x.email?.toLowerCase() === String(userId).toLowerCase()
      );
    } catch (err) {
      console.warn('Failed to fetch users in getUserAssignments:', err);
    }

    return assignments.filter(a => 
      String(a.userId) === String(userId) || 
      a.userEmail?.toLowerCase() === String(userId).toLowerCase() ||
      (u && (
        String(a.userId) === String(u.id) || 
        a.userEmail?.toLowerCase() === u.email?.toLowerCase()
      ))
    );
  },

  async completeAssignment(assignmentId, score, level, pipelineId, answers) {
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    const idx = assignments.findIndex(a => a.id === assignmentId);
    if (idx > -1) {
      assignments[idx].status = 'completed';
      assignments[idx].score = score;
      assignments[idx].level = level;
      assignments[idx].pipelineId = pipelineId;
      assignments[idx].answers = answers;
      assignments[idx].completedAt = new Date().toISOString().split('T')[0];
      localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
      return assignments[idx];
    }
    throw new Error('Dodelitev ni bila najdena.');
  },

  // Compatibility hooks for older AdminDashboard.jsx tasks
  async adminGetTasks() {
    return this.adminGetAssignments();
  },

  async adminCreateTask(task) {
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    assignments.push(task);
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    return task;
  },

  async adminSaveDummyInvite(invite) {
    const invites = JSON.parse(localStorage.getItem('cicdq_dummy_invites')) || [];
    invites.push(invite);
    localStorage.setItem('cicdq_dummy_invites', JSON.stringify(invites));
    return invite;
  }
};

function extractRepoName(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    if (parts.length === 1) return parts[0];
    return u.hostname;
  } catch {
    return url || 'repo';
  }
}
