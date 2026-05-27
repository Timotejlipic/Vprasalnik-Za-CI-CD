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
import { api } from './api.js';

import clientQuestionnaireConfig from '../questionnaire_config.json';
import clientMaturityRules from '../maturity_rules.json';

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

function convertConfigSectionsToCategories(sections) {
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

export default function App() {
  const [appState, setAppState] = useState('landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('guest');
  const [currentView, setCurrentView] = useState('dashboard');
  const [apiOnline, setApiOnline] = useState(false);

  const [pipelines, setPipelines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);

  const [questionnaires, setQuestionnaires] = useState([]); 
  const [selectedVersion, setSelectedVersion] = useState(null); 

  const [rulesVersions, setRulesVersions] = useState([]); 
  const [selectedRulesVersion, setSelectedRulesVersion] = useState(null); 

  const [currentAssessment, setCurrentAssessment] = useState({});
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [currentAssessmentVersion, setCurrentAssessmentVersion] = useState(null);
  const [viewType, setViewType] = useState('collapsible'); 
  const [assessmentMeta, setAssessmentMeta] = useState(null); 

  const [createNewVersionMode, setCreateNewVersionMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [historicVersion, setHistoricVersion] = useState(null);


  useEffect(() => {
    async function initApp() {
      let savedUser = api.getCurrentUser();

      const params = new URLSearchParams(window.location.search);
      const inviteEmail = params.get('invite_email');
      const inviteUser = params.get('invite_user');
      if (inviteEmail || inviteUser) {
        try {
          const usersData = await api.adminGetUsers();
          let matchedUser = usersData.find(u => 
            (inviteEmail && u.email?.toLowerCase() === inviteEmail.toLowerCase()) ||
            (inviteUser && u.id === inviteUser)
          );
          
          const urlRepos = params.get('repos') ? params.get('repos').split(',') : [];
          const urlGroups = params.get('groups') ? params.get('groups').split(',') : [];

          if (!matchedUser && inviteEmail) {
            matchedUser = await api.adminCreateUser({
              email: inviteEmail.trim(),
              password: 'geslo123',
              role: 'user'
            });
          }

          if (matchedUser) {
            if (urlRepos.length > 0) {
              const assignments = JSON.parse(localStorage.getItem('cicdq_offline_assignments')) || [];
              
              const nonUserOrCompletedAsgns = assignments.filter(a => !(a.userId === matchedUser.id && a.status === 'pending'));
              
              urlRepos.forEach((repoLink, index) => {
                const groupName = urlGroups[index] || 'Skupina';
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
                    userName: matchedUser.name,
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

            localStorage.setItem('cicdq_token', 'mock_jwt_token_offline_' + matchedUser.id);
            localStorage.setItem('cicdq_user', JSON.stringify(matchedUser));
            savedUser = matchedUser;
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error('Auto-login via invite parameter failed:', err);
        }
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

      let online = false;
      try {
        online = await api.checkHealth();
      } catch {}
      setApiOnline(online);

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

    const handleStorage = (e) => {
      if (e.key === 'cicdq_offline_pipelines') {
        loadUserPipelines();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isLoggedIn, appState]);


  function loadCategoriesForVersion(version, versionList) {
    const list = versionList || questionnaires;
    const q = list.find(v => v.version === version);
    if (!q) return;
    const cats = convertConfigSectionsToCategories(q.sections || []);
    if (cats.some(c => c.items && c.items.length > 0)) {
      setCategories(cats);
    }
  }

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
    if (viewName !== 'assessment') {
      setAssessmentMeta(null);
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
  };

  const loadAssessment = (id) => {
    const p = pipelines.find(x => String(x.id) === String(id));
    if (p) {
      setCurrentAssessmentId(p.id);
      setCurrentAssessment({ ...p.answers });
      const v = p.version || selectedVersion;
      if (v) {
        setSelectedVersion(v);
        setCurrentAssessmentVersion(v);
        loadCategoriesForVersion(v);
      }
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
            isSidebarOpen={isSidebarOpen}
            assessmentMeta={assessmentMeta}
            isLocked={!!assessmentMeta}
          />
        );
      case 'admin_dashboard':
        return (
          <AdminDashboard
            pipelines={pipelines}
            switchView={switchView}
          />
        );
      case 'user_assessments':
        return (
          <UserAssessments
            user={user}
            isLoggedIn={isLoggedIn}
            switchView={switchView}
            startAssessmentForRepo={(repoLink, assignmentId) => {
              resetAssessment();
              setSelectedVersion('1.0');
              setCurrentAssessmentVersion('1.0');
              loadCategoriesForVersion('1.0');
              
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
          />
        );
    }
  };

  const enterAsGuest = () => {
    setUser('Gost');
    setUserRole('guest');
    setAppState('app');
  };

  const enterAsAdmin = (username) => {
    setUser(username);
    const currentUser = api.getCurrentUser();
    const role = currentUser?.role || 'user';
    setUserRole(role);
    setIsLoggedIn(true);
    setAppState('app');
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

  if (appState === 'landing') {
    return <LandingPage enterAsGuest={enterAsGuest} enterAsAdmin={enterAsAdmin} />;
  }

  return (
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
  );
}
