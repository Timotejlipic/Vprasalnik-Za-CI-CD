import React, { useState, useEffect } from 'react';
import { questionnaireCategories, maturityRules, mockPipelines } from './data.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import LandingPage from './components/LandingPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import AssessmentWrapper from './components/AssessmentWrapper.jsx';
import Builder from './components/Builder.jsx';
import Rules from './components/Rules.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import UserAssessments from './components/UserAssessments.jsx';
import { api, parseEmailToName } from './api.js';
import { openResultsInNewWindow, evaluateAssessment, detectPipelineChanges } from './utils.js';
import ResultsPanel from './components/ResultsPanel.jsx';

import clientQuestionnaireConfig from '../questionnaire_config.json';
import clientMaturityRules from '../maturity_rules.json';

// Normalise super-category label from a section id
function getSuperCategory(sectionId) {
  const id = (sectionId || '').toLowerCase();
  if (id.includes('build') || id.includes('unit_test') || id.includes('sc_build') || id.includes('sc_test')) {
    return 'Neprekinjena integracija (CI)';
  }
  if (id.includes('deploy') || id.includes('sc_deploy')) {
    return 'Neprekinjeno nameščanje (CD)';
  }
  return 'Ostalo';
}

/**
 * Converts a questionnaire's sections array into the flat categories array
 * used by the UI.  Handles TWO backend formats:
 *   1. questionnaire_config.json  →  section.items  (nested items directly in section)
 *   2. backend seeded format      →  section.categories  (array of category objects)
 */
