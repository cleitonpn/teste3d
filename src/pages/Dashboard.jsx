import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { createProject, listMyProjects } from '../lib/projects';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState(null);
  const [nome, setNome] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [stage, setStage] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');

  const refresh = async () => {
    try { setProjects(await listMyProjects(user.uid)); }
    catch (e) { setErr('Não consegui listar projetos: ' + (e.code || e.message)); setProjects([]); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setErr('');
    if (!file) { setErr('Escolha um arquivo .glb.'); return; }
    if (!file.name.toLowerCase().endsWith('.glb')) { setErr('O arquivo precisa ser .glb.'); return; }
    try {
      // 1) otimiza no navegador (preservando as peças)
      setStage('Otimizando… preparando');
      const { optimizeGlb } = await import('../lib/optimize.js');
      const t0 = Date.now();
      const { file: optFile, before, after, failed, error } = await optimizeGlb(
        file, (s) => setStage('Otimizando… ' + s),
      );
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      if (failed) {
        setStage(`Otimização não aplicada (${error}). Enviando original…`);
      } else {
        const mb = (n) => (n / 1048576).toFixed(1);
        setStage(`Otimizado: ${mb(before)}MB → ${mb(after)}MB em ${secs}s. Enviando…`);
      }
      // 2) sobe o arquivo (otimizado, ou original se a otimização falhar)
      setProgress(0);
      await createProject({ nome: nome || file.name.replace(/\.glb$/i, ''), file: optFile, uid: user.uid, onProgress: setProgress });
      setNome(''); setFile(null); setProgress(null); setStage('');
      await refresh();
    } catch (e2) {
      setErr('Falha: ' + (e2.code || e2.message));
      setProgress(null); setStage('');
    }
  };

  const clientLink = (p) => `${location.origin}${location.pathname}#/p/${p.id}`;
  const copy = (p) => { navigator.clipboard?.writeText(clientLink(p)); setCopied(p.id); setTimeout(() => setCopied(''), 1500); };

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">Maquete <span className="b">Viva</span></div>
        <div className="row">
          <span className="pill">{user?.email}</span>
          <button className="btn" onClick={logout}>Sair</button>
        </div>
      </div>

      <div className="wrap">
        <div className="eyebrow">Projetista</div>
        <h1 className="title">Meus projetos</h1>

        <form className="card" style={{ marginTop: 18 }} onSubmit={onCreate}>
          <div className="field">
            <label>Nome do projeto</label>
            <input className="input" value={nome} placeholder="Ex.: Shell Aviation — LABACE"
              onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field">
            <label>Arquivo do estande (.glb)</label>
            <input className="input" type="file" accept=".glb,model/gltf-binary"
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          {stage ? (
            <>
              {progress !== null && <div className="progress"><i style={{ width: `${progress}%` }} /></div>}
              <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                {stage}{progress !== null ? ` ${progress}%` : ''}
              </div>
            </>
          ) : (
            <button className="btn pri" type="submit">Criar projeto e gerar link</button>
          )}
          {err && <div className="err">{err}</div>}
          <div className="muted" style={{ marginTop: 12, fontSize: 12.5 }}>
            O modelo é otimizado automaticamente no seu navegador (Meshopt + texturas), preservando cada
            peça. Arquivos grandes podem levar alguns segundos.
          </div>
        </form>

        {projects === null ? (
          <p className="muted" style={{ marginTop: 24 }}>Carregando…</p>
        ) : projects.length === 0 ? (
          <p className="muted" style={{ marginTop: 24 }}>Nenhum projeto ainda. Suba o primeiro acima.</p>
        ) : (
          <div className="list">
            {projects.map((p) => (
              <div className="proj" key={p.id}>
                <div style={{ minWidth: 0 }}>
                  <div className="n">{p.nome}</div>
                  <div className="meta">/p/{p.id}</div>
                </div>
                <div className="row">
                  <button className="btn" onClick={() => copy(p)}>{copied === p.id ? 'Copiado!' : 'Copiar link'}</button>
                  <a className="btn pri" href={`#/p/${p.id}`} target="_blank" rel="noreferrer">Abrir</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
