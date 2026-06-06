import React, { useState, useEffect, useMemo } from 'react';
import { api, parseEmailToName } from '../api.js';
import { convertConfigSectionsToCategories, openResultsInNewWindow, copyToClipboard } from '../utils.js';

// Helper to determine score colors
function scoreColor(score) {
  return score < 40 ? '#f85149' : score < 75 ? '#d29922' : '#2ea043';
}

// Helper to synchronize local assignments with database-backed pipelines
function syncAssignmentsWithPipelines(assignments, pipelines, users) {
  let changed = false;
  pipelines.forEach(p => {
    const parts = (p.repoId || '').split('|');
    const assessor = parts[0] || '';
    const score = parts[1] ? Number(parts[1]) : 0;

    const userObj = users.find(u => 
      String(u.id) === String(p.user_id) || 
      u.email?.toLowerCase() === assessor.toLowerCase() ||
      u.username?.toLowerCase() === assessor.toLowerCase() ||
      u.name?.toLowerCase() === assessor.toLowerCase() ||
      (assessor && u.email && parseEmailToName(u.email).toLowerCase() === assessor.toLowerCase())
    );

    assignments.forEach(asg => {
      const isUserMatch = (userObj && (String(asg.userId) === String(userObj.id) || asg.userEmail?.toLowerCase() === userObj.email?.toLowerCase())) ||
                          (asg.userEmail?.toLowerCase() === assessor.toLowerCase()) ||
                          (assessor && asg.userEmail && parseEmailToName(asg.userEmail).toLowerCase() === assessor.toLowerCase());
      
      const normalize = (u) => (u || '').trim().toLowerCase()
        .replace(/^(https?:\/\/)?(www\.)?github\.com\//, '')
        .replace(/\.git$/, '')
        .replace(/\/$/, '');

      const isRepoMatch = normalize(asg.repoLink) === normalize(p.repoLink);

      if (isUserMatch && isRepoMatch) {
        const hasDifferences = asg.status !== 'completed' ||
                               String(asg.pipelineId) !== String(p.id) ||
                               asg.score !== score ||
                               asg.level !== p.level ||
                               JSON.stringify(asg.answers) !== JSON.stringify(p.answers);
        if (hasDifferences) {
          asg.status = 'completed';
          asg.score = score;
          asg.level = p.level || 1;
          asg.pipelineId = p.id;
          asg.answers = p.answers || null;
          asg.completedAt = p.date || new Date().toISOString().split('T')[0];
          changed = true;
        }
      }
    });
  });
  return changed;
}

export default function AdminDashboard({ pipelines = [], switchView, questionnaires = [], rulesVersions = [], onPreviewAnswers }) {
  const [activeTab, setActiveTab] = useState('stats');
  
  // Data lists
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [localPipelines, setLocalPipelines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newUserEmail, setNewUserEmail] = useState('');

  const [newUserRole, setNewUserRole] = useState('user');
  const [createdUserInfo, setCreatedUserInfo] = useState(null);
  const [userError, setUserError] = useState('');

  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
  const [newGroupRepos, setNewGroupRepos] = useState('');
  const [groupError, setGroupError] = useState('');
  const [groupSuccess, setGroupSuccess] = useState('');

  // Selected versions for group creation
  const [selectedGroupFormVer, setSelectedGroupFormVer] = useState('1.0');
  const [selectedGroupRulesVer, setSelectedGroupRulesVer] = useState('1.0');

  // Adding repository to existing group state
  const [addingRepoToGroup, setAddingRepoToGroup] = useState(null);
  const [newRepoLink, setNewRepoLink] = useState('');
  const [selectedRepoFormVer, setSelectedRepoFormVer] = useState('1.0');
  const [selectedRepoRulesVer, setSelectedRepoRulesVer] = useState('1.0');

  // Initialize version defaults to latest
  useEffect(() => {
    if (questionnaires && questionnaires.length > 0) {
      const latest = questionnaires[questionnaires.length - 1].version;
      setSelectedGroupFormVer(latest);
      setSelectedRepoFormVer(latest);
    }
  }, [questionnaires]);

  useEffect(() => {
    if (rulesVersions && rulesVersions.length > 0) {
      const latest = rulesVersions[rulesVersions.length - 1].version;
      setSelectedGroupRulesVer(latest);
      setSelectedRepoRulesVer(latest);
    }
  }, [rulesVersions]);

  // Results detail modal
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);

  // Progress-tracking filters (Tab 1)
  const [statsUserFilter, setStatsUserFilter] = useState('');
  const [statsRepoFilter, setStatsRepoFilter] = useState('');
  const [statsDateFilter, setStatsDateFilter] = useState('');

  // Sync prop changes
  useEffect(() => {
    if (pipelines) {
      setLocalPipelines(pipelines);
    }
  }, [pipelines]);

  // Load all dashboard data
  const loadDashboardData = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    try {
      const u = await api.adminGetUsers();
      const g = await api.adminGetGroups();
      const a = await api.adminGetAssignments();
      const c = await api.getCategories();
      const r = await api.getRules();
      const p = await api.getPipelines();
      
      setUsers(u || []);
      setGroups(g || []);
      setCategories(c || []);
      setRules(r || []);
      setLocalPipelines(p || []);

      // Auto-sync/heal missing assignments for groups on load
      const currentGroups = g || [];
      const currentUsers = u || [];
      const currentAssignments = a || [];
      let updatedAssignments = [...currentAssignments];
      let changed = false;

      currentGroups.forEach(group => {
        group.userIds.forEach(userId => {
          const userObj = currentUsers.find(x => String(x.id) === String(userId) || x.email?.toLowerCase() === userId.toLowerCase());
          if (!userObj) return;

          group.githubRepos.forEach(repoLink => {
            const exists = updatedAssignments.some(asg => 
              (String(asg.userId) === String(userObj.id) || asg.userEmail?.toLowerCase() === userObj.email?.toLowerCase()) &&
              asg.repoLink.toLowerCase() === repoLink.toLowerCase()
            );

            if (!exists) {
              let repoName = repoLink;
              try {
                const urlObj = new URL(repoLink);
                const parts = urlObj.pathname.split('/').filter(Boolean);
                if (parts.length >= 2) repoName = `${parts[0]}/${parts[1]}`;
                else if (parts.length === 1) repoName = parts[0];
              } catch {
                repoName = repoLink.replace('https://github.com/', '');
              }

              updatedAssignments.push({
                id: 'asgn_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
                userId: userObj.id,
                userEmail: userObj.email,
                userName: userObj.name,
                repoLink,
                repoName,
                groupId: group.id,
                groupName: group.name,
                status: 'pending',
                score: null,
                level: null,
                pipelineId: null,
                answers: null,
                createdAt: new Date().toISOString().split('T')[0]
              });
              changed = true;
            }
          });
        });
      });

      const syncChanged = syncAssignmentsWithPipelines(updatedAssignments, p || [], u || []);
      if (syncChanged) {
        changed = true;
      }

      if (changed) {
        localStorage.setItem('cicdq_offline_assignments', JSON.stringify(updatedAssignments));
        setAssignments(updatedAssignments);
      } else {
        setAssignments(currentAssignments);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
    if (!isBackground) {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(false);

    // Dynamically sync dashboard data across tabs
    const handleStorage = (e) => {
      if (
        e.key === 'cicdq_offline_assignments' || 
        e.key === 'cicdq_offline_pipelines' ||
        e.key === 'cicdq_offline_users' || 
        e.key === 'cicdq_offline_groups'
      ) {
        loadDashboardData(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // ── Auto Name Extraction from Email ──
  const extractedName = useMemo(() => {
    return parseEmailToName(newUserEmail);
  }, [newUserEmail]);

  // Handle user creation
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
    // Generate a random temporary password (user will set their own)
    const tempPassword = 'tmp_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

    try {
      const created = await api.adminCreateUser({
        email: newUserEmail.trim(),
        password: tempPassword,
        role: newUserRole
      });
      
      // Update users list
      setUsers(prev => [...prev, created]);
      
      // Create invitation link
      const directLink = `${window.location.origin}${window.location.pathname}?invite_email=${encodeURIComponent(created.email)}`;
      const setPasswordLink = `${window.location.origin}${window.location.pathname}?set_password=${encodeURIComponent(created.email)}`;
      const emailBody = `Pozdravljeni, ${created.name}!\n\nDodani ste bili v sistem MaturityVault za ocenjevanje CI/CD cevovodov.\n\nDo svojega profila in dodeljenih nalog lahko neposredno dostopate preko naslednje povezave:\n${directLink}\n\nUporabniško ime: ${created.username}\n\nCe zelite nastaviti lastno geslo za prijavo, kliknite na naslednjo povezavo:\n${setPasswordLink}\n\nLep pozdrav,\nVas Administrator`;
      
      setCreatedUserInfo({
        user: created,
        directLink,
        setPasswordLink,
        emailBody
      });
      
      // Reset input fields
      setNewUserEmail('');
    } catch (err) {
      setUserError(err.message || 'Napaka pri ustvarjanju uporabnika.');
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Ali ste prepričani, da želite izbrisati uporabnika "${userName}"? S tem ga boste odstranili iz vseh skupin in izbrisali njegove naloge.`)) {
      try {
        await api.adminDeleteUser(userId);
        // Refresh data silently in background to update groups & assignments
        await loadDashboardData(true);
      } catch (err) {
        alert(err.message || 'Napaka pri brisanju uporabnika.');
      }
    }
  };

  // Export all users (with usernames & passwords) to an Excel-compatible file
  const handleExportUsersExcel = () => {
    if (!users || users.length === 0) {
      alert('Ni uporabnikov za izvoz.');
      return;
    }
    const esc = (v) => String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const rows = users.map(u => `
      <tr>
        <td>${esc(u.name)}</td>
        <td>${esc(u.username)}</td>
        <td>${esc(u.email)}</td>
        <td>${u.role === 'admin' ? 'Administrator' : u.role === 'member' ? 'Registriran uporabnik' : 'Uporabnik'}</td>
      </tr>`).join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Ime in priimek</th>
              <th>Uporabniško ime</th>
              <th>Gmail naslov</th>
              <th>Vloga</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;

    const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uporabniki_izvoz_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle group creation
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

    // Parse repository links
    const repos = newGroupRepos
      .split('\n')
      .map(r => r.trim())
      .filter(r => r !== '' && r.includes('github.com'));

    if (repos.length === 0) {
      setGroupError('Vnesite veljavne GitHub povezave (npr. https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD).');
      return;
    }

    try {
      await api.adminCreateGroup({
        name: newGroupName.trim(),
        userIds: selectedGroupUsers,
        githubRepos: repos,
        formVersion: selectedGroupFormVer,
        rulesVersion: selectedGroupRulesVer
      });

      setGroupSuccess(`Skupina "${newGroupName}" je bila uspešno ustvarjena in naloge so bile dodeljene!`);
      setNewGroupName('');
      setSelectedGroupUsers([]);
      setNewGroupRepos('');
      
      // Reload everything to update progress meters
      await loadDashboardData(true);
    } catch (err) {
      setGroupError(err.message || 'Napaka pri ustvarjanju skupine.');
    }
  };

  // Add repository to existing group with configured versions
  const handleSaveRepoToGroup = async () => {
    if (!newRepoLink || !newRepoLink.trim()) {
      alert('Prosimo, vnesite povezavo do GitHub repozitorija.');
      return;
    }
    if (!newRepoLink.trim().includes('github.com')) {
      alert('Prosimo, vnesite veljaven GitHub link (npr. https://github.com/owner/repo).');
      return;
    }
    try {
      await api.adminAddGroupRepo(
        addingRepoToGroup.id,
        newRepoLink.trim(),
        selectedRepoFormVer,
        selectedRepoRulesVer
      );
      alert('Repozitorij uspešno dodan skupini in naloge dodeljene članom!');
      setAddingRepoToGroup(null);
      await loadDashboardData(true);
    } catch (err) {
      alert('Napaka pri dodajanju repozitorija: ' + err.message);
    }
  };

  // Inspect questionnaire answers of a completed assignment
  const inspectAssignment = async (asgn) => {
    if (!asgn.answers) return;
    try {
      const formVer = asgn.formVersion || '1.0';
      const rVer = asgn.rulesVersion || '1.0';

      let activeCats = categories;
      let activeRules = rules;

      if (questionnaires && questionnaires.length > 0) {
        const matchedQ = questionnaires.find(v => v.version === formVer);
        if (matchedQ) {
          activeCats = convertConfigSectionsToCategories(matchedQ.sections || []);
        }
      }

      if (rulesVersions && rulesVersions.length > 0) {
        const matchedR = rulesVersions.find(v => v.version === rVer);
        if (matchedR) {
          activeRules = matchedR.levels || matchedR;
        }
      }

      const results = await api.evaluate(asgn.answers, activeCats, activeRules);

      if (onPreviewAnswers) {
        onPreviewAnswers({
          answers: asgn.answers,
          version: formVer,
          rulesVersion: rVer,
          name: `Poročilo za uporabnika: ${asgn.userName || asgn.userEmail || ''}`
        });
      } else {
        openResultsInNewWindow({
          answers: asgn.answers,
          results: results,
          categories: activeCats,
          rules: activeRules,
          isReadOnly: true,
          title: `Poročilo za uporabnika: ${asgn.userName || asgn.userEmail || ''}`
        });
      }
    } catch (err) {
      alert('Napaka pri izračunu zrelosti: ' + err.message);
    }
  };

  // Helper to normalize repository URLs for robust matching
  const normalizeRepoUrl = (url) => {
    if (!url) return '';
    let clean = url.trim().toLowerCase();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?github\.com\//, '');
    clean = clean.replace(/\.git$/, '');
    clean = clean.replace(/\/$/, '');
    return clean;
  };

  // Helper to normalize names/emails for accent, casing, space, and dot insensitivity
  const normalizeName = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // removes accents/diacritics
      .replace(/š/g, 's')
      .replace(/ž/g, 'z')
      .replace(/č/g, 'c')
      .replace(/ć/g, 'c')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, ''); // removes spaces, dots, hyphens
  };

  // ── Calculate Progress Metrics for Users ──
  const userProgressStats = useMemo(() => {
    const standardUsers = users.filter(u => u.role === 'user');
    return standardUsers.map(u => {
      const userAsgns = assignments.filter(a => 
        String(a.userId) === String(u.id) || 
        (a.userEmail && u.email && a.userEmail.toLowerCase() === u.email.toLowerCase())
      );
      
      // Enrich assignments with global pipelines data dynamically
      const enrichedAsgns = userAsgns.map(asgn => {
        if (asgn.status === 'completed') return asgn;
        
        // Match by repoLink and assessor name/email/ID (case-insensitive & accent/special char robust)
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

  // ── Calculate Progress Metrics for Repositories ──
  const repoProgressStats = useMemo(() => {
    const reposMap = {};
    
    // Enrich globally
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

  // Apply progress-tracking filters
  const statsFiltersActive = statsUserFilter || statsRepoFilter || statsDateFilter;

  const filteredUserStats = userProgressStats
    .map(stat => {
      const asgns = stat.assignments.filter(a => {
        const repoMatch = !statsRepoFilter || `${a.repoLink || ''} ${a.repoName || ''}`.toLowerCase().includes(statsRepoFilter.toLowerCase());
        const dateMatch = !statsDateFilter || `${a.completedAt || ''} ${a.createdAt || ''}`.includes(statsDateFilter);
        return repoMatch && dateMatch;
      });
      return { ...stat, visibleAssignments: asgns };
    })
    .filter(stat => {
      const nameMatch = !statsUserFilter || `${stat.user.name || ''} ${stat.user.email || ''} ${stat.user.username || ''}`.toLowerCase().includes(statsUserFilter.toLowerCase());
      const hasMatchingAsgns = (!statsRepoFilter && !statsDateFilter) || stat.visibleAssignments.length > 0;
      return nameMatch && hasMatchingAsgns;
    });

  const filteredRepoStats = repoProgressStats.filter(repo => {
    const repoMatch = !statsRepoFilter || `${repo.repoLink || ''} ${repo.repoName || ''}`.toLowerCase().includes(statsRepoFilter.toLowerCase());
    const dateMatch = !statsDateFilter || repo.assignments.some(a => `${a.completedAt || ''} ${a.createdAt || ''}`.includes(statsDateFilter));
    const userMatch = !statsUserFilter || repo.assignments.some(a => `${a.userName || ''} ${a.userEmail || ''}`.toLowerCase().includes(statsUserFilter.toLowerCase()));
    return repoMatch && dateMatch && userMatch;
  });

  const toggleUserSelection = (userId) => {
    setSelectedGroupUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="pulse-animation" style={{ color: 'var(--text-secondary)' }}>
          Nalaganje...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Admin Nadzorna Plošča</h2>
        <button
          onClick={() => loadDashboardData(true)}
          title="Osveži podatke"
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '8px',
            color: 'var(--accent-color)',
            cursor: 'pointer',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
        >
          Osveži
        </button>
      </div>

      {/* Modern Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--panel-border)',
        marginBottom: '24px',
        overflowX: 'auto',
      }}>
        {[
          { id: 'stats', label: 'Spremljanje napredka'},
          { id: 'users', label: 'Upravljanje uporabnikov'},
          { id: 'groups', label: 'Skupine & Dodelitve'}
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
          {/* Filter bar */}
          <div className="card" style={{ marginBottom: '24px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label className="form-label" style={{ fontSize: '0.72rem' }}>Ime uporabnika</label>
              <input
                type="text"
                className="form-control"
                value={statsUserFilter}
                onChange={e => setStatsUserFilter(e.target.value)}
                placeholder="Filtriraj po imenu…"
                style={{ fontSize: '0.82rem' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label className="form-label" style={{ fontSize: '0.72rem' }}>Repozitorij (link / ime)</label>
              <input
                type="text"
                className="form-control"
                value={statsRepoFilter}
                onChange={e => setStatsRepoFilter(e.target.value)}
                placeholder="github.com/owner/repo…"
                style={{ fontSize: '0.82rem' }}
              />
            </div>
            <div style={{ width: '170px' }}>
              <label className="form-label" style={{ fontSize: '0.72rem' }}>Datum</label>
              <input
                type="date"
                className="form-control"
                value={statsDateFilter}
                onChange={e => setStatsDateFilter(e.target.value)}
                style={{ fontSize: '0.82rem' }}
              />
            </div>
            {statsFiltersActive && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                onClick={() => { setStatsUserFilter(''); setStatsRepoFilter(''); setStatsDateFilter(''); }}
              >
                X Počisti filtre
              </button>
            )}
          </div>

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
              ) : filteredUserStats.length === 0 ? (
                <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                   Noben uporabnik ne ustreza filtrom.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                  {filteredUserStats.map(stat => (
                    <div key={stat.user.id} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span> {stat.user.name}</span>
                            {stat.total > 0 && (
                              <button 
                                className="btn btn-accent" 
                                style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                                onClick={async () => {
                                  const userAssignments = stat.assignments;
                                  const repoLinks = userAssignments.map(a => a.repoLink).join(',');
                                  const groupNames = userAssignments.map(a => a.groupName || 'Skupina').join(',');
                                  const inviteLink = `${window.location.origin}${window.location.pathname}?invite_email=${encodeURIComponent(stat.user.email)}&repos=${encodeURIComponent(repoLinks)}&groups=${encodeURIComponent(groupNames)}`;
                                  const ok = await copyToClipboard(inviteLink);
                                  alert(ok
                                    ? `Povezava za reševanje za uporabnika ${stat.user.name} je kopirana!`
                                    : `Kopiranje ni uspelo. Povezava:\n${inviteLink}`);
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
                              {stat.visibleAssignments.map(asgn => {
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
                                           Poglej odgovore
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



          </div>
        </div>
      )}

      {/* Tab 2: User Management with Gmail Auto Name Extraction */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* User list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: 0 }}>
                Registrirani uporabniki ({users.length})
              </h3>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                onClick={handleExportUsersExcel}
                title="Izvozi vse uporabnike z uporabniškimi imeni in gesli v Excel datoteko"
              >
                ⇩ Izvozi v Excel (imena & gesla)
              </button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Uporabnik (Ime & Priimek)</th>
                    <th>Gmail naslov</th>
                    <th>Vloga</th>
                    <th style={{ textAlign: 'right' }}>Akcije</th>
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
                        <span className={`badge ${u.role === 'admin' ? 'badge-blue' : u.role === 'member' ? 'badge-blue' : 'badge-ghost'}`} style={{ fontSize: '0.72rem' }}>
                          {u.role === 'admin' ? 'Administrator' : u.role === 'member' ? 'Registriran uporabnik' : 'Uporabnik'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger-color)', padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                          title="Izbriši uporabnika"
                        >
                          Briši
                        </button>
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
                     Auto-extracted Name & Username:<br />
                    <strong>{extractedName || 'Neznano'}</strong>
                  </div>
                )}
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
                + Ustvari račun uporabnika
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
                  <button className="btn btn-accent" style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }} onClick={async () => {
                    const ok = await copyToClipboard(createdUserInfo.directLink);
                    alert(ok ? 'Direktna prijava kopirana!' : `Kopiranje ni uspelo. Povezava:\n${createdUserInfo.directLink}`);
                  }}>
                    ⎘ Kopiraj prijavni link
                  </button>

                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }} onClick={async () => {
                    const ok = await copyToClipboard(createdUserInfo.emailBody);
                    alert(ok ? 'Sporočilo povabila kopirano!' : 'Kopiranje ni uspelo.');
                  }}>
                     Kopiraj e-sporočilo
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                           {group.name}
                        </h4>
                        <button
                          className="btn btn-ghost"
                          style={{ color: 'var(--danger-color)', padding: '4px 10px', fontSize: '0.78rem', minWidth: 'auto', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
                          title="Izbriši skupino in vse njene dodelitve"
                          onClick={async () => {
                            if (window.confirm(`Ali ste prepričani, da želite izbrisati skupino ${group.name}? (S tem boste izbrisali tudi vse dodelitve te skupine)`)) {
                              try {
                                await api.adminDeleteGroup(group.id);
                                await loadDashboardData(true);
                              } catch (err) {
                                alert('Napaka: ' + err.message);
                              }
                            }
                          }}
                        >
                          Izbriši skupino
                        </button>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Ustvarjeno: <strong>{group.createdAt}</strong>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
                        {/* Users */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '10px', borderRadius: '6px' }}>
                          <strong style={{ color: 'var(--accent-color)' }}>Člani skupine:</strong>
                          <ul style={{ padding: 0, listStyle: 'none', marginTop: '6px', marginBottom: 0 }}>
                            {group.userIds.map(uid => {
                              const uObj = users.find(u => 
                                String(u.id) === String(uid) || 
                                (u.email && u.email.toLowerCase() === uid.toLowerCase()) || 
                                (u.username && u.username.toLowerCase() === uid.toLowerCase())
                              );
                              return (
                                <li key={uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                                  <span>{uObj ? uObj.name : uid}</span>
                                  <button
                                    className="btn btn-ghost"
                                    style={{ color: 'var(--danger-color)', padding: '2px 6px', fontSize: '0.72rem', minWidth: 'auto', background: 'transparent' }}
                                    title="Odstrani člana iz skupine"
                                    onClick={async () => {
                                      if (window.confirm(`Ali ste prepričani, da želite odstraniti člana ${uObj?.name || uid} iz skupine ${group.name}? (S tem boste izbrisali tudi njegove nedokončane naloge)`)) {
                                        try {
                                          await api.adminRemoveGroupMember(group.id, uid);
                                          await loadDashboardData(true);
                                        } catch (err) {
                                          alert('Napaka: ' + err.message);
                                        }
                                      }
                                    }}
                                  >
                                    X
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        {/* Repos */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '10px', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                            <strong style={{ color: 'var(--accent-color)' }}>Dodeljeni repozitoriji:</strong>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '2px 8px', fontSize: '0.72rem', minWidth: 'auto', background: 'rgba(99,102,241,0.12)', color: 'var(--accent-color)', fontWeight: 600 }}
                              onClick={() => {
                                setAddingRepoToGroup(group);
                                setNewRepoLink('');
                                if (questionnaires.length > 0) setSelectedRepoFormVer(questionnaires[questionnaires.length - 1].version);
                                if (rulesVersions.length > 0) setSelectedRepoRulesVer(rulesVersions[rulesVersions.length - 1].version);
                              }}
                            >
                              + Dodaj link
                            </button>
                          </div>
                          <ul style={{ paddingLeft: '16px', marginTop: '4px', marginBottom: 0, wordBreak: 'break-all' }}>
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
                                await loadDashboardData(true);
                              } catch (err) {
                                alert('Napaka: ' + err.message);
                              }
                            }}
                          >
                            + Dodaj
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

              {/* Form & Rules versions select */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Verzija Vprašalnika *</label>
                  <select 
                    className="form-control" 
                    value={selectedGroupFormVer} 
                    onChange={e => setSelectedGroupFormVer(e.target.value)}
                    style={{ background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', padding: '8px', borderRadius: '6px' }}
                  >
                    {questionnaires.map(q => (
                      <option key={q.version} value={q.version}>Verzija {q.version}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Verzija Pravil Zrelosti *</label>
                  <select 
                    className="form-control" 
                    value={selectedGroupRulesVer} 
                    onChange={e => setSelectedGroupRulesVer(e.target.value)}
                    style={{ background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', padding: '8px', borderRadius: '6px' }}
                  >
                    {rulesVersions.map(rv => (
                      <option key={rv.version} value={rv.version}>Verzija {rv.version}</option>
                    ))}
                  </select>
                </div>
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
                 Ustvari skupino & dodeli ocenjevanja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Repository to Group Modal Overlay */}
      {addingRepoToGroup && (
        <div className="modal-overlay" onClick={() => setAddingRepoToGroup(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              + Dodaj nov GitHub repozitorij
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Dodajanje novega ocenjevanja za skupino <strong style={{ color: 'var(--accent-color)' }}>{addingRepoToGroup.name}</strong>.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>GitHub povezava do repozitorija *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="https://github.com/owner/repo" 
                  value={newRepoLink} 
                  onChange={e => setNewRepoLink(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Verzija Vprašalnika *</label>
                  <select 
                    className="form-control" 
                    value={selectedRepoFormVer} 
                    onChange={e => setSelectedRepoFormVer(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
                  >
                    {questionnaires.map(q => (
                      <option key={q.version} value={q.version}>Verzija {q.version}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Verzija Pravil Zrelosti *</label>
                  <select 
                    className="form-control" 
                    value={selectedRepoRulesVer} 
                    onChange={e => setSelectedRepoRulesVer(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
                  >
                    {rulesVersions.map(rv => (
                      <option key={rv.version} value={rv.version}>Verzija {rv.version}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-ghost" onClick={() => setAddingRepoToGroup(null)}>Prekliči</button>
                <button className="btn btn-accent" onClick={handleSaveRepoToGroup}> Dodaj repozitorij</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
