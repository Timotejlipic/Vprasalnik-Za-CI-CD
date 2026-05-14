import React, { useState } from 'react';
import { questionnaireCategories, maturityRules, mockPipelines } from './data.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import LoginOverlay from './components/LoginOverlay.jsx';
import Dashboard from './components/Dashboard.jsx';
import Assessment1 from './components/Assessment1.jsx';
import Assessment2 from './components/Assessment2.jsx';
import Assessment3 from './components/Assessment3.jsx';
import Assessment4 from './components/Assessment4.jsx';
import Builder from './components/Builder.jsx';
import Rules from './components/Rules.jsx';

export default function App() {
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
        return <Assessment1 isLoggedIn={isLoggedIn} pipelines={pipelines} setPipelines={setPipelines} currentAssessment={currentAssessment} setCurrentAssessment={setCurrentAssessment} currentAssessmentId={currentAssessmentId} categories={categories} rules={rules} switchView={switchView} />;
      case 'assessment2':
        return <Assessment2 isLoggedIn={isLoggedIn} pipelines={pipelines} setPipelines={setPipelines} currentAssessment={currentAssessment} setCurrentAssessment={setCurrentAssessment} currentAssessmentId={currentAssessmentId} categories={categories} rules={rules} switchView={switchView} />;
      case 'assessment3':
        return <Assessment3 isLoggedIn={isLoggedIn} pipelines={pipelines} setPipelines={setPipelines} currentAssessment={currentAssessment} setCurrentAssessment={setCurrentAssessment} currentAssessmentId={currentAssessmentId} categories={categories} rules={rules} switchView={switchView} />;
      case 'assessment4':
        return <Assessment4 isLoggedIn={isLoggedIn} pipelines={pipelines} setPipelines={setPipelines} currentAssessment={currentAssessment} setCurrentAssessment={setCurrentAssessment} currentAssessmentId={currentAssessmentId} categories={categories} rules={rules} switchView={switchView} />;
      case 'builder':
        return <Builder categories={categories} setCategories={setCategories} />;
      case 'rules':
        return <Rules rules={rules} setRules={setRules} />;
      default:
        return <Dashboard pipelines={pipelines} setPipelines={setPipelines} switchView={switchView} loadAssessment={loadAssessment} resetAssessment={resetAssessment} />;
    }
  };

  return (
    <>
      <LoginOverlay isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} setUser={setUser} />

      <Sidebar currentView={currentView} switchView={switchView} />

      <div className="main-content">
        <Header isLoggedIn={isLoggedIn} user={user} setIsLoggedIn={setIsLoggedIn} setUser={setUser} />

        <div className="page-view active">
          {renderView()}
        </div>
      </div>
    </>
  );
}
