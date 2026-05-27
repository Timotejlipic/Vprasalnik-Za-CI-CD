import { evaluateAssessment } from './utils.js';
import { questionnaireCategories, maturityRules, mockPipelines } from './data.js';

import clientQuestionnaireConfig from '../questionnaire_config.json';
import clientQuestionnaireConfig2 from '../questionnaire2.json';
import clientMaturityRules from '../maturity_rules.json';
import clientMaturityRules2 from '../maturity_rules2.json';

const API_BASE = 'http://localhost:3002';

<<<<<<< HEAD
=======
// Local storage keys for offline mock database
>>>>>>> 18ff9dc (updates and fixes)
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

<<<<<<< HEAD
=======
// Parser to extract first and last name from Gmail address
>>>>>>> 18ff9dc (updates and fixes)
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

<<<<<<< HEAD
=======
// Initialize offline mock database in localStorage if empty
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
      { id: 'u_user_timotej', username: 'Timotej Lipič', role: 'user', email: 'timotej.lipic@student.um.si', name: 'Timotej Lipič', password: 'password' }
=======
      { id: 'u_user_timotej', username: 'Timotej Lipič', role: 'admin', email: 'timotej.lipic@student.um.si', name: 'Timotej Lipič', password: 'password' }
>>>>>>> 18ff9dc (updates and fixes)
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

<<<<<<< HEAD
=======
// Returns true when the current user is an offline/invite-only account whose
// ID is not a real PostgreSQL integer — we must never send their requests to
// the backend because the FK constraint on created_by_user_id would reject them.
function isOfflineUser() {
  const token = localStorage.getItem('cicdq_token') || '';
  return token.startsWith('mock_jwt_token_offline_') || token.startsWith('mock_jwt_token_');
}

// Helper to get authorization headers
>>>>>>> 18ff9dc (updates and fixes)
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