function convertConfigSectionsToCategories(sections) {
  if (!sections || !Array.isArray(sections)) return [];
  const result = [];
  sections.forEach(section => {
    const superCategory = getSuperCategory(section.id);
    if (section.categories && Array.isArray(section.categories)) {
      // Backend seeded format: each element in categories → one UI category
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
      // questionnaire_config.json format: section IS the category
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

export default function App() {
  const [appState, setAppState] = useState('landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('guest');
  const [currentView, setCurrentView] = useState('dashboard');
  const [apiOnline, setApiOnline] = useState(false);

  // States initialized from offline mock database/cache initially
  const [pipelines, setPipelines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);

  // Questionnaire versioning
  const [questionnaires, setQuestionnaires] = useState([]); // all available versions
  const [selectedVersion, setSelectedVersion] = useState(null); // currently active version string

  // Rules versioning
  const [rulesVersions, setRulesVersions] = useState([]); // all available rules versions
  const [selectedRulesVersion, setSelectedRulesVersion] = useState(null); // currently active rules version string

  const [currentAssessment, setCurrentAssessment] = useState({});
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [currentAssessmentVersion, setCurrentAssessmentVersion] = useState(null);
  const [viewType, setViewType] = useState('collapsible'); // 'collapsible' | 'tabs'
  const [assessmentMeta, setAssessmentMeta] = useState(null); // { name, repoLink } shown in sidebar

  // Versioning & Read-Only states
  const [createNewVersionMode, setCreateNewVersionMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [historicVersion, setHistoricVersion] = useState(null);
  const [isSyncMode, setIsSyncMode] = useState(false);
  const [syncDiff, setSyncDiff] = useState(null);

  // Invite states
  const [initialShowLogin, setInitialShowLogin] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState('');
  const [setPasswordEmail, setSetPasswordEmail] = useState('');

  // Inline Results view states
  const [inlineResultsData, setInlineResultsData] = useState(null);

  const [customAlert, setCustomAlert] = useState(null);

  useEffect(() => {
    window.alert = (message) => {
      setCustomAlert({ message });
    };
  }, []);

  // Check health and load initial data
  useEffect(() => {
    async function initApp() {
      const params = new URLSearchParams(window.location.search);
      const inviteEmail = params.get('email') || params.get('invite_email');
      const inviteUser = params.get('invite_user');
      const urlRepos = params.get('repos');
      const urlGroups = params.get('groups');

      // 1. Restore login session
      let savedUser = api.getCurrentUser();

      const setPasswordParam = params.get('set_password');
      if (setPasswordParam) {
        setSetPasswordEmail(setPasswordParam);
        setAppState('landing');
        // Clear set_password parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (inviteEmail || inviteUser || urlRepos || urlGroups) {
        let matchedUser = null;
        try {
          const usersData = await api.adminGetUsers();
          matchedUser = usersData.find(u => 
            (inviteEmail && u.email?.toLowerCase() === inviteEmail.toLowerCase()) ||
            (inviteUser && String(u.id) === String(inviteUser))
          );
        } catch (err) {
          console.warn('Failed to fetch users during auto-login:', err);
        }
        
        if (!matchedUser && inviteEmail) {
          try {
            const randomPassword = 'tmp_' + Math.random().toString(36).slice(2, 10);
            matchedUser = await api.adminCreateUser({
              email: inviteEmail.trim(),
              password: randomPassword,
              role: 'user'
            });
          } catch (err) {
            console.warn('Failed to auto-create user, using fallback object:', err);
            const name = parseEmailToName(inviteEmail);
            matchedUser = {
              id: 'u_fallback_' + Date.now(),
              email: inviteEmail,
              name: name,
              username: name,
              role: 'user'
            };
          }
        }

        if (matchedUser) {
          // Get a real backend session so server-side assignments load. Fall
          // back to an offline mock session only if the backend is unreachable.
          const session = await api.inviteLogin(matchedUser.username || matchedUser.email, matchedUser.email);
          if (session && session.user) {
            savedUser = session.user;
            matchedUser = session.user;
          } else {
            localStorage.setItem('cicdq_token', 'mock_jwt_token_offline_' + matchedUser.id);
            localStorage.setItem('cicdq_user', JSON.stringify(matchedUser));
            savedUser = matchedUser;
          }

          try {
            // Process assignments immediately!
            const reposList = urlRepos ? urlRepos.split(',') : [];
            const groupsList = urlGroups ? urlGroups.split(',') : [];

            // Persist link assignments to the backend (deduped server-side).
            if (reposList.length > 0) {
              try {
                await api.acceptInvite(reposList.map((repoLink, index) => ({
                  repoLink,
                  groupName: groupsList[index] || 'Skupina'
                })));
              } catch (e) {
                console.warn('Failed to persist invite assignments to backend:', e);
              }
            }

            if (reposList.length > 0) {
              const assignments = JSON.parse(localStorage.getItem('cicdq_offline_assignments')) || [];
              const nonUserOrCompletedAsgns = assignments.filter(a => !(a.userId === matchedUser.id && a.status === 'pending'));
              
              reposList.forEach((repoLink, index) => {
                const groupName = groupsList[index] || 'Skupina';
                const exists = nonUserOrCompletedAsgns.some(a => a.userId === matchedUser.id && a.repoLink === repoLink);
                if (!exists) {
                  let repoName = repoLink;
                  try {
                    const u = new URL(repoLink);
                    const parts = u.pathname.split('/').filter(Boolean);
                    if (parts.length >= 2) repoName = `${parts[0]}/${parts[1]}`;
                  } catch {}
                  
                  nonUserOrCompletedAsgns.push({
                    id: 'asgn_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
                    userId: matchedUser.id,
                    userEmail: matchedUser.email,
                    userName: matchedUser.name || matchedUser.username,
                    repoLink,
                    repoName,
                    groupId: 'grp_url_' + index,
                    groupName: groupName,
                    status: 'pending',
                    score: null,
                    level: null,
                    pipelineId: null,
                    answers: null,
                    createdAt: new Date().toISOString().split('T')[0]
                  });
                }
              });
              localStorage.setItem('cicdq_offline_assignments', JSON.stringify(nonUserOrCompletedAsgns));
            } else {
              // Default fallback group
              const existingAsgns = JSON.parse(localStorage.getItem('cicdq_offline_assignments')) || [];
              const userHasAsgns = existingAsgns.some(a => a.userId === matchedUser.id);
              if (!userHasAsgns) {
                await api.adminCreateGroup({
                  name: 'Splošna skupina',
                  userIds: [matchedUser.id],
                  githubRepos: [
                    'https://github.com/react/react',
                    'https://github.com/vitejs/vite',
                    'https://github.com/vuejs/core'
                  ]
                });
              }
            }
          } catch (err) {
            console.error('Failed to sync assignments during auto-login:', err);
          }
        }

        // Clear invitation parameters from URL for clean view
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (savedUser) {
        setUser(savedUser.username);
        setUserRole(savedUser.role || 'user');
        setIsLoggedIn(true);
        setAppState('app');
        if (savedUser.role === 'user') {
          setCurrentView('user_assessments');
        } else {
          setCurrentView('dashboard');
        }
      } else {
        setUserRole('guest');
      }

      // 2. Check server health in the background
      let online = false;
      try {
        online = await api.checkHealth();
      } catch {}
      setApiOnline(online);

      // 3. Load rules & categories
      let rVersions = [];
      try {
        rVersions = await api.getRulesVersions();
        setRulesVersions(rVersions || []);
      } catch (err) {
        console.error('Failed to load rules versions:', err);
      }

      let qVersions = [];
      try {
        qVersions = await api.getQuestionnaireVersions();
        setQuestionnaires(qVersions || []);
      } catch (err) {
        console.error('Failed to load questionnaire versions:', err);
      }

      // Set defaults from versions
      if (rVersions && rVersions.length > 0) {
        const latestR = rVersions[rVersions.length - 1];
        setSelectedRulesVersion(latestR.version);
        if (latestR.levels && latestR.levels.length > 0) {
          setRules(latestR.levels);
        }
      } else {
        try {
          const rulesData = await api.getRules();
          setRules(rulesData);
        } catch (err) {
          console.error('Failed to load rules from server, using local fallback:', err);
          setRules([...maturityRules]);
        }
      }

      if (qVersions && qVersions.length > 0) {
        const latestQ = qVersions[qVersions.length - 1];
        setSelectedVersion(latestQ.version);
        const cats = convertConfigSectionsToCategories(latestQ.sections || []);
        if (cats.some(c => c.items && c.items.length > 0)) {
          setCategories(cats);
        }
      } else {
        try {
          const catsData = await api.getCategories();
          setCategories(catsData);
        } catch (err) {
          console.error('Failed to load categories from server, using local fallback:', err);
          setCategories(JSON.parse(JSON.stringify(questionnaireCategories)));
        }
      }
    }
    initApp();
  }, []);

  // Load pipelines when logged in
  useEffect(() => {
    async function loadUserPipelines() {
      try {
        const pipelinesData = await api.getPipelines();
        setPipelines(pipelinesData.map(p => ({ ...p, versions: p.versions || [] })));
      } catch (err) {
        console.error('Failed to load pipelines, using offline fallback:', err);
        const cached = JSON.parse(localStorage.getItem('cicdq_offline_pipelines')) || [];
        setPipelines(cached.map(p => ({ ...p, versions: p.versions || [] })));
      }
    }
    loadUserPipelines();

    // Sync pipelines across tabs when localStorage updates
    const handleStorage = (e) => {
      if (e.key === 'cicdq_offline_pipelines') {
        loadUserPipelines();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isLoggedIn, appState]);


  // ── Explicit: load categories for a specific version ───────────────────────
  // Called from Builder version-dropdown, startNewAssessment, loadAssessment.
  // NOT called automatically on state changes (avoids overriding imported data).
  function loadCategoriesForVersion(version, versionList) {
    const list = versionList || questionnaires;
    const q = list.find(v => v.version === version);
    if (!q) return;
    const cats = convertConfigSectionsToCategories(q.sections || []);
    // Only apply if the result actually has items (don't override with empty data)
    if (cats.some(c => c.items && c.items.length > 0)) {
      setCategories(cats);
    }
  }

  // ── Explicit: load rules for a specific version ───────────────────────
  function loadRulesForVersion(version, versionList) {
    const list = versionList || rulesVersions;
    const r = list.find(v => v.version === version);
    if (!r) return;
    if (r.levels && r.levels.length > 0) {
      setRules(r.levels);
    }
  }

  const switchView = (viewName, bypassReset = false) => {
    setCurrentView(viewName);
    if (viewName === 'assessment' && !bypassReset) {
      resetAssessment();
    }
    if (viewName !== 'assessment' && viewName !== 'results') {
      setAssessmentMeta(null);
      setInlineResultsData(null);
      if (isReadOnly) {
        resetAssessment();
      }
    }
  };

  const resetAssessment = () => {
    setCurrentAssessmentId(null);
    setCurrentAssessment({});
    setCurrentAssessmentVersion(null);
    setCreateNewVersionMode(false);
    setIsReadOnly(false);
    setHistoricVersion(null);
    setIsSyncMode(false);
    setSyncDiff(null);
  };

  const loadAssessment = (id) => {
    const p = pipelines.find(x => String(x.id) === String(id));
    if (p) {
      setCurrentAssessmentId(p.id);
      setCurrentAssessment({ ...p.answers });
      // Always load the correct categories for this version
      const v = p.version || selectedVersion;
      if (v) {
        setSelectedVersion(v);
        setCurrentAssessmentVersion(v);
        loadCategoriesForVersion(v);
      }
      // Load the rules for this rulesVersion
      const rv = p.rulesVersion || p.version || selectedRulesVersion;
      if (rv) {
        setSelectedRulesVersion(rv);
        loadRulesForVersion(rv);
      }
    }
  };

  const onEditAssessment = (id) => {
    loadAssessment(id);
    setCreateNewVersionMode(false);
    setIsReadOnly(false);
    setHistoricVersion(null);
    switchView('assessment', true);
  };

  const onNewVersionAssessment = (id) => {
    loadAssessment(id);
    setCreateNewVersionMode(true);
    setIsReadOnly(false);
    setHistoricVersion(null);
    switchView('assessment', true);
  };

  const onSyncAssessment = (id) => {
    const p = pipelines.find(x => String(x.id) === String(id));
    if (!p) return;
    
    const diff = detectPipelineChanges(p, questionnaires, rulesVersions);
    
    setCurrentAssessmentId(p.id);
    
    const initialAnswers = { ...p.answers };
    diff.added.forEach(a => {
      if (!(a.id in initialAnswers)) {
        initialAnswers[a.id] = (a.type === 'checkbox' || a.type === 'yes_no_na') ? 'NE' : '';
      }
    });
    
    setCurrentAssessment(initialAnswers);
    
    const targetQVersion = p.qVersion || p.version || "1.0";
    const targetRVersion = p.rulesVersion || p.version || "1.0";
    
    setSelectedVersion(targetQVersion);
    setCurrentAssessmentVersion(targetQVersion);
    loadCategoriesForVersion(targetQVersion);
    
    setSelectedRulesVersion(targetRVersion);
    loadRulesForVersion(targetRVersion);
    
    setCreateNewVersionMode(true);
    setIsReadOnly(false);
    setHistoricVersion(null);
    setIsSyncMode(true);
    setSyncDiff(diff);
    switchView('assessment', true);
  };

  const onViewHistoricVersion = (pipelineId, versionObj) => {
    const p = pipelines.find(x => String(x.id) === String(pipelineId));
    if (p) {
      setCurrentAssessmentId(p.id);
      setCurrentAssessment({ ...versionObj.answers });
      const v = versionObj.qVersion || p.version || selectedVersion;
      if (v) {
        setSelectedVersion(v);
        setCurrentAssessmentVersion(v);
        loadCategoriesForVersion(v);
      }
      const rv = versionObj.rulesVersion || p.rulesVersion || p.version || selectedRulesVersion;
      if (rv) {
        setSelectedRulesVersion(rv);
        loadRulesForVersion(rv);
      }
      setIsReadOnly(true);
      setHistoricVersion(versionObj);
      switchView('assessment', true);
    }
  };

  const onPreviewAnswers = (pipeline) => {
    const v = pipeline.version || selectedVersion || '1.0';
    const rv = pipeline.rulesVersion || pipeline.version || selectedRulesVersion || '1.0';
    
    try {
      const q = questionnaires.find(x => x.version === v) || questionnaires[0];
      const processedCats = q ? convertConfigSectionsToCategories(q.sections || []) : categories;
      
      const rObj = rulesVersions.find(x => x.version === rv) || rulesVersions[0];
      const activeRules = rObj ? (rObj.levels || rObj) : rules;
      
      const res = evaluateAssessment(pipeline.answers, processedCats, activeRules);
      
      setInlineResultsData({
        answers: pipeline.answers,
        results: res,
        categories: processedCats,
        rules: activeRules,
        isReadOnly: true,
        title: pipeline.name
      });
      switchView('results', true);
    } catch (err) {
      alert('Napaka pri prikazu odgovorov: ' + err.message);
    }
  };

  // Called from Dashboard when user picks a version for a new assessment
  const startNewAssessment = (version, rulesVersion) => {
    resetAssessment();
    setSelectedVersion(version);
    setCurrentAssessmentVersion(version);
    loadCategoriesForVersion(version);
    if (rulesVersion) {
      setSelectedRulesVersion(rulesVersion);
      loadRulesForVersion(rulesVersion);
    }
    setCreateNewVersionMode(false);
    setIsReadOnly(false);
    setHistoricVersion(null);
    switchView('assessment', true);
  };

  // Refresh questionnaire versions list (called from Builder after import)
  const refreshQuestionnaires = async () => {
    try {
      const versions = await api.getQuestionnaireVersions();
      setQuestionnaires(versions || []);
      return versions;
    } catch (err) {
      console.error('Failed to refresh questionnaire versions:', err);
      return questionnaires;
    }
  };

  const handlePdf = () => window.print();
  const handleExport = () => {
    const json = JSON.stringify({ pipelines, categories, rules }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maturityvault-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClientConfig = () => {
    try {
      if (clientQuestionnaireConfig && clientQuestionnaireConfig.sections) {
        setCategories(convertConfigSectionsToCategories(clientQuestionnaireConfig.sections));
      }
      if (clientMaturityRules && clientMaturityRules.levels) {
        setRules(clientMaturityRules.levels);
      }
      alert('Konfiguracija in pravila stranke so uspešno uvoženi!');
    } catch (err) {
      alert('Napaka pri uvozu konfiguracije stranke: ' + err.message);
    }
  };

  const handleImport = () => {
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
          if (data.pipelines) setPipelines(data.pipelines);
          if (data.categories) {
            setCategories(data.categories);
          } else if (data.sections) {
            setCategories(convertConfigSectionsToCategories(data.sections));
          }
          if (data.rules) {
            setRules(data.rules);
          } else if (data.levels) {
            setRules(data.levels);
          }
          alert('Uvoz uspešen!');
        } catch {
          alert('Neveljavna JSON datoteka.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const renderView = () => {
    if ((currentView === 'builder' || currentView === 'rules') && userRole !== 'admin' && userRole !== 'user') {
      setTimeout(() => setCurrentView('dashboard'), 0);
      return null;
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            pipelines={pipelines}
            setPipelines={setPipelines}
            switchView={switchView}
            loadAssessment={loadAssessment}
            resetAssessment={resetAssessment}
            questionnaires={questionnaires}
            rulesVersions={rulesVersions}
            userRole={userRole}
            startNewAssessment={startNewAssessment}
            onEditAssessment={onEditAssessment}
            onNewVersionAssessment={onNewVersionAssessment}
            onViewHistoricVersion={onViewHistoricVersion}
            onPreviewAnswers={onPreviewAnswers}
            onSyncAssessment={onSyncAssessment}
          />
        );
      case 'assessment':
        return (
          <AssessmentWrapper
            user={user}
            isLoggedIn={isLoggedIn}
            pipelines={pipelines}
            setPipelines={setPipelines}
            currentAssessment={currentAssessment}
            setCurrentAssessment={setCurrentAssessment}
            currentAssessmentId={currentAssessmentId}
            initialName={assessmentMeta ? assessmentMeta.name : (currentAssessmentId ? (pipelines.find(x => String(x.id) === String(currentAssessmentId))?.name || '') : '')}
            initialRepoLink={assessmentMeta ? assessmentMeta.repoLink : (currentAssessmentId ? (pipelines.find(x => String(x.id) === String(currentAssessmentId))?.repoLink || '') : '')}
            categories={categories}
            rules={rules}
            switchView={switchView}
            viewType={viewType}
            onSetupDone={setAssessmentMeta}
            assessmentVersion={currentAssessmentVersion || selectedVersion}
            rulesVersion={selectedRulesVersion}
            createNewVersionMode={createNewVersionMode}
            isReadOnly={isReadOnly}
            historicVersion={historicVersion}
            isSyncMode={isSyncMode}
            syncDiff={syncDiff}
            isSidebarOpen={isSidebarOpen}
            assessmentMeta={assessmentMeta}
            isLocked={!!assessmentMeta}
            onCalculateResults={(resData) => {
              setInlineResultsData(resData);
              switchView('results', true);
            }}
          />
        );
      case 'results':
        return inlineResultsData ? (
          <ResultsPanel
            results={inlineResultsData.results}
            answers={inlineResultsData.answers}
            categories={inlineResultsData.categories}
            rules={inlineResultsData.rules}
            isReadOnly={inlineResultsData.isReadOnly}
            isLoggedIn={isLoggedIn}
            isInline={true}
            onSave={inlineResultsData.onSave}
            onClose={() => {
              if (userRole === 'user') {
                switchView('user_assessments', true);
              } else {
                switchView('dashboard', true);
              }
            }}
          />
        ) : null;
      case 'admin_dashboard':
        return (
          <AdminDashboard
            pipelines={pipelines}
            switchView={switchView}
            questionnaires={questionnaires}
            rulesVersions={rulesVersions}
            onPreviewAnswers={onPreviewAnswers}
          />
        );
      case 'user_assessments':
        return (
          <UserAssessments
            user={user}
            isLoggedIn={isLoggedIn}
            switchView={switchView}
            onPreviewAnswers={onPreviewAnswers}
            startAssessmentForRepo={async (repoLink, assignmentId) => {
              resetAssessment();
              
              let fVer = '1.0';
              let rVer = '1.0';
              
              try {
                const asgns = await api.adminGetAssignments();
                const matched = asgns.find(a => String(a.id) === String(assignmentId));
                if (matched) {
                  fVer = matched.formVersion || '1.0';
                  rVer = matched.rulesVersion || '1.0';
                }
              } catch (err) {
                console.warn('Failed to load assignment versions, using 1.0 default:', err);
              }
              
              setSelectedVersion(fVer);
              setCurrentAssessmentVersion(fVer);
              setSelectedRulesVersion(rVer);
              loadCategoriesForVersion(fVer);
              loadRulesForVersion(rVer);
              
              // Automatically extract repo name
              let repoName = repoLink;
              try {
                const u = new URL(repoLink);
                const parts = u.pathname.split('/').filter(Boolean);
                if (parts.length >= 2) repoName = `${parts[0]}/${parts[1]}`;
              } catch {}
              
              setAssessmentMeta({
                name: repoName,
                repoLink: repoLink,
                assignmentId: assignmentId
              });
              switchView('assessment', true);
            }}
          />
        );
      case 'builder':
        return (
          <Builder
            categories={categories}
            setCategories={setCategories}
            questionnaires={questionnaires}
            selectedVersion={selectedVersion}
            setSelectedVersion={setSelectedVersion}
            refreshQuestionnaires={refreshQuestionnaires}
            loadCategoriesForVersion={loadCategoriesForVersion}
            userRole={userRole}
          />
        );
      case 'rules':
        return (
          <Rules
            rules={rules}
            setRules={setRules}
            rulesVersions={rulesVersions}
            selectedRulesVersion={selectedRulesVersion}
            setSelectedRulesVersion={setSelectedRulesVersion}
            loadRulesForVersion={loadRulesForVersion}
            setRulesVersions={setRulesVersions}
            userRole={userRole}
            categories={categories}
          />
        );
      default:
        return (
          <Dashboard
            pipelines={pipelines}
            setPipelines={setPipelines}
            switchView={switchView}
            loadAssessment={loadAssessment}
            resetAssessment={resetAssessment}
            questionnaires={questionnaires}
            rulesVersions={rulesVersions}
            userRole={userRole}
            startNewAssessment={startNewAssessment}
            onEditAssessment={onEditAssessment}
            onNewVersionAssessment={onNewVersionAssessment}
            onViewHistoricVersion={onViewHistoricVersion}
            onPreviewAnswers={onPreviewAnswers}
            onSyncAssessment={onSyncAssessment}
          />
        );
    }
  };

  const enterAsGuest = () => {
    setUser('Gost');
    setUserRole('guest');
    setAppState('app');
  };

  const enterAsAdmin = async (username) => {
    setUser(username);
    const currentUser = api.getCurrentUser();
    const role = currentUser?.role || 'user';
    setUserRole(role);
    setIsLoggedIn(true);
    setAppState('app');

    // Process pending invite if one exists in sessionStorage
    const pendingInviteStr = sessionStorage.getItem('cicdq_pending_invite');
    if (pendingInviteStr && currentUser) {
      try {
        const invite = JSON.parse(pendingInviteStr);
        const urlRepos = invite.repos ? invite.repos.split(',') : [];
        const urlGroups = invite.groups ? invite.groups.split(',') : [];

        if (urlRepos.length > 0) {
          // Persist the invited user's assignments to the backend so the admin
          // can see their completions across devices/browsers.
          try {
            await api.acceptInvite(urlRepos.map((repoLink, index) => ({
              repoLink,
              groupName: urlGroups[index] || 'Skupina'
            })));
          } catch (e) {
            console.warn('Failed to persist invite assignments to backend:', e);
          }

          const assignments = JSON.parse(localStorage.getItem('cicdq_offline_assignments')) || [];

          // Clear any existing pending assignments for this user to avoid duplicates or mismatch
          const nonUserOrCompletedAsgns = assignments.filter(a => !(a.userId === currentUser.id && a.status === 'pending'));
          
          urlRepos.forEach((repoLink, index) => {
            const groupName = urlGroups[index] || 'Skupina';
            const exists = nonUserOrCompletedAsgns.some(a => a.userId === currentUser.id && a.repoLink === repoLink);
            if (!exists) {
              let repoName = repoLink;
              try {
                const u = new URL(repoLink);
                const parts = u.pathname.split('/').filter(Boolean);
                if (parts.length >= 2) repoName = `${parts[0]}/${parts[1]}`;
              } catch {}
              
              nonUserOrCompletedAsgns.push({
                id: 'asgn_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
                userId: currentUser.id,
                userEmail: currentUser.email,
                userName: currentUser.name || currentUser.username || username,
                repoLink,
                repoName,
                groupId: 'grp_url_' + index,
                groupName: groupName,
                status: 'pending',
                score: null,
                level: null,
                pipelineId: null,
                answers: null,
                createdAt: new Date().toISOString().split('T')[0]
              });
            }
          });
          localStorage.setItem('cicdq_offline_assignments', JSON.stringify(nonUserOrCompletedAsgns));
        } else {
          // Fallback to default repositories only if no repos are in the URL and user has no assignments
          const existingAsgns = JSON.parse(localStorage.getItem('cicdq_offline_assignments')) || [];
          const userHasAsgns = existingAsgns.some(a => a.userId === currentUser.id);
          if (!userHasAsgns) {
            await api.adminCreateGroup({
              name: 'Splošna skupina',
              userIds: [currentUser.id],
              githubRepos: [
                'https://github.com/react/react',
                'https://github.com/vitejs/vite',
                'https://github.com/vuejs/core'
              ]
            });
          }
        }
        sessionStorage.removeItem('cicdq_pending_invite');
      } catch (err) {
        console.error('Failed to process pending invite:', err);
      }
    }

    if (role === 'user') {
      setCurrentView('user_assessments');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsLoggedIn(false);
    setUser(null);
    setUserRole('guest');
    setAppState('landing');
  };

  const renderCustomAlert = () => {
    if (!customAlert) return null;
    const isError = customAlert.message.toLowerCase().includes('napaka') || 
                    customAlert.message.toLowerCase().includes('error') || 
                    customAlert.message.toLowerCase().includes('neveljavn');
    return (
      <div 
        className="modal-overlay" 
        style={{ zIndex: 99999 }}
        onClick={() => setCustomAlert(null)}
      >
        <div 
          className="modal-card" 
          style={{ 
            maxWidth: '420px', 
            textAlign: 'center', 
            padding: '30px 24px',
            border: isError ? '1px solid rgba(239, 83, 80, 0.3)' : '1px solid rgba(88, 166, 255, 0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            background: 'var(--panel-bg)'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '16px',
            lineHeight: '1',
            color: isError ? 'var(--danger-color, #ef5350)' : 'var(--accent-color, #58a6ff)'
          }}>
            {isError ? '⚠️' : '✨'}
          </div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '12px',
            marginTop: '0'
          }}>
            {isError ? 'Napaka' : 'Obvestilo'}
          </h3>
          <div style={{
            fontSize: '0.92rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            marginBottom: '24px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {customAlert.message}
          </div>
          <button
            onClick={() => setCustomAlert(null)}
            className="btn btn-accent"
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            V redu
          </button>
        </div>
      </div>
    );
  };

  // Intercept ?view=results query parameter to render results in a new tab/window
  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.get('view') === 'results') {
    const id = queryParams.get('id');
    const dataStr = localStorage.getItem(id);
    if (dataStr) {
      try {
        const previewData = JSON.parse(dataStr);
        return (
          <>
            <div style={{ background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <ResultsPanel
                results={previewData.results}
                answers={previewData.answers}
                categories={previewData.categories}
                rules={previewData.rules}
                isReadOnly={previewData.isReadOnly}
                isLoggedIn={false}
                onClose={() => {
                  window.close();
                }}
              />
            </div>
            {renderCustomAlert()}
          </>
        );
      } catch (err) {
        console.error('Failed to parse results preview data:', err);
      }
    }
  }

  if (appState === 'landing') {
    return (
      <>
        <LandingPage
          enterAsGuest={enterAsGuest}
          enterAsAdmin={enterAsAdmin}
          initialShowLogin={initialShowLogin}
          prefillEmail={prefillEmail}
          setPasswordEmail={setPasswordEmail}
          clearSetPasswordEmail={() => setSetPasswordEmail('')}
        />
        {renderCustomAlert()}
      </>
    );
  }

  return (
    <>
      <div id="app">
        <Sidebar
          currentView={currentView}
          switchView={switchView}
          isLoggedIn={isLoggedIn}
          isOpen={isSidebarOpen}
          user={user}
          userRole={userRole}
          setAppState={handleLogout}
          viewType={viewType}
          setViewType={setViewType}
          assessmentMeta={assessmentMeta}
        />

        <div className="main-content">
          <Header
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
          />
          <div className="page-view active">
            {renderView()}
          </div>
        </div>
      </div>
      {renderCustomAlert()}
    </>
  );
}
