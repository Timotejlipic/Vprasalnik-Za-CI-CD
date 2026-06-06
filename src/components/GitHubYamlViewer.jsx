import React, { useState, useEffect } from 'react';
import { copyToClipboard } from '../utils.js';

function parseGitHubUrl(url) {
  try {
    const match = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/);
    if (match) return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  } catch {
    // ignore
  }
  return null;
}

export default function GitHubYamlViewer({ repoLink = '', onFilesLoaded }) {
  const [yamlFiles, setYamlFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadedFor, setLoadedFor] = useState('');

  // Auto-fetch when repoLink changes and is a valid GitHub URL
  useEffect(() => {
    if (repoLink && repoLink !== loadedFor && parseGitHubUrl(repoLink)) {
      fetchYamlFiles(repoLink);
    }
  }, [repoLink]);

  const fetchYamlFiles = async (url) => {
    const repo = parseGitHubUrl(url);
    if (!repo) {
      setError('Neveljaven GitHub URL. Format: https://github.com/owner/repo');
      if (onFilesLoaded) onFilesLoaded([]);
      return;
    }
    setLoading(true);
    setError('');
    setYamlFiles([]);
    setSelectedFile(null);
    setFileContent('');
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/HEAD?recursive=1`
      );
      if (res.status === 404) throw new Error('Repozitorij ni najden ali je zaseben.');
      if (res.status === 403) throw new Error('Presežena omejitev GitHub API. Poskusite pozneje.');
      if (!res.ok) throw new Error(`GitHub API napaka: ${res.status}`);
      const data = await res.json();
      if (data.truncated) {
        setError('Repozitorij je prevelik – prikazani so samo delni rezultati.');
      }
      const files = (data.tree || []).filter(
        f => f.type === 'blob' && (f.path.endsWith('.yml') || f.path.endsWith('.yaml'))
      );
      if (files.length === 0) {
        setError('V tem repozitoriju ni najdenih YAML datotek.');
      }
      setYamlFiles(files);
      if (onFilesLoaded) {
        onFilesLoaded(files);
      }
      setLoadedFor(url);
    } catch (e) {
      setError(e.message);
      if (onFilesLoaded) {
        onFilesLoaded([]);
      }
    }
    setLoading(false);
  };

  const fetchFileContent = async (file) => {
    const repo = parseGitHubUrl(repoLink);
    if (!repo) return;
    setSelectedFile(file);
    setFileContent('');
    setFileLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${file.path}`
      );
      if (!res.ok) throw new Error('Napaka pri pridobivanju vsebine datoteke.');
      const data = await res.json();
      const content = atob(data.content.replace(/\s/g, ''));
      setFileContent(content);
    } catch (e) {
      setFileContent(`# Napaka: ${e.message}`);
    }
    setFileLoading(false);
  };

  return (
    <div className="card yaml-viewer-panel" style={{ padding: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span></span> GitHub YAML Datoteke
          {loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>— nalagam…</span>}
          {!loading && yamlFiles.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
              — {yamlFiles.length} datotek
            </span>
          )}
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: '0.72rem', padding: '3px 8px' }}
          onClick={() => fetchYamlFiles(repoLink)}
          disabled={loading || !parseGitHubUrl(repoLink)}
          title="Znova naloži seznam"
        >
          ↺ Osveži
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: 'var(--warning-color)', fontSize: '0.8rem', background: 'rgba(210,153,34,0.1)', padding: '7px 10px', borderRadius: '5px', marginBottom: '8px' }}>
          ! {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '10px 0', textAlign: 'center' }}>
          Iščem YAML datoteke…
        </div>
      )}

      {/* File list */}
      {!loading && yamlFiles.length > 0 && (
        <>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
            YAML datoteke
          </div>
          <div className="yaml-file-list" style={{ borderBottom: fileContent ? '1px solid var(--panel-border)' : 'none', paddingBottom: fileContent ? '8px' : '0', marginBottom: fileContent ? '8px' : '0' }}>
            {yamlFiles.map(f => (
              <div
                key={f.path}
                className={`yaml-file-item ${selectedFile?.path === f.path ? 'active' : ''}`}
                onClick={() => fetchFileContent(f)}
              >
                 {f.path}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty placeholder */}
      {!loading && yamlFiles.length === 0 && !error && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center', padding: '12px 0', opacity: 0.6 }}>
          Nalagam YAML datoteke iz repozitorija…
        </div>
      )}

      {/* File content */}
      {fileLoading && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '10px 0' }}>
          Nalaganje vsebine…
        </div>
      )}
      {fileContent && !fileLoading && (
        <>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{selectedFile?.path}</span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.7rem', padding: '2px 7px' }}
              onClick={() => copyToClipboard(fileContent)}
              title="Kopiraj vsebino"
            >
              ⎘ Kopiraj
            </button>
          </div>
          <pre className="yaml-code-block">{fileContent}</pre>
        </>
      )}
      {!fileContent && !fileLoading && yamlFiles.length > 0 && selectedFile === null && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '8px', textAlign: 'center', opacity: 0.6 }}>
          Izberite datoteko za prikaz vsebine.
        </div>
      )}
    </div>
  );
}