<<<<<<< HEAD
  async checkHealth() {
    const token = localStorage.getItem(KEYS.TOKEN);
    const isMock = !token || token.startsWith('mock_jwt_token_offline_') || token.startsWith('mock_jwt_token_');
    if (isMock) {
      this.isOnline = false;
      return false;
    }

=======
  // Check backend server health
  async checkHealth() {
>>>>>>> 18ff9dc (updates and fixes)
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

<<<<<<< HEAD
=======
  // Auth endpoints
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback: verify with mock credentials or registered users in database
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
      if (password.length < 6) {
        throw new Error('Geslo mora imeti vsaj 6 znakov.');
      }
      const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
      if (users.some(u => u.username?.toLowerCase() === username?.toLowerCase())) {
        throw new Error('Uporabniško ime že obstaja.');
      }
<<<<<<< HEAD
      const newUser = { 
        id: 'u_offline_' + Date.now(), 
        username, 
        role: 'user', 
        name: username, 
        email: username + '@example.com',
        password 
=======
      const newUser = {
        id: 'u_offline_' + Date.now(),
        username,
        role: 'admin',
        name: username,
        email: username + '@example.com',
        password
>>>>>>> 18ff9dc (updates and fixes)
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

<<<<<<< HEAD
  async getPipelines() {
    const online = await this.checkHealth();
    const localPipes = JSON.parse(localStorage.getItem(KEYS.PIPELINES)) || [];
    if (online) {
=======
  // Pipelines endpoints (CRUD)
  async getPipelines() {
    const online = await this.checkHealth();
    const localPipes = JSON.parse(localStorage.getItem(KEYS.PIPELINES)) || [];
    if (online && !isOfflineUser()) {
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
            return p;
          });
          
=======
            
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
          
          // Merge local mock pipelines so we never lose evaluations in multi-tab/offline setups
>>>>>>> 18ff9dc (updates and fixes)
          const merged = [...serverPipes];
          localPipes.forEach(lp => {
            if (!merged.some(sp => String(sp.id) === String(lp.id) || (sp.repoLink === lp.repoLink && sp.assessor === lp.assessor))) {
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
<<<<<<< HEAD
    if (online) {
=======
    if (online && !isOfflineUser()) {
>>>>>>> 18ff9dc (updates and fixes)
      const res = await fetch(`${API_BASE}/api/pipelines`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(pipeline)
      });
      if (!res.ok) throw new Error('Napaka pri shranjevanju cevovoda.');
      return await res.json();
    } else {
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
      const pipelines = JSON.parse(localStorage.getItem(KEYS.PIPELINES));
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
    }
  },

  async updatePipeline(id, pipeline, createNewVersion = false) {
    const online = await this.checkHealth();
<<<<<<< HEAD
    if (online) {
      if (createNewVersion) {
=======
    if (online && !isOfflineUser()) {
      if (createNewVersion) {
        // Fetch old pipeline from server to create historical snapshot before updating
>>>>>>> 18ff9dc (updates and fixes)
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

      const res = await fetch(`${API_BASE}/api/pipelines/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...pipeline, createNewVersion })
      });
      if (!res.ok) throw new Error('Napaka pri posodabljanju cevovoda.');
      const data = await res.json();
      
      const snapshotKey = `cicdq_versions_${id}`;
      data.versions = JSON.parse(localStorage.getItem(snapshotKey)) || [];
      return data;
    } else {
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
      const pipelines = JSON.parse(localStorage.getItem(KEYS.PIPELINES));
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
      throw new Error('Cevovod ni bil najden.');
    }
  },

  async deletePipeline(id) {
    const online = await this.checkHealth();
<<<<<<< HEAD
    if (online) {
=======
    if (online && !isOfflineUser()) {
>>>>>>> 18ff9dc (updates and fixes)
      const res = await fetch(`${API_BASE}/api/pipelines/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Napaka pri brisanju cevovoda.');
      return true;
    } else {
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
      const pipelines = JSON.parse(localStorage.getItem(KEYS.PIPELINES));
      const filtered = pipelines.filter(p => p.id !== id);
      localStorage.setItem(KEYS.PIPELINES, JSON.stringify(filtered));
      return true;
    }
  },

<<<<<<< HEAD
=======
  // Categories / Questionnaire endpoints
>>>>>>> 18ff9dc (updates and fixes)
  async getCategories() {
    const online = await this.checkHealth();
    if (online) {
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: 'GET',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Napaka pri nalaganju kategorij.');
<<<<<<< HEAD
=======
      // Keep offline cache up to date
>>>>>>> 18ff9dc (updates and fixes)
      const data = await res.json();
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
      return data;
    } else {
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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

<<<<<<< HEAD
=======
  // Questionnaire versions endpoints
>>>>>>> 18ff9dc (updates and fixes)
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
          localStorage.setItem(KEYS.QUESTIONNAIRE_VERSIONS, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Napaka pri nalaganju verzij vprašalnika:', err);
      }
    }
<<<<<<< HEAD
    const cached = localStorage.getItem(KEYS.QUESTIONNAIRE_VERSIONS);
    if (cached) return JSON.parse(cached);
=======
    // Offline fallback
    const cached = localStorage.getItem(KEYS.QUESTIONNAIRE_VERSIONS);
    if (cached) return JSON.parse(cached);
    // Default seed: two built-in versions
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
    // Offline fallback: find in cached versions
>>>>>>> 18ff9dc (updates and fixes)
    const cached = localStorage.getItem(KEYS.QUESTIONNAIRE_VERSIONS);
    if (cached) {
      const versions = JSON.parse(cached);
      return versions.find(v => v.version === version) || null;
    }
    return null;
  },

  async saveQuestionnaire(questionnaire) {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/questionnaire`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(questionnaire)
        });
        if (res.ok) {
          const data = await res.json();
<<<<<<< HEAD
=======
          // Also refresh versions cache
>>>>>>> 18ff9dc (updates and fixes)
          await this.getQuestionnaireVersions();
          return data;
        }
      } catch (err) {
        console.warn('Napaka pri shranjevanju vprašalnika:', err);
      }
    }
<<<<<<< HEAD
=======
    // Offline fallback: upsert into cached versions
>>>>>>> 18ff9dc (updates and fixes)
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

<<<<<<< HEAD
=======
  // Rules endpoints
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
      // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
      const rules = JSON.parse(localStorage.getItem(KEYS.RULES));
      const filtered = rules.filter(r => (r.level !== undefined ? r.level : r.id) !== level);
      localStorage.setItem(KEYS.RULES, JSON.stringify(filtered));
      return true;
    }
  },

<<<<<<< HEAD
=======
  // Rules versions endpoints
>>>>>>> 18ff9dc (updates and fixes)
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
          localStorage.setItem(KEYS.RULES_VERSIONS, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Napaka pri nalaganju verzij pravil:', err);
      }
    }
<<<<<<< HEAD
    const cached = localStorage.getItem(KEYS.RULES_VERSIONS);
    if (cached) return JSON.parse(cached);

=======
    // Offline fallback
    const cached = localStorage.getItem(KEYS.RULES_VERSIONS);
    if (cached) return JSON.parse(cached);

    // Default seed: two built-in versions matching the questionnaire versions
>>>>>>> 18ff9dc (updates and fixes)
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
<<<<<<< HEAD
=======
    // Offline fallback: find in cached versions
>>>>>>> 18ff9dc (updates and fixes)
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
      try {
        const res = await fetch(`${API_BASE}/api/rules/versions`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(rulesVersion)
        });
        if (res.ok) {
          const data = await res.json();
          await this.getRulesVersions();
          return data;
        }
      } catch (err) {
        console.warn('Napaka pri shranjevanju verzije pravil:', err);
      }
    }
<<<<<<< HEAD
=======
    // Offline fallback: upsert into cached versions
>>>>>>> 18ff9dc (updates and fixes)
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
      try {
        const res = await fetch(`${API_BASE}/api/rules/versions/${encodeURIComponent(version)}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (res.ok) {
          await this.getRulesVersions();
          return true;
        }
      } catch (err) {
        console.warn('Napaka pri brisanju verzije pravil:', err);
      }
    }
<<<<<<< HEAD
=======
    // Offline fallback
>>>>>>> 18ff9dc (updates and fixes)
    const cached = localStorage.getItem(KEYS.RULES_VERSIONS);
    if (cached) {
      const versions = JSON.parse(cached);
      const filtered = versions.filter(v => v.version !== version);
      localStorage.setItem(KEYS.RULES_VERSIONS, JSON.stringify(filtered));
      return true;
    }
    return false;
  },

<<<<<<< HEAD
  async evaluate(answers, customCategories = null, customRules = null) {
=======
  // Dynamic evaluation using backend server or offline fallback logic
  async evaluate(answers, customCategories = null, customRules = null) {
    // Always compute evaluation locally to bypass C++ backend's lack of support for complex maturity criteria.
    // This keeps the frontend JS engine as the single source of truth for both standard and custom rulesets.
>>>>>>> 18ff9dc (updates and fixes)
    const cats = customCategories || JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
    const rls = customRules || JSON.parse(localStorage.getItem(KEYS.RULES));
    return evaluateAssessment(answers, cats, rls);
  },

<<<<<<< HEAD
=======
  // Admin and Assignment Methods
>>>>>>> 18ff9dc (updates and fixes)
  async adminGetUsers() {
    return JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
  },

  async adminCreateUser({ email, password, role }) {
    const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
    if (users.some(u => u.email?.toLowerCase() === email?.toLowerCase())) {
      throw new Error('Uporabnik s tem e-poštnim naslovom že obstaja.');
    }
    const name = parseEmailToName(email);
<<<<<<< HEAD
=======
    // Admin-created users are invite-only evaluators — always role:'evaluator'
>>>>>>> 18ff9dc (updates and fixes)
    const newUser = {
      id: 'u_' + Date.now(),
      email,
      name,
<<<<<<< HEAD
      username: name, 
      password,
      role
=======
      username: name,
      password,
      role: 'evaluator'
>>>>>>> 18ff9dc (updates and fixes)
    };
    users.push(newUser);
    localStorage.setItem(KEYS.USERS_DB, JSON.stringify(users));
    return newUser;
  },

  async adminGetGroups() {
    return JSON.parse(localStorage.getItem(KEYS.GROUPS)) || [];
  },

  async adminCreateGroup({ name, userIds, githubRepos }) {
    const groups = JSON.parse(localStorage.getItem(KEYS.GROUPS)) || [];
    const newGroup = {
      id: 'grp_' + Date.now(),
      name,
      userIds,
      githubRepos,
      createdAt: new Date().toISOString().split('T')[0]
    };
    groups.push(newGroup);
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));

<<<<<<< HEAD
=======
    // Automatically create assignments!
>>>>>>> 18ff9dc (updates and fixes)
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
    
    userIds.forEach(userId => {
      const u = users.find(x => x.id === userId);
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
<<<<<<< HEAD
          status: 'pending', 
=======
          status: 'pending', // 'pending' | 'completed'
>>>>>>> 18ff9dc (updates and fixes)
          score: null,
          level: null,
          pipelineId: null,
          answers: null,
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

<<<<<<< HEAD
=======
    // Automatically create assignments for this new member for all group repos!
>>>>>>> 18ff9dc (updates and fixes)
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    const users = JSON.parse(localStorage.getItem(KEYS.USERS_DB)) || [];
    const u = users.find(x => x.id === userId);
    
    if (u) {
      group.githubRepos.forEach(repoLink => {
<<<<<<< HEAD
=======
        // Check if assignment already exists
>>>>>>> 18ff9dc (updates and fixes)
        const exists = assignments.some(a => a.userId === userId && a.repoLink === repoLink);
        if (!exists) {
          const repoName = extractRepoName(repoLink);
          assignments.push({
            id: 'asgn_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
            userId: u.id,
            userEmail: u.email,
            userName: u.name,
            repoLink,
            repoName,
            groupId: group.id,
            groupName: group.name,
<<<<<<< HEAD
            status: 'pending', 
=======
            status: 'pending', // 'pending' | 'completed'
>>>>>>> 18ff9dc (updates and fixes)
            score: null,
            level: null,
            pipelineId: null,
            answers: null,
            createdAt: new Date().toISOString().split('T')[0]
          });
        }
      });
      localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    }
    return group;
  },

  async adminGetAssignments() {
    return JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
  },

  async getUserAssignments(userId) {
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
    return assignments.filter(a => a.userId === userId);
  },

  async completeAssignment(assignmentId, score, level, pipelineId, answers) {
    const assignments = JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS)) || [];
<<<<<<< HEAD
    const idx = assignments.findIndex(a => a.id === assignmentId);
=======
    let idx = assignments.findIndex(a => a.id === assignmentId);

    // Fallback: if the ID doesn't match (can happen when invite URL re-seeds assignments),
    // find a pending assignment for the same user + repoLink via the saved pipeline.
    if (idx === -1 && pipelineId) {
      const pipelines = JSON.parse(localStorage.getItem(KEYS.PIPELINES)) || [];
      const pipe = pipelines.find(p => String(p.id) === String(pipelineId));
      if (pipe) {
        idx = assignments.findIndex(a =>
          a.userId === pipe.userId &&
          a.repoLink === pipe.repoLink &&
          a.status !== 'completed'
        );
      }
    }

>>>>>>> 18ff9dc (updates and fixes)
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

<<<<<<< HEAD
=======
  // Compatibility hooks for older AdminDashboard.jsx tasks
>>>>>>> 18ff9dc (updates and fixes)
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
