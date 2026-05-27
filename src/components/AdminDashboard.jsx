import React, { useState, useEffect, useMemo } from 'react';
import { api, parseEmailToName } from '../api.js';
import ResultsPanel from './ResultsPanel.jsx';

function scoreColor(score) {
  return score < 40 ? '#f85149' : score < 75 ? '#d29922' : '#2ea043';
}

export default function AdminDashboard({ pipelines = [], switchView }) {
  const [activeTab, setActiveTab] = useState('stats');
  

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [localPipelines, setLocalPipelines] = useState([]);
  const [loading, setLoading] = useState(true);


  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('geslo123');
  const [newUserRole, setNewUserRole] = useState('user');
  const [createdUserInfo, setCreatedUserInfo] = useState(null);
  const [userError, setUserError] = useState('');

  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
  const [newGroupRepos, setNewGroupRepos] = useState('');
  const [groupError, setGroupError] = useState('');
  const [groupSuccess, setGroupSuccess] = useState('');


  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);


  useEffect(() => {
    if (pipelines) {
      setLocalPipelines(pipelines);
    }
  }, [pipelines]);


  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const u = await api.adminGetUsers();
      const g = await api.adminGetGroups();
      const a = await api.adminGetAssignments();
      const c = await api.getCategories();
      const r = await api.getRules();
      const p = await api.getPipelines();
      
      setUsers(u || []);
      setGroups(g || []);
      setAssignments(a || []);
      setCategories(c || []);
      setRules(r || []);
      setLocalPipelines(p || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboardData();

    const handleStorage = (e) => {
      if (
        e.key === 'cicdq_offline_assignments' || 
        e.key === 'cicdq_offline_pipelines' ||
        e.key === 'cicdq_offline_users' || 
        e.key === 'cicdq_offline_groups'
      ) {
        loadDashboardData();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const extractedName = useMemo(() => {
    return parseEmailToName(newUserEmail);
  }, [newUserEmail]);

  const handleCreateUser = async () => {
    setUserError('');
    setCreatedUserInfo(null);
    if (!newUserEmail.trim()) {
      setUserError('Prosimo, vnesite e-poštni naslov.');
      return;
    }
    if (!newUserEmail.includes('@') || !newUserEmail.includes('.')) {
      setUserError('Vnesite veljaven Gmail naslov.');
      return;
    }
    if (newUserPassword.length < 6) {
      setUserError('Geslo mora imeti vsaj 6 znakov.');
      return;
    }

    try {
      const created = await api.adminCreateUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole
      });
      
      setUsers(prev => [...prev, created]);
      
      const directLink = `${window.location.origin}${window.location.pathname}?invite_email=${encodeURIComponent(created.email)}`;
      const emailBody = `Pozdravljeni, ${created.name}!\n\nDodani ste bili v sistem MaturityVault za ocenjevanje CI/CD cevovodov.\n\nDo svojega profila in dodeljenih nalog lahko neposredno dostopate preko naslednje povezave:\n${directLink}\n\nUporabniško ime: ${created.username}\nGeslo za vaš račun je: ${newUserPassword}\n\nLep pozdrav,\nVaš Administrator`;
      
      setCreatedUserInfo({
        user: created,
        directLink,
        emailBody
      });
      
      setNewUserEmail('');
      setNewUserPassword('geslo123');
    } catch (err) {
      setUserError(err.message || 'Napaka pri ustvarjanju uporabnika.');
    }
  };

  const handleCreateGroup = async () => {
    setGroupError('');
    setGroupSuccess('');
    if (!newGroupName.trim()) {
      setGroupError('Prosimo, vnesite ime skupine.');
      return;
    }
    if (selectedGroupUsers.length === 0) {
      setGroupError('Izberite vsaj enega sodelujočega uporabnika.');
      return;
    }
    if (!newGroupRepos.trim()) {
      setGroupError('Vnesite vsaj en GitHub repozitorij.');
      return;
    }

    const repos = newGroupRepos
      .split('\n')
      .map(r => r.trim())
      .filter(r => r !== '' && r.includes('github.com'));

    if (repos.length === 0) {
      setGroupError('Vnesite veljavne GitHub povezave (npr. https://github.com/org/repo).');
      return;
    }

    try {
      await api.adminCreateGroup({
        name: newGroupName.trim(),
        userIds: selectedGroupUsers,
        githubRepos: repos
      });

      setGroupSuccess(`Skupina "${newGroupName}" je bila uspešno ustvarjena in naloge so bile dodeljene!`);
      setNewGroupName('');
      setSelectedGroupUsers([]);
      setNewGroupRepos('');
      
      await loadDashboardData();
    } catch (err) {
      setGroupError(err.message || 'Napaka pri ustvarjanju skupine.');
    }
  };

  const inspectAssignment = async (asgn) => {
    if (!asgn.answers) return;
    try {
      const results = await api.evaluate(asgn.answers, categories, rules);
      setEvaluationResults(results);
      setSelectedAssignment(asgn);
    } catch (err) {
      alert('Napaka pri izračunu zrelosti: ' + err.message);
    }
  };

  const normalizeRepoUrl = (url) => {
    if (!url) return '';
    let clean = url.trim().toLowerCase();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?github\.com\//, '');
    clean = clean.replace(/\.git$/, '');
    clean = clean.replace(/\/$/, '');
    return clean;
  };

  const normalizeName = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/š/g, 's')
      .replace(/ž/g, 'z')
      .replace(/č/g, 'c')
      .replace(/ć/g, 'c')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, ''); 
  };

  const userProgressStats = useMemo(() => {
    const standardUsers = users.filter(u => u.role === 'user');
    return standardUsers.map(u => {
      const userAsgns = assignments.filter(a => a.userId === u.id);
      
      const enrichedAsgns = userAsgns.map(asgn => {
        if (asgn.status === 'completed') return asgn;
        
        const matchedPipe = localPipelines.find(p => 
          normalizeRepoUrl(p.repoLink) === normalizeRepoUrl(asgn.repoLink) && 
          (normalizeName(p.assessor) === normalizeName(asgn.userName) || 
           normalizeName(p.assessor) === normalizeName(asgn.userEmail) || 
           normalizeName(p.assessor) === normalizeName(asgn.userEmail.split('@')[0]) ||
           p.userId === asgn.userId)
        );
        
        if (matchedPipe) {
          return {
            ...asgn,
            status: 'completed',
            score: matchedPipe.score,
            level: matchedPipe.level,
            pipelineId: matchedPipe.id,
            answers: matchedPipe.answers,
            completedAt: matchedPipe.date
          };
        }
        return asgn;
      });

      const total = enrichedAsgns.length;
      const completed = enrichedAsgns.filter(a => a.status === 'completed').length;
      const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        user: u,
        total,
        completed,
        pct,
        assignments: enrichedAsgns
      };
    }).sort((a, b) => b.pct - a.pct || a.user.name.localeCompare(b.user.name));
  }, [users, assignments, localPipelines]);

  const repoProgressStats = useMemo(() => {
    const reposMap = {};
    
    const enrichedAssignments = assignments.map(asgn => {
      if (asgn.status === 'completed') return asgn;
      
      const matchedPipe = localPipelines.find(p => 
        normalizeRepoUrl(p.repoLink) === normalizeRepoUrl(asgn.repoLink) && 
        (normalizeName(p.assessor) === normalizeName(asgn.userName) || 
         normalizeName(p.assessor) === normalizeName(asgn.userEmail) || 
         normalizeName(p.assessor) === normalizeName(asgn.userEmail.split('@')[0]) ||
         p.userId === asgn.userId)
      );
      
      if (matchedPipe) {
        return {
          ...asgn,
          status: 'completed',
          score: matchedPipe.score,
          level: matchedPipe.level,
          pipelineId: matchedPipe.id,
          answers: matchedPipe.answers,
          completedAt: matchedPipe.date
        };
      }
      return asgn;
    });

    enrichedAssignments.forEach(a => {
      if (!reposMap[a.repoLink]) {
        reposMap[a.repoLink] = {
          repoLink: a.repoLink,
          repoName: a.repoName,
          assignments: []
        };
      }
      reposMap[a.repoLink].assignments.push(a);
    });

    return Object.values(reposMap).map(repo => {
      const total = repo.assignments.length;
      const completed = repo.assignments.filter(a => a.status === 'completed').length;
      const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        ...repo,
        total,
        completed,
        pct
      };
    }).sort((a, b) => b.pct - a.pct || a.repoName.localeCompare(b.repoName));
  }, [assignments, localPipelines]);

  const toggleUserSelection = (userId) => {
    setSelectedGroupUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="pulse-animation" style={{ color: 'var(--text-secondary)' }}>
          Nalagam administratorske podatke…
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">Admin Nadzorna Plošča</h2>

      {/* Modern Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--panel-border)',
        marginBottom: '24px',
        overflowX: 'auto',
      }}>
        {[
          { id: 'stats', label: 'Spremljanje napredka', icon: '📈' },
          { id: 'users', label: 'Upravljanje uporabnikov', icon: '👥' },
          { id: 'groups', label: 'Skupine & Dodelitve', icon: '📋' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent-color)' : 'transparent'}`,
              color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
              padding: '12px 20px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.88rem',
              fontWeight: activeTab === tab.id ? 700 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Progress and Results Tracking */}
      {activeTab === 'stats' && (
        <div>
          {/* Progress Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', marginBottom: '30px' }}>
            
            {/* Overview by Users */}
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Pregled napredka po uporabnikih
              </h3>
              {userProgressStats.length === 0 ? (
                <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Ni registriranih uporabnikov z vlogo "user".
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                  {userProgressStats.map(stat => (
                    <div key={stat.user.id} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span>👤 {stat.user.name}</span>
                            {stat.total > 0 && (
                              <button 
                                className="btn btn-accent" 
                                style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                                onClick={() => {
                                  const userAssignments = stat.assignments;
                                  const repoLinks = userAssignments.map(a => a.repoLink).join(',');
                                  const groupNames = userAssignments.map(a => a.groupName || 'Skupina').join(',');
                                  const inviteLink = `${window.location.origin}${window.location.pathname}?invite_email=${encodeURIComponent(stat.user.email)}&repos=${encodeURIComponent(repoLinks)}&groups=${encodeURIComponent(groupNames)}`;
                                  navigator.clipboard?.writeText(inviteLink);
                                  alert(`Povezava za reševanje za uporabnika ${stat.user.name} je kopirana!`);
                                }}
                              >
                                ⎘ Kopiraj povezavo za ocenjevanje
                              </button>
                            )}
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {stat.user.email} · Uporabniško ime: <strong style={{ color: 'var(--accent-color)' }}>{stat.user.username}</strong>
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: 700, 
                            color: stat.pct === 100 ? 'var(--success-color)' : stat.pct > 0 ? 'var(--warning-color)' : 'var(--text-secondary)' 
                          }}>
                            {stat.completed} od {stat.total} ocenjeno ({stat.pct}%)
                          </span>
                        </div>
                      </div>

                      {/* User Progress Bar */}
                      <div style={{ height: '6px', background: 'var(--panel-border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
                        <div style={{ 
                          width: `${stat.pct}%`, 
                          height: '100%', 
                          background: stat.pct === 100 ? 'var(--success-color)' : stat.pct > 0 ? 'var(--warning-color)' : 'var(--text-secondary)',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>

                      {/* User Assignments Table */}
                      {stat.total === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Uporabnik nima dodeljenih repozitorijev.
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(0,0,0,0.08)', borderRadius: '8px', border: '1px solid var(--panel-border)', overflow: 'hidden' }}>
                          <table className="data-table" style={{ fontSize: '0.82rem' }}>
                            <thead>
                              <tr>
                                <th>Repozitorij</th>
                                <th>Skupina</th>
                                <th>Status</th>
                                <th>Zrelost</th>
                                <th style={{ textAlign: 'right' }}>Akcija</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stat.assignments.map(asgn => {
                                const done = asgn.status === 'completed';
                                return (
                                  <tr key={asgn.id}>
                                    <td>
                                      <a href={asgn.repoLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
                                        {asgn.repoName}
                                      </a>
                                    </td>
                                    <td>
                                      <span style={{ color: 'var(--text-secondary)' }}>{asgn.groupName || '—'}</span>
                                    </td>
                                    <td>
                                      <span className={`badge ${done ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '0.7rem' }}>
                                        {done ? 'Dokončano' : 'Čaka'}
                                      </span>
                                    </td>
                                    <td>
                                      {done ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>Lvl {asgn.level}</span>
                                          <strong style={{ color: scoreColor(asgn.score) }}>{asgn.score}%</strong>
                                        </div>
                                      ) : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      {done ? (
                                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '3px 8px' }} onClick={() => inspectAssignment(asgn)}>
                                          🔍 Poglej odgovore
                                        </button>
                                      ) : (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Čaka na oceno</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overview by Repositories */}
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Pregled napredka po repozitorijih
              </h3>
              {repoProgressStats.length === 0 ? (
                <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Ni dodeljenih repozitorijev.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                  {repoProgressStats.map(stat => (
                    <div key={stat.repoLink} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                            📂 {stat.repoName}
                          </h4>
                          <a href={stat.repoLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                            🔗 {stat.repoLink}
                          </a>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: 700, 
                            color: stat.pct === 100 ? 'var(--success-color)' : stat.pct > 0 ? 'var(--warning-color)' : 'var(--text-secondary)' 
                          }}>
                            {stat.completed} od {stat.total} ocenjevalcev ({stat.pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Repo Progress Bar */}
                      <div style={{ height: '6px', background: 'var(--panel-border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${stat.pct}%`, 
                          height: '100%', 
                          background: stat.pct === 100 ? 'var(--success-color)' : stat.pct > 0 ? 'var(--warning-color)' : 'var(--text-secondary)',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab 2: User Management with Gmail Auto Name Extraction */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* User list */}
          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Registrirani uporabniki ({users.length})
            </h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Uporabnik (Ime & Priimek)</th>
                    <th>Gmail naslov</th>
                    <th>Vloga</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>ID: {u.id}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>{u.email}</span>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-ghost'}`} style={{ fontSize: '0.72rem' }}>
                          {u.role === 'admin' ? 'Administrator' : 'Uporabnik'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create User Form */}
          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Ustvari novega uporabnika
            </h3>
            <div className="card" style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label">Gmail naslov uporabnika *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="aljaz.utrosa@student.um.si"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                />
                {newUserEmail && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', padding: '6px 10px', background: 'rgba(88,166,255,0.06)', border: '1px dashed rgba(88,166,255,0.2)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                    ✨ Auto-extracted Name & Username:<br />
                    <strong>{extractedName || 'Neznano'}</strong>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Geslo za dostop *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="Min. 6 znakov"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vloga v sistemu</label>
                <select className="form-control" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                  <option value="user">Navaden uporabnik (ocenjevalec)</option>
                  <option value="admin">Sistemski Administrator</option>
                </select>
              </div>

              {userError && (
                <div style={{ 
                  color: 'var(--danger-color)', 
                  fontSize: '0.82rem', 
                  background: 'var(--danger-bg)', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  marginBottom: '14px' 
                }}>
                  {userError}
                </div>
              )}

              <button className="btn btn-accent" style={{ width: '100%', padding: '10px' }} onClick={handleCreateUser}>
                ➕ Ustvari račun uporabnika
              </button>
            </div>

            {/* Simulated Invitation Log */}
            {createdUserInfo && (
              <div style={{ 
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(46,160,67,0.08)',
                border: '1px solid rgba(46,160,67,0.25)',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#2ea043', fontWeight: 700, marginBottom: '6px' }}>
                  ✓ Uporabnik je bil uspešno ustvarjen!
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.4' }}>
                  Ker nimamo pravega e-poštnega strežnika, smo e-pošto s povabilom **simulirali**.
                  Kopirajte spodnje sporočilo ali uporabite direktni link za vstop:
                </p>

                <div style={{ 
                  background: 'var(--bg-color)', 
                  border: '1px solid var(--panel-border)', 
                  borderRadius: '6px', 
                  padding: '8px 10px', 
                  fontFamily: 'monospace', 
                  fontSize: '0.72rem', 
                  wordBreak: 'break-all', 
                  color: 'var(--accent-color)', 
                  marginBottom: '10px' 
                }}>
                  {createdUserInfo.directLink}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-accent" style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }} onClick={() => {
                    navigator.clipboard?.writeText(createdUserInfo.directLink);
                    alert('Direktna prijava kopirana!');
                  }}>
                    ⎘ Kopiraj prijavni link
                  </button>
                  
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }} onClick={() => {
                    navigator.clipboard?.writeText(createdUserInfo.emailBody);
                    alert('Sporočilo povabila kopirano!');
                  }}>
                    ✉ Kopiraj e-sporočilo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Group Management and Assignment Creation */}
      {activeTab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* List of existing groups */}
          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Obstoječe ocenjevalne skupine ({groups.length})
            </h3>
            {groups.length === 0 ? (
              <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nobena skupina še ni bila ustvarjena.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {groups.map(group => {
                  const groupAsgns = assignments.filter(a => a.groupId === group.id);
                  return (
                    <div key={group.id} className="card" style={{ padding: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        👥 {group.name}
                      </h4>
                      
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Ustvarjeno: <strong>{group.createdAt}</strong>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
                        {/* Users */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '10px', borderRadius: '6px' }}>
                          <strong style={{ color: 'var(--accent-color)' }}>Člani skupine:</strong>
                          <ul style={{ paddingLeft: '16px', marginTop: '6px', marginBottom: 0 }}>
                            {group.userIds.map(uid => (
                              <li key={uid}>{users.find(u => u.id === uid)?.name || uid}</li>
                            ))}
                          </ul>
                        </div>
                        {/* Repos */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '10px', borderRadius: '6px' }}>
                          <strong style={{ color: 'var(--accent-color)' }}>Dodeljeni repozitoriji:</strong>
                          <ul style={{ paddingLeft: '16px', marginTop: '6px', marginBottom: 0, wordBreak: 'break-all' }}>
                            {group.githubRepos.map((repo, i) => (
                              <li key={i}>
                                <a href={repo} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)' }}>
                                  {repo.replace('https://github.com/', '')}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Add new member form */}
                      {users.filter(u => u.role === 'user' && !group.userIds.includes(u.id)).length > 0 && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Dodaj novega člana:</span>
                          <select 
                            id={`add-member-${group.id}`}
                            className="form-control" 
                            style={{ fontSize: '0.78rem', padding: '4px 8px', width: 'auto', flex: 1, height: '30px', margin: 0 }}
                          >
                            <option value="">-- Izberi uporabnika --</option>
                            {users
                              .filter(u => u.role === 'user' && !group.userIds.includes(u.id))
                              .map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))
                            }
                          </select>
                          <button 
                            className="btn btn-accent" 
                            style={{ fontSize: '0.75rem', padding: '4px 10px', height: '30px' }}
                            onClick={async () => {
                              const el = document.getElementById(`add-member-${group.id}`);
                              const uid = el?.value;
                              if (!uid) return;
                              try {
                                await api.adminAddGroupMember(group.id, uid);
                                alert('Uporabnik uspešno dodan v skupino in naloge dodeljene!');
                                await loadDashboardData();
                              } catch (err) {
                                alert('Napaka: ' + err.message);
                              }
                            }}
                          >
                            ➕ Dodaj
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Group Form */}
          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Ustvari novo skupino & dodeli repozitorije
            </h3>
            <div className="card" style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label">Ime skupine *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="npr. DevOps Skupina A"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
              </div>

              {/* Members selection list */}
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '8px' }}>Izberite člane skupine *</label>
                <div style={{ 
                  maxHeight: '140px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--panel-border)', 
                  borderRadius: '6px', 
                  padding: '8px', 
                  background: 'rgba(0,0,0,0.15)' 
                }}>
                  {users.filter(u => u.role === 'user').length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '10px', textAlign: 'center' }}>
                      Ni na voljo navadnih uporabnikov. Ustvarite jih v zavihku "Uporabniki".
                    </div>
                  ) : (
                    users.filter(u => u.role === 'user').map(u => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedGroupUsers.includes(u.id)}
                          onChange={() => toggleUserSelection(u.id)}
                        />
                        <span>{u.name} ({u.email})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* GitHub repos list */}
              <div className="form-group">
                <label className="form-label">GitHub repozitoriji za reševanje * <span style={{ textTransform: 'none', fontWeight: 400 }}>(vsak v svojo vrstico)</span></label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="https://github.com/react/react&#10;https://github.com/vitejs/vite"
                  value={newGroupRepos}
                  onChange={e => setNewGroupRepos(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.4' }}
                />
              </div>

              {groupError && (
                <div style={{ 
                  color: 'var(--danger-color)', 
                  fontSize: '0.82rem', 
                  background: 'var(--danger-bg)', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  marginBottom: '14px' 
                }}>
                  {groupError}
                </div>
              )}

              {groupSuccess && (
                <div style={{ 
                  color: '#2ea043', 
                  fontSize: '0.82rem', 
                  background: 'rgba(46,160,67,0.06)', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  marginBottom: '14px',
                  border: '1px solid rgba(46,160,67,0.2)'
                }}>
                  {groupSuccess}
                </div>
              )}

              <button className="btn btn-accent" style={{ width: '100%', padding: '10px' }} onClick={handleCreateGroup}>
                🚀 Ustvari skupino & dodeli ocenjevanja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Detail Modal Overlay */}
      {selectedAssignment && evaluationResults && (
        <ResultsPanel
          results={evaluationResults}
          answers={selectedAssignment.answers || {}}
          categories={categories}
          rules={rules}
          isReadOnly={true}
          onClose={() => { setSelectedAssignment(null); setEvaluationResults(null); }}
        />
      )}
    </div>
  );
}
