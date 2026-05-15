import React, { useState } from 'react';
import { questionnaireCategories, maturityRules, mockPipelines } from './data.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import LandingPage from './components/LandingPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import AssessmentWrapper from './components/AssessmentWrapper.jsx';
import Builder from './components/Builder.jsx';
import Rules from './components/Rules.jsx';

export default function App() {
  const [appState, setAppState] = useState('landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [pipelines, setPipelines] = useState([...mockPipelines]);
  const [categories, setCategories] = useState(JSON.parse(JSON.stringify(questionnaireCategories)));
  const [rules, setRules] = useState([...maturityRules]);

  const [currentAssessment, setCurrentAssessment] = useState({});
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);

  const switchView = (viewName) => {
    setCurrentView(viewName);
    // Pri prehodu na novo ocenjevanje se prepričamo, da obrazec ponastavimo (če ne gre za urejanje)
    if ((viewName.startsWith('assessment')) && !currentAssessmentId) {
      resetAssessment();
    }
  };

  const resetAssessment = () => {
    setCurrentAssessmentId(null);
    setCurrentAssessment({});
  };

  const loadAssessment = (id) => {
    const p = pipelines.find(x => x.id === id);
    if (p) {
      setCurrentAssessmentId(p.id);
      setCurrentAssessment({ ...p.answers });
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard pipelines={pipelines} setPipelines={setPipelines} switchView={switchView} loadAssessment={loadAssessment} resetAssessment={resetAssessment} />;
      case 'assessment':
        return <AssessmentWrapper isLoggedIn={isLoggedIn} pipelines={pipelines} setPipelines={setPipelines} currentAssessment={currentAssessment} setCurrentAssessment={setCurrentAssessment} currentAssessmentId={currentAssessmentId} categories={categories} rules={rules} switchView={switchView} />;
      case 'builder':
        return <Builder categories={categories} setCategories={setCategories} />;
      case 'rules':
        return <Rules rules={rules} setRules={setRules} />;
      default:
        return <Dashboard pipelines={pipelines} setPipelines={setPipelines} switchView={switchView} loadAssessment={loadAssessment} resetAssessment={resetAssessment} />;
    }
  };

  const enterAsGuest = () => {
    setAppState('app');
  };

  const enterAsAdmin = (username) => {
    setUser(username);
    setIsLoggedIn(true);
    setAppState('app');
  };

  if (appState === 'landing') {
    return <LandingPage enterAsGuest={enterAsGuest} enterAsAdmin={enterAsAdmin} />;
  }

  return (
    <div id="app">
      <Sidebar currentView={currentView} switchView={switchView} isLoggedIn={isLoggedIn} isOpen={isSidebarOpen} />

      <div className="main-content">
        <Header isLoggedIn={isLoggedIn} user={user} setIsLoggedIn={setIsLoggedIn} setUser={setUser} setAppState={setAppState} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

        <div className="page-view active">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
